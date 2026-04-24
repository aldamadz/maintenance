import { MAINTENANCE_SCHEMA, supabase } from "@/lib/supabaseClient";

const maintenanceDb = supabase.schema(MAINTENANCE_SCHEMA);

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
  const { error } = await maintenanceDb.from("maintenance").insert(payload);
  if (error) {
    throw error;
  }
}

export async function upsertMaintenanceRows(rows) {
  const { error } = await maintenanceDb.from("maintenance").upsert(rows, {
    onConflict: "tanggal_maintenance,kode_aset",
  });

  if (error) {
    throw error;
  }
}

export async function updateMaintenance(id, payload) {
  const { error } = await maintenanceDb
    .from("maintenance")
    .update(payload)
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
