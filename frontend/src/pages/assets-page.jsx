import { useEffect, useMemo, useRef, useState } from "react";
import { Boxes, CalendarClock, ShieldCheck } from "lucide-react";
import { AssetFormDialog } from "@/components/assets/asset-form-dialog";
import { AssetTable } from "@/components/assets/asset-table";
import { ScheduleFormDialog } from "@/components/assets/schedule-form-dialog";
import { ScheduleTable } from "@/components/assets/schedule-table";
import { DeleteConfirmDialog } from "@/components/maintenance/delete-confirm-dialog";
import { StatsCard } from "@/components/maintenance/stats-card";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { Select } from "@/components/ui/select";
import {
  DEFAULT_ASSET_FILTERS,
  DEFAULT_SCHEDULE_FILTERS,
  SCHEDULE_STATUS_OPTIONS,
} from "@/lib/constants";
import {
  createAsset,
  createSchedule,
  deleteAsset,
  deleteSchedule,
  fetchAssetCatalog,
  fetchAssetList,
  fetchAssetOptions,
  fetchAssetSummary,
  fetchScheduleList,
  updateAsset,
  updateSchedule,
} from "@/lib/assets";
import { isIgnorableSupabaseAbortError } from "@/lib/utils";
import { MAINTENANCE_SCHEMA, supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

export function AssetsPage() {
  const [assetFilters, setAssetFilters] = useState(DEFAULT_ASSET_FILTERS);
  const [scheduleFilters, setScheduleFilters] = useState(DEFAULT_SCHEDULE_FILTERS);
  const [assetOptions, setAssetOptions] = useState({ lokasi: [], status: [] });
  const [assetCatalog, setAssetCatalog] = useState([]);
  const [assetRows, setAssetRows] = useState([]);
  const [assetTotal, setAssetTotal] = useState(0);
  const [assetPage, setAssetPage] = useState(1);
  const [assetPageSize, setAssetPageSize] = useState(10);
  const [scheduleRows, setScheduleRows] = useState([]);
  const [scheduleTotal, setScheduleTotal] = useState(0);
  const [schedulePage, setSchedulePage] = useState(1);
  const [schedulePageSize, setSchedulePageSize] = useState(10);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [assetSubmitting, setAssetSubmitting] = useState(false);
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [deleteState, setDeleteState] = useState({ open: false, type: "", item: null });
  const [realtimeTick, setRealtimeTick] = useState(0);
  const realtimeTimerRef = useRef(null);

  const assetFilterControls = useMemo(
    () => (
      <div className="flex flex-wrap gap-3">
        <Input
          className="w-full min-w-56 sm:w-56"
          placeholder="Cari aset"
          value={assetFilters.search}
          onChange={(event) => {
            setAssetPage(1);
            setAssetFilters((current) => ({
              ...current,
              search: event.target.value,
            }));
          }}
        />
        <Select
          className="w-full min-w-44 sm:w-44"
          value={assetFilters.lokasi}
          onChange={(event) => {
            setAssetPage(1);
            setAssetFilters((current) => ({
              ...current,
              lokasi: event.target.value,
            }));
          }}
        >
          <option value="">Semua lokasi</option>
          {assetOptions.lokasi.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <Select
          className="w-full min-w-40 sm:w-40"
          value={assetFilters.status}
          onChange={(event) => {
            setAssetPage(1);
            setAssetFilters((current) => ({
              ...current,
              status: event.target.value,
            }));
          }}
        >
          <option value="">Semua status</option>
          {assetOptions.status.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
      </div>
    ),
    [assetFilters, assetOptions],
  );

  const scheduleFilterControls = useMemo(
    () => (
      <div className="flex flex-wrap gap-3">
        <Select
          className="w-full min-w-64 sm:w-64"
          value={scheduleFilters.assetId}
          onChange={(event) => {
            setSchedulePage(1);
            setScheduleFilters((current) => ({
              ...current,
              assetId: event.target.value,
            }));
          }}
        >
          <option value="">Semua aset</option>
          {assetCatalog.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.kode_aset} - {asset.nama_perangkat}
            </option>
          ))}
        </Select>
        <Select
          className="w-full min-w-40 sm:w-40"
          value={scheduleFilters.status}
          onChange={(event) => {
            setSchedulePage(1);
            setScheduleFilters((current) => ({
              ...current,
              status: event.target.value,
            }));
          }}
        >
          <option value="">Semua status</option>
          {SCHEDULE_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
      </div>
    ),
    [assetCatalog, scheduleFilters],
  );

  useEffect(() => {
    async function bootstrap() {
      try {
        const [options, catalog, assetSummary] = await Promise.all([
          fetchAssetOptions(),
          fetchAssetCatalog(),
          fetchAssetSummary(),
        ]);
        setAssetOptions(options);
        setAssetCatalog(catalog);
        setSummary(assetSummary);
      } catch (error) {
        if (isIgnorableSupabaseAbortError(error)) {
          return;
        }

        toast({
          title: "Gagal memuat aset",
          description: error.message,
          variant: "destructive",
        });
      }
    }

    bootstrap();
  }, [realtimeTick]);

  useEffect(() => {
    async function loadAssets() {
      try {
        setLoading(true);
        const result = await fetchAssetList({
          filters: assetFilters,
          page: assetPage,
          pageSize: assetPageSize,
        });
        setAssetRows(result.data);
        setAssetTotal(result.count);
      } catch (error) {
        if (isIgnorableSupabaseAbortError(error)) {
          return;
        }

        toast({
          title: "Gagal memuat daftar aset",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    loadAssets();
  }, [assetFilters, assetPage, assetPageSize, realtimeTick]);

  useEffect(() => {
    async function loadSchedules() {
      try {
        const result = await fetchScheduleList({
          filters: scheduleFilters,
          page: schedulePage,
          pageSize: schedulePageSize,
        });
        setScheduleRows(result.data);
        setScheduleTotal(result.count);
      } catch (error) {
        if (isIgnorableSupabaseAbortError(error)) {
          return;
        }

        toast({
          title: "Gagal memuat jadwal maintenance",
          description: error.message,
          variant: "destructive",
        });
      }
    }

    loadSchedules();
  }, [scheduleFilters, schedulePage, schedulePageSize, realtimeTick]);

  useEffect(() => {
    const channel = supabase
      .channel(`assets-admin-live-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: MAINTENANCE_SCHEMA, table: "assets" },
        () => {
          window.clearTimeout(realtimeTimerRef.current);
          realtimeTimerRef.current = window.setTimeout(() => {
            setRealtimeTick((current) => current + 1);
          }, 250);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: MAINTENANCE_SCHEMA, table: "maintenance_schedule" },
        () => {
          window.clearTimeout(realtimeTimerRef.current);
          realtimeTimerRef.current = window.setTimeout(() => {
            setRealtimeTick((current) => current + 1);
          }, 250);
        },
      )
      .subscribe();

    return () => {
      window.clearTimeout(realtimeTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleAssetSubmit(payload) {
    try {
      setAssetSubmitting(true);
      if (selectedAsset?.id) {
        await updateAsset(selectedAsset.id, payload);
        toast({
          title: "Aset diperbarui",
          description: "Perubahan aset berhasil disimpan.",
        });
      } else {
        await createAsset(payload);
        toast({
          title: "Aset ditambahkan",
          description: "Aset baru berhasil masuk ke master data.",
        });
      }

      setAssetDialogOpen(false);
      setSelectedAsset(null);
      setRealtimeTick((current) => current + 1);
    } catch (error) {
      toast({
        title: "Gagal menyimpan aset",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAssetSubmitting(false);
    }
  }

  async function handleScheduleSubmit(payload) {
    try {
      setScheduleSubmitting(true);
      if (selectedSchedule?.id) {
        await updateSchedule(selectedSchedule.id, payload);
        toast({
          title: "Jadwal diperbarui",
          description: "Perubahan jadwal maintenance berhasil disimpan.",
        });
      } else {
        await createSchedule(payload);
        toast({
          title: "Jadwal dibuat",
          description: "Jadwal maintenance baru berhasil dibuat.",
        });
      }

      setScheduleDialogOpen(false);
      setSelectedSchedule(null);
      setRealtimeTick((current) => current + 1);
    } catch (error) {
      toast({
        title: "Gagal menyimpan jadwal",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setScheduleSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteState.item?.id) {
      return;
    }

    try {
      if (deleteState.type === "asset") {
        await deleteAsset(deleteState.item.id);
        toast({
          title: "Aset dihapus",
          description: "Master aset berhasil dihapus dari sistem.",
        });
      } else {
        await deleteSchedule(deleteState.item.id);
        toast({
          title: "Jadwal dihapus",
          description: "Jadwal maintenance berhasil dihapus.",
        });
      }

      setDeleteState({ open: false, type: "", item: null });
      setRealtimeTick((current) => current + 1);
    } catch (error) {
      toast({
        title: "Gagal menghapus data",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  async function handleMarkDone(schedule) {
    try {
      await updateSchedule(schedule.id, { status: "selesai" });
      toast({
        title: "Jadwal diselesaikan",
        description: "Status jadwal maintenance telah diperbarui.",
      });
      setRealtimeTick((current) => current + 1);
    } catch (error) {
      toast({
        title: "Gagal memperbarui jadwal",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <StatsCard
          label="Total aset"
          value={summary?.total_assets || 0}
          icon={Boxes}
          tone="secondary"
        />
        <StatsCard
          label="Aset aktif"
          value={summary?.active_assets || 0}
          icon={ShieldCheck}
        />
        <StatsCard
          label="Jadwal aktif"
          value={summary?.planned_schedules || 0}
          icon={CalendarClock}
          tone="accent"
        />
      </div>

      {loading && !assetRows.length ? (
        <LoadingState label="Memuat master aset..." />
      ) : (
        <AssetTable
          title="Master Aset"
          data={assetRows}
          total={assetTotal}
          page={assetPage}
          pageSize={assetPageSize}
          onPageChange={setAssetPage}
          onPageSizeChange={(value) => {
            setAssetPageSize(value);
            setAssetPage(1);
          }}
          filterControls={assetFilterControls}
          canManage
          showCreate
          showActions
          onCreate={() => {
            setSelectedAsset(null);
            setAssetDialogOpen(true);
          }}
          onEdit={(asset) => {
            setSelectedAsset(asset);
            setAssetDialogOpen(true);
          }}
          onDelete={(asset) =>
            setDeleteState({
              open: true,
              type: "asset",
              item: asset,
            })}
          onSchedule={(asset) => {
            setSelectedSchedule({
              asset_id: asset.id,
              status: "terjadwal",
            });
            setScheduleDialogOpen(true);
          }}
        />
      )}

      <ScheduleTable
        data={scheduleRows}
        total={scheduleTotal}
        page={schedulePage}
        pageSize={schedulePageSize}
        onPageChange={setSchedulePage}
        onPageSizeChange={(value) => {
          setSchedulePageSize(value);
          setSchedulePage(1);
        }}
        filterControls={scheduleFilterControls}
        canManage
        onCreate={() => {
          setSelectedSchedule(null);
          setScheduleDialogOpen(true);
        }}
        onEdit={(schedule) => {
          setSelectedSchedule(schedule);
          setScheduleDialogOpen(true);
        }}
        onDelete={(schedule) =>
          setDeleteState({
            open: true,
            type: "schedule",
            item: {
              ...schedule,
              nama_perangkat: schedule.asset?.nama_perangkat,
              kode_aset: schedule.asset?.kode_aset,
            },
          })}
        onMarkDone={handleMarkDone}
      />

      <AssetFormDialog
        open={assetDialogOpen}
        onOpenChange={setAssetDialogOpen}
        initialValues={selectedAsset}
        lokasiOptions={assetOptions.lokasi}
        onSubmit={handleAssetSubmit}
        loading={assetSubmitting}
      />

      <ScheduleFormDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        initialValues={selectedSchedule}
        assetOptions={assetCatalog}
        onSubmit={handleScheduleSubmit}
        loading={scheduleSubmitting}
      />

      <DeleteConfirmDialog
        open={deleteState.open}
        onOpenChange={(open) =>
          setDeleteState((current) => ({
            ...current,
            open,
          }))}
        item={deleteState.item}
        title={deleteState.type === "asset" ? "Hapus aset" : "Hapus jadwal"}
        description={
          deleteState.type === "asset"
            ? "Aset yang dipilih akan dihapus dari master data beserta jadwal yang terkait."
            : "Jadwal maintenance yang dipilih akan dihapus permanen."
        }
        loading={false}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
