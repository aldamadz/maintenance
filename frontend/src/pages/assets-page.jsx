import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Boxes, ShieldCheck } from "lucide-react";
import { AssetFormDialog } from "@/components/assets/asset-form-dialog";
import { AssetTable } from "@/components/assets/asset-table";
import { DeleteConfirmDialog } from "@/components/maintenance/delete-confirm-dialog";
import { StatsCard } from "@/components/maintenance/stats-card";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { Select } from "@/components/ui/select";
import { DEFAULT_ASSET_FILTERS } from "@/lib/constants";
import {
  createAsset,
  deleteAsset,
  fetchAssetList,
  fetchAssetOptions,
  fetchAssetSummary,
  updateAsset,
} from "@/lib/assets";
import { isIgnorableSupabaseAbortError } from "@/lib/utils";
import { MAINTENANCE_SCHEMA, supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

export function AssetsPage() {
  const [assetFilters, setAssetFilters] = useState(DEFAULT_ASSET_FILTERS);
  const [assetOptions, setAssetOptions] = useState({ lokasi: [], status: [], intervals: [] });
  const [assetRows, setAssetRows] = useState([]);
  const [assetTotal, setAssetTotal] = useState(0);
  const [assetPage, setAssetPage] = useState(1);
  const [assetPageSize, setAssetPageSize] = useState(10);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [assetSubmitting, setAssetSubmitting] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [deleteState, setDeleteState] = useState({ open: false, item: null });
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

  useEffect(() => {
    async function loadAssetOptionsAndSummary() {
      try {
        const [options, assetSummary] = await Promise.all([
          fetchAssetOptions(),
          fetchAssetSummary(assetFilters),
        ]);
        setAssetOptions(options);
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

    loadAssetOptionsAndSummary();
  }, [assetFilters, realtimeTick]);

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
        { event: "*", schema: MAINTENANCE_SCHEMA, table: "maintenance" },
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

  async function handleDeleteConfirm() {
    if (!deleteState.item?.id) {
      return;
    }

    try {
      await deleteAsset(deleteState.item.id);
      toast({
        title: "Aset dihapus",
        description: "Master aset berhasil dihapus dari sistem.",
      });

      setDeleteState({ open: false, item: null });
      setRealtimeTick((current) => current + 1);
    } catch (error) {
      toast({
        title: "Gagal menghapus data",
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
          label="Perlu maintenance"
          value={summary?.due_assets || 0}
          icon={AlertTriangle}
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
              item: asset,
            })}
        />
      )}

      <AssetFormDialog
        open={assetDialogOpen}
        onOpenChange={setAssetDialogOpen}
        initialValues={selectedAsset}
        lokasiOptions={assetOptions.lokasi}
        onSubmit={handleAssetSubmit}
        loading={assetSubmitting}
      />

      <DeleteConfirmDialog
        open={deleteState.open}
        onOpenChange={(open) =>
          setDeleteState((current) => ({
            ...current,
            open,
          }))}
        item={deleteState.item}
        title="Hapus aset"
        description="Aset yang dipilih akan dihapus dari master data."
        loading={false}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
