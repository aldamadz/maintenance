import { MAINTENANCE_SCHEMA, supabase } from "@/lib/supabaseClient";

const maintenanceDb = supabase.schema(MAINTENANCE_SCHEMA);

function normalizeAssetCode(value) {
  return (value || "").trim().toUpperCase();
}

function pickPreferredText(nextValue, fallbackValue) {
  if (typeof nextValue === "string" && nextValue.trim()) {
    return nextValue.trim();
  }

  if (typeof fallbackValue === "string" && fallbackValue.trim()) {
    return fallbackValue.trim();
  }

  return null;
}

function buildAssetPayload(record) {
  if (!record?.kode_aset || !record?.nama_perangkat) {
    return null;
  }

  return {
    kode_aset: normalizeAssetCode(record.kode_aset),
    nama_perangkat: record.nama_perangkat.trim(),
    tipe: record.tipe?.trim() || null,
    lokasi: record.lokasi?.trim() || null,
  };
}

function normalizeMaintenancePayload(payload) {
  return {
    ...payload,
    kode_aset: normalizeAssetCode(payload.kode_aset),
    nama_perangkat: payload.nama_perangkat?.trim() || "",
    tipe: payload.tipe?.trim() || null,
    lokasi: payload.lokasi?.trim() || null,
    jenis_kegiatan: payload.jenis_kegiatan || null,
    durasi: payload.durasi ?? null,
    catatan: payload.catatan?.trim() || null,
  };
}

function normalizeMaintenanceRows(rows) {
  return rows.map((row) => normalizeMaintenancePayload(row));
}

async function fetchExistingAssetsByCodes(assetCodes) {
  if (!assetCodes.length) {
    return [];
  }

  const { data, error } = await maintenanceDb
    .from("assets")
    .select("kode_aset,nama_perangkat,tipe,lokasi,status,maintenance_interval_months")
    .in("kode_aset", assetCodes);

  if (error) {
    throw error;
  }

  return data || [];
}

async function syncAssetCatalog(records) {
  const payload = records
    .map(buildAssetPayload)
    .filter(Boolean)
    .reduce((collection, item) => {
      const current = collection.get(item.kode_aset);

      collection.set(item.kode_aset, {
        kode_aset: item.kode_aset,
        nama_perangkat: pickPreferredText(item.nama_perangkat, current?.nama_perangkat),
        tipe: pickPreferredText(item.tipe, current?.tipe),
        lokasi: pickPreferredText(item.lokasi, current?.lokasi),
      });

      return collection;
    }, new Map());

  if (!payload.size) {
    return;
  }

  const existingAssets = await fetchExistingAssetsByCodes([...payload.keys()]);
  const existingLookup = existingAssets.reduce((lookup, item) => {
    lookup.set(item.kode_aset, item);
    return lookup;
  }, new Map());

  const mergedPayload = [...payload.values()].map((item) => {
    const existing = existingLookup.get(item.kode_aset);

    return {
      kode_aset: item.kode_aset,
      nama_perangkat: pickPreferredText(item.nama_perangkat, existing?.nama_perangkat),
      tipe: pickPreferredText(item.tipe, existing?.tipe),
      lokasi: pickPreferredText(item.lokasi, existing?.lokasi),
      status: existing?.status || "aktif",
      maintenance_interval_months: Number(existing?.maintenance_interval_months || 12),
    };
  });

  const { error } = await maintenanceDb
    .from("assets")
    .upsert(mergedPayload, { onConflict: "kode_aset" });

  if (error) {
    throw error;
  }
}

function applyMaintenanceFilters(query, filters) {
  let nextQuery = query;

  if (filters.lokasi) {
    nextQuery = nextQuery.eq("lokasi", filters.lokasi);
  }

  if (filters.jenisKegiatan) {
    nextQuery = nextQuery.eq("jenis_kegiatan", filters.jenisKegiatan);
  }

  if (filters.tanggalMulai) {
    nextQuery = nextQuery.gte("tanggal_maintenance", filters.tanggalMulai);
  }

  if (filters.tanggalSelesai) {
    nextQuery = nextQuery.lte("tanggal_maintenance", filters.tanggalSelesai);
  }

  if (filters.search) {
    const escaped = filters.search.replaceAll(",", " ");
    nextQuery = nextQuery.or(
      `kode_aset.ilike.%${escaped}%,nama_perangkat.ilike.%${escaped}%`,
    );
  }

  return nextQuery;
}

export async function fetchFilterOptions() {
  const { data, error } = await maintenanceDb.rpc("get_maintenance_filter_options");

  if (error) {
    throw error;
  }

  return {
    lokasi: data?.lokasi || [],
    jenisKegiatan: data?.jenis_kegiatan || [],
  };
}

export async function fetchAvailableYears(lokasi) {
  if (!lokasi) {
    return [];
  }

  const { data, error } = await maintenanceDb.rpc(
    "get_available_maintenance_years",
    {
      p_lokasi: lokasi,
    },
  );

  if (error) {
    throw error;
  }

  return data?.map((item) => item.tahun) || [];
}

export async function fetchDashboardSummary(filters) {
  const { data, error } = await maintenanceDb.rpc("get_maintenance_dashboard", {
    p_lokasi: filters.lokasi || null,
    p_date_from: filters.tanggalMulai || null,
    p_date_to: filters.tanggalSelesai || null,
    p_jenis_kegiatan: filters.jenisKegiatan || null,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function fetchMaintenanceList({
  filters,
  page,
  pageSize,
  sortColumn,
  sortDirection,
}) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = maintenanceDb
    .from("maintenance")
    .select("*", { count: "exact" })
    .order(sortColumn, { ascending: sortDirection === "asc" })
    .range(from, to);

  query = applyMaintenanceFilters(query, filters);

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return {
    data: data || [],
    count: count || 0,
  };
}

export async function fetchMaintenanceForExport(filters) {
  let query = maintenanceDb
    .from("maintenance")
    .select("*")
    .order("tanggal_maintenance", { ascending: false })
    .limit(1000);

  query = applyMaintenanceFilters(query, filters);

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

export async function createMaintenance(payload) {
  const normalizedPayload = normalizeMaintenancePayload(payload);
  await syncAssetCatalog([normalizedPayload]);
  const { error } = await maintenanceDb.from("maintenance").insert(normalizedPayload);
  if (error) {
    throw error;
  }
}

export async function upsertMaintenanceRows(rows) {
  const normalizedRows = normalizeMaintenanceRows(rows);
  await syncAssetCatalog(normalizedRows);
  const { error } = await maintenanceDb.from("maintenance").upsert(normalizedRows, {
    onConflict: "tanggal_maintenance,kode_aset",
  });

  if (error) {
    throw error;
  }
}

export async function updateMaintenance(id, payload) {
  const normalizedPayload = normalizeMaintenancePayload(payload);
  await syncAssetCatalog([normalizedPayload]);
  const { error } = await maintenanceDb
    .from("maintenance")
    .update(normalizedPayload)
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function deleteMaintenance(id) {
  const { error } = await maintenanceDb.from("maintenance").delete().eq("id", id);
  if (error) {
    throw error;
  }
}
