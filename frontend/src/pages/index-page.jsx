import { useEffect, useState } from "react";
import { AlertTriangle, Boxes, ClipboardList, Clock3, Wrench } from "lucide-react";
import { AssetFilters } from "@/components/assets/asset-filters";
import { AssetTable } from "@/components/assets/asset-table";
import { PublicMaintenanceSection } from "@/components/maintenance/public-maintenance-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { useRealtimeTick } from "@/hooks/use-realtime-tick";
import { DEFAULT_ASSET_FILTERS } from "@/lib/constants";
import {
  fetchAssetList,
  fetchAssetOptions,
  fetchAssetSummary,
} from "@/lib/assets";
import { fetchDashboardSummary } from "@/lib/maintenance";
import { isIgnorableSupabaseAbortError } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export function IndexPage() {
  const [view, setView] = useState("assets");
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
  const [assetLoading, setAssetLoading] = useState(true);
  const [assetSummary, setAssetSummary] = useState(null);
  const [maintenanceSummary, setMaintenanceSummary] = useState(null);
  const realtimeTick = useRealtimeTick("index-live", ["assets", "maintenance"]);

  useEffect(() => {
    async function loadAssetOptions() {
      try {
        const options = await fetchAssetOptions();
        setAssetOptions(options);
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

    loadAssetOptions();
  }, [realtimeTick]);

  useEffect(() => {
    async function loadAssets() {
      try {
        setAssetLoading(true);
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
        setAssetLoading(false);
      }
    }

    loadAssets();
  }, [assetFilters, assetPage, assetPageSize, realtimeTick]);

  useEffect(() => {
    async function loadAssetSummary() {
      try {
        const assets = await fetchAssetSummary(assetFilters);
        setAssetSummary(assets);
      } catch (error) {
        if (isIgnorableSupabaseAbortError(error)) {
          return;
        }

        toast({
          title: "Gagal memuat ringkasan",
          description: error.message,
          variant: "destructive",
        });
      }
    }

    loadAssetSummary();
  }, [assetFilters, realtimeTick]);

  useEffect(() => {
    async function loadMaintenanceSummary() {
      try {
        const maintenance = await fetchDashboardSummary({});
        setMaintenanceSummary(maintenance);
      } catch (error) {
        if (isIgnorableSupabaseAbortError(error)) {
          return;
        }

        toast({
          title: "Gagal memuat ringkasan maintenance",
          description: error.message,
          variant: "destructive",
        });
      }
    }

    loadMaintenanceSummary();
  }, [realtimeTick]);

  function handleAssetFilterChange(field, value) {
    setAssetPage(1);
    setAssetFilters((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleAssetFilterReset() {
    setAssetPage(1);
    setAssetFilters(DEFAULT_ASSET_FILTERS);
  }

  return (
    <div className="min-w-0 space-y-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden lg:space-y-4">
      <div className="grid shrink-0 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="border-border/70">
          <CardContent className="p-6">
            <h1 className="text-3xl font-extrabold tracking-tight">
              Data maintenance perangkat IT
            </h1>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                variant={view === "assets" ? "default" : "outline"}
                onClick={() => setView("assets")}
              >
                <Boxes className="h-4 w-4" />
                Daftar Aset
              </Button>
              <Button
                variant={view === "maintenance" ? "default" : "outline"}
                onClick={() => setView("maintenance")}
              >
                <ClipboardList className="h-4 w-4" />
                Riwayat Maintenance
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardContent className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Total aset
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight">
              {assetSummary?.total_assets ?? 0}
            </h2>
            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              <p>Aset aktif: {assetSummary?.active_assets ?? 0}</p>
              <p>Tanpa histori: {assetSummary?.missing_history_assets ?? 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardContent className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Tindakan maintenance
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight">
              {assetSummary?.due_assets ?? 0}
            </h2>
            <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Lewat
                </span>
                <span className="font-medium text-foreground">
                  {assetSummary?.overdue_assets ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-amber-600" />
                  Mendekati
                </span>
                <span className="font-medium text-foreground">
                  {assetSummary?.upcoming_assets ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-sky-600" />
                  Belum ada histori
                </span>
                <span className="font-medium text-foreground">
                  {assetSummary?.missing_history_assets ?? 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {view === "assets" ? (
        assetLoading && !assetRows.length ? (
          <div className="lg:flex lg:min-h-0 lg:flex-1 lg:items-center lg:justify-center">
            <LoadingState label="Memuat daftar aset..." />
          </div>
        ) : (
          <AssetTable
            title="Daftar Aset"
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
                onReset={handleAssetFilterReset}
                lokasiOptions={assetOptions.lokasi}
                statusOptions={assetOptions.status}
                intervalOptions={assetOptions.intervals}
              />
            )}
          />
        )
      ) : (
        <PublicMaintenanceSection realtimeTick={realtimeTick} />
      )}
    </div>
  );
}
