import { addMonths, format } from "date-fns";
import { MAINTENANCE_SCHEMA, supabase } from "@/lib/supabaseClient";

const assetsDb = supabase.schema(MAINTENANCE_SCHEMA);

function normalizeAssetCode(value) {
  return (value || "").trim().toUpperCase();
}

function toDateString(value) {
  if (!value) {
    return null;
  }

  return format(new Date(value), "yyyy-MM-dd");
}

function getPriorityLabel(nextMaintenanceDate) {
  if (!nextMaintenanceDate) {
    return "belum-ada-histori";
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const warningThreshold = format(addMonths(new Date(), 3), "yyyy-MM-dd");

  if (nextMaintenanceDate <= today) {
    return "lewat";
  }

  if (nextMaintenanceDate <= warningThreshold) {
    return "mendekati";
  }

  return "normal";
}

function getPriorityRank(priorityLabel) {
  if (priorityLabel === "lewat") {
    return 0;
  }

  if (priorityLabel === "mendekati") {
    return 1;
  }

  if (priorityLabel === "belum-ada-histori") {
    return 2;
  }

  return 3;
}

function applyAssetFilters(query, filters) {
  let nextQuery = query;

  if (filters.lokasi) {
    nextQuery = nextQuery.eq("lokasi", filters.lokasi);
  }

  if (filters.status) {
    nextQuery = nextQuery.eq("status", filters.status);
  }

  if (filters.maintenanceIntervalMonths) {
    nextQuery = nextQuery.eq(
      "maintenance_interval_months",
      Number(filters.maintenanceIntervalMonths),
    );
  }

  if (filters.search) {
    const escaped = filters.search.replaceAll(",", " ");
    nextQuery = nextQuery.or(
      `kode_aset.ilike.%${escaped}%,nama_perangkat.ilike.%${escaped}%,tipe.ilike.%${escaped}%`,
    );
  }

  return nextQuery;
}

function buildMaintenanceLookup(records) {
  return (records || []).reduce((lookup, item) => {
    const normalizedCode = normalizeAssetCode(item.kode_aset);
    const normalizedDate = toDateString(item.tanggal_maintenance);

    if (!normalizedCode || !normalizedDate) {
      return lookup;
    }

    const current = lookup.get(normalizedCode);
    if (!current || normalizedDate > current) {
      lookup.set(normalizedCode, normalizedDate);
    }

    return lookup;
  }, new Map());
}

async function fetchLatestMaintenanceLookup(filters = {}) {
  let query = assetsDb
    .from("maintenance")
    .select("kode_aset,tanggal_maintenance")
    .order("tanggal_maintenance", { ascending: false });

  if (filters.lokasi) {
    query = query.eq("lokasi", filters.lokasi);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return buildMaintenanceLookup(data);
}

function enrichAssets(assetRows, maintenanceLookup) {
  return assetRows.map((asset) => {
    const normalizedCode = normalizeAssetCode(asset.kode_aset);
    const lastMaintenanceDate = maintenanceLookup.get(normalizedCode) || null;
    const nextMaintenanceDate = lastMaintenanceDate
      ? toDateString(
          addMonths(
            new Date(lastMaintenanceDate),
            Number(asset.maintenance_interval_months || 12),
          ),
        )
      : null;
    const priorityLabel = getPriorityLabel(nextMaintenanceDate);

    return {
      ...asset,
      kode_aset: normalizeAssetCode(asset.kode_aset),
      last_maintenance_date: lastMaintenanceDate,
      next_maintenance_date: nextMaintenanceDate,
      priority_label: priorityLabel,
      priority_rank: getPriorityRank(priorityLabel),
    };
  });
}

function sortAssets(assetRows) {
  return [...assetRows].sort((left, right) => {
    if (left.priority_rank !== right.priority_rank) {
      return left.priority_rank - right.priority_rank;
    }

    const leftDate = left.next_maintenance_date || "9999-12-31";
    const rightDate = right.next_maintenance_date || "9999-12-31";

    if (leftDate !== rightDate) {
      return leftDate.localeCompare(rightDate);
    }

    return (left.kode_aset || "").localeCompare(right.kode_aset || "");
  });
}

async function fetchEnrichedAssets(filters = {}) {
  let query = assetsDb
    .from("assets")
    .select("*")
    .order("kode_aset", { ascending: true });

  query = applyAssetFilters(query, filters);

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const maintenanceLookup = await fetchLatestMaintenanceLookup(filters);
  let enrichedAssets = enrichAssets(data || [], maintenanceLookup);

  if (filters.priority) {
    enrichedAssets = enrichedAssets.filter(
      (asset) => asset.priority_label === filters.priority,
    );
  }

  return sortAssets(enrichedAssets);
}

function normalizeAssetPayload(payload) {
  return {
    ...payload,
    kode_aset: normalizeAssetCode(payload.kode_aset),
    nama_perangkat: payload.nama_perangkat?.trim() || "",
    tipe: payload.tipe?.trim() || null,
    lokasi: payload.lokasi?.trim() || null,
    maintenance_interval_months: Number(payload.maintenance_interval_months || 12),
  };
}

export async function fetchAssetList({
  filters = {},
  page = 1,
  pageSize = 10,
}) {
  const enrichedAssets = await fetchEnrichedAssets(filters);
  const from = (page - 1) * pageSize;
  const to = from + pageSize;

  return {
    data: enrichedAssets.slice(from, to),
    count: enrichedAssets.length,
  };
}

export async function fetchAssetOptions() {
  const { data, error } = await assetsDb
    .from("assets")
    .select("lokasi,status,maintenance_interval_months")
    .limit(1000);

  if (error) {
    throw error;
  }

  return {
    lokasi: [...new Set((data || []).map((item) => item.lokasi).filter(Boolean))].sort(),
    status: [...new Set((data || []).map((item) => item.status).filter(Boolean))].sort(),
    intervals: [...new Set((data || [])
      .map((item) => Number(item.maintenance_interval_months))
      .filter(Boolean))]
      .sort((left, right) => left - right),
  };
}

export async function fetchAssetSummary(filters = {}) {
  const enrichedAssets = await fetchEnrichedAssets(filters);

  return {
    total_assets: enrichedAssets.length,
    active_assets: enrichedAssets.filter((asset) => asset.status === "aktif").length,
    due_assets: enrichedAssets.filter((asset) =>
      ["lewat", "mendekati", "belum-ada-histori"].includes(asset.priority_label),
    ).length,
    overdue_assets: enrichedAssets.filter((asset) => asset.priority_label === "lewat").length,
    upcoming_assets: enrichedAssets.filter((asset) => asset.priority_label === "mendekati").length,
    missing_history_assets: enrichedAssets.filter(
      (asset) => asset.priority_label === "belum-ada-histori",
    ).length,
  };
}

export async function createAsset(payload) {
  const normalizedPayload = normalizeAssetPayload(payload);
  const { error } = await assetsDb.from("assets").insert(normalizedPayload);

  if (error) {
    throw error;
  }
}

export async function updateAsset(id, payload) {
  const normalizedPayload = normalizeAssetPayload(payload);
  const { error } = await assetsDb.from("assets").update(normalizedPayload).eq("id", id);

  if (error) {
    throw error;
  }
}

export async function deleteAsset(id) {
  const { error } = await assetsDb.from("assets").delete().eq("id", id);

  if (error) {
    throw error;
  }
}
