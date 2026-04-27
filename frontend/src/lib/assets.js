import { MAINTENANCE_SCHEMA, supabase } from "@/lib/supabaseClient";
import { addMonths, format } from "date-fns";

const assetsDb = supabase.schema(MAINTENANCE_SCHEMA);

function toDateString(value) {
  if (!value) {
    return null;
  }

  return format(addMonths(new Date(value), 0), "yyyy-MM-dd");
}

function buildMaintenanceLookup(records) {
  return (records || []).reduce((lookup, item) => {
    if (!lookup.has(item.kode_aset)) {
      lookup.set(item.kode_aset, item.tanggal_maintenance);
    }

    return lookup;
  }, new Map());
}

function applyAssetFilters(query, filters) {
  let nextQuery = query;

  if (filters.lokasi) {
    nextQuery = nextQuery.eq("lokasi", filters.lokasi);
  }

  if (filters.status) {
    nextQuery = nextQuery.eq("status", filters.status);
  }

  if (filters.search) {
    const escaped = filters.search.replaceAll(",", " ");
    nextQuery = nextQuery.or(
      `kode_aset.ilike.%${escaped}%,nama_perangkat.ilike.%${escaped}%,tipe.ilike.%${escaped}%`,
    );
  }

  return nextQuery;
}

function applyScheduleFilters(query, filters) {
  let nextQuery = query;

  if (filters.assetId) {
    nextQuery = nextQuery.eq("asset_id", filters.assetId);
  }

  if (filters.status) {
    nextQuery = nextQuery.eq("status", filters.status);
  }

  return nextQuery;
}

export async function fetchAssetList({
  filters = {},
  page = 1,
  pageSize = 10,
}) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = assetsDb
    .from("assets")
    .select("*", { count: "exact" })
    .order("kode_aset", { ascending: true })
    .range(from, to);

  query = applyAssetFilters(query, filters);

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  const assetRows = data || [];
  const assetCodes = assetRows.map((item) => item.kode_aset).filter(Boolean);

  if (!assetCodes.length) {
    return {
      data: assetRows,
      count: count || 0,
    };
  }

  const { data: maintenanceRows, error: maintenanceError } = await assetsDb
    .from("maintenance")
    .select("kode_aset,tanggal_maintenance")
    .in("kode_aset", assetCodes)
    .order("tanggal_maintenance", { ascending: false });

  if (maintenanceError) {
    throw maintenanceError;
  }

  const maintenanceLookup = buildMaintenanceLookup(maintenanceRows);
  const enrichedData = assetRows.map((asset) => {
    const lastMaintenanceDate = maintenanceLookup.get(asset.kode_aset) || null;
    const intervalMonths = Number(asset.maintenance_interval_months || 12);

    return {
      ...asset,
      last_maintenance_date: lastMaintenanceDate,
      next_maintenance_date: lastMaintenanceDate
        ? toDateString(addMonths(new Date(lastMaintenanceDate), intervalMonths))
        : null,
    };
  });

  return {
    data: enrichedData,
    count: count || 0,
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

  const lokasi = [...new Set((data || []).map((item) => item.lokasi).filter(Boolean))].sort();
  const status = [...new Set((data || []).map((item) => item.status).filter(Boolean))].sort();
  const intervals = [...new Set((data || [])
    .map((item) => item.maintenance_interval_months)
    .filter(Boolean))]
    .sort((a, b) => a - b);

  return { lokasi, status, intervals };
}

export async function fetchAssetCatalog() {
  const { data, error } = await assetsDb
    .from("assets")
    .select("id,kode_aset,nama_perangkat,lokasi,tipe,status,maintenance_interval_months")
    .order("kode_aset", { ascending: true })
    .limit(1000);

  if (error) {
    throw error;
  }

  return data || [];
}

export async function fetchAssetSummary(filters = {}) {
  let assetQuery = assetsDb
    .from("assets")
    .select("id", { count: "exact", head: true });

  assetQuery = applyAssetFilters(assetQuery, filters);

  const { count: totalAssets, error: assetError } = await assetQuery;

  if (assetError) {
    throw assetError;
  }

  let activeQuery = assetsDb
    .from("assets")
    .select("id", { count: "exact", head: true })
    .eq("status", "aktif");

  if (filters.lokasi) {
    activeQuery = activeQuery.eq("lokasi", filters.lokasi);
  }

  const { count: activeAssets, error: activeError } = await activeQuery;

  if (activeError) {
    throw activeError;
  }

  const today = new Date().toISOString().slice(0, 10);
  const {
    count: plannedSchedules,
    error: scheduleError,
  } = await assetsDb
    .from("maintenance_schedule")
    .select("id", { count: "exact", head: true })
    .eq("status", "terjadwal")
    .gte("tanggal_jadwal", today);

  if (scheduleError) {
    throw scheduleError;
  }

  return {
    total_assets: totalAssets || 0,
    active_assets: activeAssets || 0,
    planned_schedules: plannedSchedules || 0,
  };
}

export async function createAsset(payload) {
  const { error } = await assetsDb.from("assets").insert(payload);

  if (error) {
    throw error;
  }
}

export async function updateAsset(id, payload) {
  const { error } = await assetsDb.from("assets").update(payload).eq("id", id);

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

export async function fetchScheduleList({
  filters = {},
  page = 1,
  pageSize = 10,
}) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = assetsDb
    .from("maintenance_schedule")
    .select(
      "*, asset:asset_id(id,kode_aset,nama_perangkat,lokasi,tipe,status)",
      { count: "exact" },
    )
    .order("tanggal_jadwal", { ascending: true })
    .range(from, to);

  query = applyScheduleFilters(query, filters);

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return {
    data: data || [],
    count: count || 0,
  };
}

export async function createSchedule(payload) {
  const { error } = await assetsDb.from("maintenance_schedule").insert(payload);

  if (error) {
    throw error;
  }
}

export async function updateSchedule(id, payload) {
  const { error } = await assetsDb
    .from("maintenance_schedule")
    .update(payload)
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function deleteSchedule(id) {
  const { error } = await assetsDb.from("maintenance_schedule").delete().eq("id", id);

  if (error) {
    throw error;
  }
}
