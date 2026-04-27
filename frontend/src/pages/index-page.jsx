import { useEffect, useMemo, useRef, useState } from "react";
import { Boxes, ClipboardList, Wrench } from "lucide-react";
import { AssetTable } from "@/components/assets/asset-table";
import { MaintenancePage } from "@/pages/maintenance-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { Select } from "@/components/ui/select";
import { DEFAULT_ASSET_FILTERS } from "@/lib/constants";
import {
  fetchAssetList,
  fetchAssetOptions,
  fetchAssetSummary,
} from "@/lib/assets";
import { fetchDashboardSummary } from "@/lib/maintenance";
import { isIgnorableSupabaseAbortError } from "@/lib/utils";
import { MAINTENANCE_SCHEMA, supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

export function IndexPage() {
  const [view, setView] = useState("assets");
  const [assetFilters, setAssetFilters] = useState(DEFAULT_ASSET_FILTERS);
  const [assetOptions, setAssetOptions] = useState({ lokasi: [], status: [] });
  const [assetRows, setAssetRows] = useState([]);
  const [assetTotal, setAssetTotal] = useState(0);
  const [assetPage, setAssetPage] = useState(1);
  const [assetPageSize, setAssetPageSize] = useState(10);
  const [assetLoading, setAssetLoading] = useState(true);
  const [assetSummary, setAssetSummary] = useState(null);
  const [maintenanceSummary, setMaintenanceSummary] = useState(null);
  const [realtimeTick, setRealtimeTick] = useState(0);
  const realtimeTimerRef = useRef(null);

  const assetFilterControls = useMemo(
    () => (
      <div className="flex flex-wrap gap-3">
        <Input
          className="w-full min-w-56 sm:w-56"
          placeholder="Cari kode aset atau perangkat"
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

  useEffect(() => {
    const channel = supabase
      .channel(`index-live-${Math.random().toString(36).slice(2)}`)
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

  return (
    <div className="space-y-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden lg:space-y-4">
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
            <p className="mt-2 text-sm text-muted-foreground">
              Aset aktif: {assetSummary?.active_assets ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardContent className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Total maintenance
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight">
              {maintenanceSummary?.total_maintenance ?? 0}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Perlu maintenance: {assetSummary?.due_assets ?? 0}
            </p>
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
            filterControls={assetFilterControls}
          />
        )
      ) : (
        <MaintenancePage readOnly externalFilterControls />
      )}
    </div>
  );
}
