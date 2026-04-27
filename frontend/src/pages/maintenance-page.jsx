import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import {
  createMaintenance,
  deleteMaintenance,
  fetchAvailableYears,
  fetchDashboardSummary,
  fetchFilterOptions,
  fetchMaintenanceForExport,
  fetchMaintenanceList,
  upsertMaintenanceRows,
  updateMaintenance,
} from "@/lib/maintenance";
import { DEFAULT_FILTERS } from "@/lib/constants";
import { exportMaintenanceToExcel } from "@/lib/export";
import { parseMaintenanceWorkbook } from "@/lib/maintenance-import";
import { toast } from "@/hooks/use-toast";
import { MaintenanceFilters } from "@/components/maintenance/maintenance-filters";
import { MaintenanceTable } from "@/components/maintenance/maintenance-table";
import { MaintenanceFormDialog } from "@/components/maintenance/maintenance-form-dialog";
import { DeleteConfirmDialog } from "@/components/maintenance/delete-confirm-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { isIgnorableSupabaseAbortError } from "@/lib/utils";
import { MAINTENANCE_SCHEMA, supabase } from "@/lib/supabaseClient";

export function MaintenancePage({
  readOnly = false,
  showAssetSummary = false,
  externalFilterControls = false,
}) {
  const { isAuthenticated } = useAuth();
  const isPublicView = readOnly && showAssetSummary;
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [options, setOptions] = useState({ lokasi: [], jenisKegiatan: [] });
  const [yearOptions, setYearOptions] = useState([]);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortColumn, setSortColumn] = useState("tanggal_maintenance");
  const [sortDirection, setSortDirection] = useState("desc");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [realtimeTick, setRealtimeTick] = useState(0);
  const realtimeTimerRef = useRef(null);
  const deferredSearch = useDeferredValue(filters.search);

  const effectiveFilters = useMemo(
    () => ({
      ...filters,
      search: deferredSearch,
    }),
    [deferredSearch, filters],
  );

  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const filterOptions = await fetchFilterOptions();
        setOptions(filterOptions);
      } catch (error) {
        if (isIgnorableSupabaseAbortError(error)) {
          return;
        }

        toast({
          title: "Gagal memuat filter",
          description: error.message,
          variant: "destructive",
        });
      }
    }

    loadFilterOptions();
  }, [realtimeTick]);

  useEffect(() => {
    async function loadYears() {
      if (!filters.lokasi) {
        setYearOptions([]);
        return;
      }

      try {
        const years = await fetchAvailableYears(filters.lokasi);
        setYearOptions(years);
      } catch (error) {
        if (isIgnorableSupabaseAbortError(error)) {
          return;
        }

        toast({
          title: "Gagal memuat opsi tahun",
          description: error.message,
          variant: "destructive",
        });
      }
    }

    loadYears();
  }, [filters.lokasi, realtimeTick]);

  useEffect(() => {
    async function loadTable() {
      try {
        setLoading(true);
        const result = await fetchMaintenanceList({
          filters: effectiveFilters,
          page,
          pageSize,
          sortColumn,
          sortDirection,
        });
        setRows(result.data);
        setTotal(result.count);
      } catch (error) {
        if (isIgnorableSupabaseAbortError(error)) {
          return;
        }

        toast({
          title: "Gagal memuat data maintenance",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    loadTable();
  }, [effectiveFilters, page, pageSize, sortColumn, sortDirection, realtimeTick]);

  useEffect(() => {
    async function loadSummary() {
      if (!showAssetSummary) {
        return;
      }

      try {
        const result = await fetchDashboardSummary(effectiveFilters);
        setSummary(result);
      } catch (error) {
        if (isIgnorableSupabaseAbortError(error)) {
          return;
        }

        toast({
          title: "Gagal memuat ringkasan aset",
          description: error.message,
          variant: "destructive",
        });
      }
    }

    loadSummary();
  }, [effectiveFilters, showAssetSummary, realtimeTick]);

  useEffect(() => {
    const channel = supabase
      .channel(`maintenance-live-page-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: MAINTENANCE_SCHEMA,
          table: "maintenance",
        },
        () => {
          window.clearTimeout(realtimeTimerRef.current);
          realtimeTimerRef.current = window.setTimeout(() => {
            setRealtimeTick((current) => current + 1);
          }, 250);
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Maintenance realtime channel error");
        }
      });

    return () => {
      window.clearTimeout(realtimeTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, []);

  function handleFilterChange(field, value) {
    setPage(1);
    setFilters((current) => {
      const next = { ...current, [field]: value };

      if (field === "lokasi") {
        next.tahun = "";
      }

      if (field === "tahun") {
        if (!value) {
          next.tanggalMulai = "";
          next.tanggalSelesai = "";
        } else {
          next.tanggalMulai = `${value}-01-01`;
          next.tanggalSelesai = `${value}-12-31`;
        }
      }

      if (field === "tanggalMulai" || field === "tanggalSelesai") {
        next.tahun = "";
      }

      return next;
    });
  }

  function handleResetFilters() {
    setPage(1);
    setFilters(DEFAULT_FILTERS);
  }

  function handleSort(column) {
    if (sortColumn === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortColumn(column);
    setSortDirection("asc");
  }

  async function refreshTable() {
    const result = await fetchMaintenanceList({
      filters: effectiveFilters,
      page,
      pageSize,
      sortColumn,
      sortDirection,
    });
    setRows(result.data);
    setTotal(result.count);
  }

  async function handleSubmit(payload) {
    if (!isAuthenticated) {
      toast({
        title: "Login diperlukan",
        description: "Silakan login Supabase untuk menambah atau mengubah data.",
      });
      return;
    }

    try {
      setSubmitting(true);
      if (selectedRow?.id) {
        await updateMaintenance(selectedRow.id, payload);
        toast({
          title: "Data diperbarui",
          description: "Perubahan maintenance berhasil disimpan.",
        });
      } else {
        await createMaintenance(payload);
        toast({
          title: "Data ditambahkan",
          description: "Data maintenance baru berhasil dibuat.",
        });
      }

      setDialogOpen(false);
      setSelectedRow(null);
      await refreshTable();
    } catch (error) {
      toast({
        title: "Gagal menyimpan data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!selectedRow?.id) {
      return;
    }

    if (!isAuthenticated) {
      toast({
        title: "Login diperlukan",
        description: "Silakan login Supabase untuk menghapus data.",
      });
      return;
    }

    try {
      setDeleteLoading(true);
      await deleteMaintenance(selectedRow.id);
      toast({
        title: "Data dihapus",
        description: "Data maintenance telah dihapus dari sistem.",
      });
      setDeleteOpen(false);
      setSelectedRow(null);
      await refreshTable();
    } catch (error) {
      toast({
        title: "Gagal menghapus data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleExport() {
    try {
      const exportRows = await fetchMaintenanceForExport(effectiveFilters);
      exportMaintenanceToExcel(exportRows);
      toast({
        title: "Export selesai",
        description: `${exportRows.length} data berhasil diexport ke Excel.`,
      });
    } catch (error) {
      toast({
        title: "Gagal export data",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  async function handleImport(file) {
    if (!isAuthenticated) {
      toast({
        title: "Login diperlukan",
        description: "Silakan login Supabase untuk melakukan import data.",
      });
      return;
    }

    try {
      setImportLoading(true);
      const parsed = await parseMaintenanceWorkbook(file);

      if (!parsed.rows.length) {
        throw new Error("Tidak ada baris valid yang bisa diimport.");
      }

      await upsertMaintenanceRows(parsed.rows);

      const filterOptions = await fetchFilterOptions();
      setOptions(filterOptions);
      await refreshTable();

      toast({
        title: "Import selesai",
        description:
          parsed.errors.length > 0
            ? `${parsed.rows.length} baris berhasil diproses, ${parsed.errors.length} baris dilewati.`
            : `${parsed.rows.length} baris berhasil diinsert/update.`,
      });

      if (parsed.errors.length) {
        toast({
          title: "Sebagian baris dilewati",
          description: parsed.errors.slice(0, 3).join(" | "),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Import gagal",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImportLoading(false);
    }
  }

  return (
    <div className="space-y-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden lg:space-y-4">
      {isPublicView ? (
        <div className="grid shrink-0 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <Card className="border-border/70">
            <CardContent className="p-6">
              <h1 className="text-3xl font-extrabold tracking-tight">
                Data maintenance perangkat IT
              </h1>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardContent className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Total aset
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight">
                {summary?.total_aset ?? 0}
              </h2>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardContent className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Total maintenance
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight">
                {summary?.total_maintenance ?? 0}
              </h2>
            </CardContent>
          </Card>
        </div>
      ) : showAssetSummary ? (
        <Card className="shrink-0 border-border/70">
          <CardContent className="p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Total aset
              </p>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
                {summary?.total_aset ?? 0}
              </h1>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {externalFilterControls ? (
        <div className="shrink-0 rounded-3xl border border-border/70 bg-card/75 p-4 shadow-panel">
          <div className="flex items-center justify-end">
            <MaintenanceFilters
              filters={filters}
              onChange={handleFilterChange}
              onReset={handleResetFilters}
              lokasiOptions={options.lokasi}
              yearOptions={yearOptions}
              activityOptions={options.jenisKegiatan}
              showSearch
            />
          </div>
        </div>
      ) : null}

      {loading && !rows.length ? (
        <div className="lg:flex lg:min-h-0 lg:flex-1 lg:items-center lg:justify-center">
          <LoadingState label="Memuat tabel maintenance..." />
        </div>
      ) : (
        <MaintenanceTable
          data={rows}
          total={total}
          page={page}
          pageSize={pageSize}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          onPageChange={setPage}
          onPageSizeChange={(value) => {
            setPageSize(value);
            setPage(1);
          }}
          onCreate={() => {
            if (!isAuthenticated) {
              toast({
                title: "Login diperlukan",
                description: "Silakan login Supabase untuk menambah data maintenance.",
              });
              return;
            }
            setSelectedRow(null);
            setDialogOpen(true);
          }}
          onEdit={(row) => {
            if (!isAuthenticated) {
              toast({
                title: "Login diperlukan",
                description: "Silakan login Supabase untuk mengubah data maintenance.",
              });
              return;
            }
            setSelectedRow(row);
            setDialogOpen(true);
          }}
          onDelete={(row) => {
            if (!isAuthenticated) {
              toast({
                title: "Login diperlukan",
                description: "Silakan login Supabase untuk menghapus data maintenance.",
              });
              return;
            }
            setSelectedRow(row);
            setDeleteOpen(true);
          }}
          onExport={handleExport}
          onImport={handleImport}
          canManage={!readOnly && isAuthenticated}
          onRequestLogin={() =>
            toast({
              title: "Login diperlukan",
              description: "Silakan login Supabase untuk membuka akses CRUD.",
            })
          }
          importLoading={importLoading}
          showManageActions={!readOnly}
          showExport
          showImport={!readOnly}
          filterControls={externalFilterControls ? null : (
            <MaintenanceFilters
              filters={filters}
              onChange={handleFilterChange}
              onReset={handleResetFilters}
              lokasiOptions={options.lokasi}
              yearOptions={yearOptions}
              activityOptions={options.jenisKegiatan}
              showSearch
            />
          )}
        />
      )}

      {!readOnly ? (
        <MaintenanceFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          initialValues={selectedRow}
          lokasiOptions={options.lokasi}
          onSubmit={handleSubmit}
          loading={submitting}
        />
      ) : null}

      {!readOnly ? (
        <DeleteConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          item={selectedRow}
          loading={deleteLoading}
          onConfirm={handleDelete}
        />
      ) : null}
    </div>
  );
}
