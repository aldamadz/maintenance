import { useEffect, useState } from "react";
import { AlertTriangle, Boxes, Clock3, ShieldCheck } from "lucide-react";
import { AssetFilters } from "@/components/assets/asset-filters";
import { AssetFormDialog } from "@/components/assets/asset-form-dialog";
import { AssetTable } from "@/components/assets/asset-table";
import { DeleteConfirmDialog } from "@/components/maintenance/delete-confirm-dialog";
import { StatsCard } from "@/components/maintenance/stats-card";
import { LoadingState } from "@/components/ui/loading-state";
import { useRealtimeTick } from "@/hooks/use-realtime-tick";
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
import { toast } from "@/hooks/use-toast";

export function AssetsPage() {
  const [assetFilters, setAssetFilters] = useState(DEFAULT_ASSET_FILTERS);
  const [assetOptions, setAssetOptions] = useState({
    lokasi: [],
    status: [],
    intervals: [],
  });
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
  const realtimeTick = useRealtimeTick("assets-admin-live", ["assets", "maintenance"]);

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
    } catch (error) {
      toast({
        title: "Gagal menghapus data",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  function handleAssetFilterChange(field, value) {
    setAssetPage(1);
    setAssetFilters((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          label="Total aset"
          value={summary?.total_assets || 0}
          hint={`${summary?.missing_history_assets || 0} tanpa histori`}
          icon={Boxes}
          tone="secondary"
        />
        <StatsCard
          label="Aset aktif"
          value={summary?.active_assets || 0}
          icon={ShieldCheck}
        />
        <StatsCard
          label="Lewat maintenance"
          value={summary?.overdue_assets || 0}
          hint={`${summary?.due_assets || 0} butuh tindakan`}
          icon={AlertTriangle}
          tone="accent"
        />
        <StatsCard
          label="Mendekati"
          value={summary?.upcoming_assets || 0}
          hint="<= 3 bulan"
          icon={Clock3}
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
          filterControls={(
            <AssetFilters
              filters={assetFilters}
              onChange={handleAssetFilterChange}
              onReset={() => {
                setAssetPage(1);
                setAssetFilters(DEFAULT_ASSET_FILTERS);
              }}
              lokasiOptions={assetOptions.lokasi}
              statusOptions={assetOptions.status}
              intervalOptions={assetOptions.intervals}
            />
          )}
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
