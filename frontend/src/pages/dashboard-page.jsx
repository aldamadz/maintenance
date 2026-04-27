import { useEffect, useRef, useState } from "react";
import { addMonths, isBefore, parseISO, startOfDay } from "date-fns";
import { AlertTriangle, Boxes, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { MaintenanceFilters } from "@/components/maintenance/maintenance-filters";
import { DashboardCharts } from "@/components/maintenance/dashboard-charts";
import { StatsCard } from "@/components/maintenance/stats-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { DEFAULT_FILTERS } from "@/lib/constants";
import { fetchAssetList, fetchAssetSummary } from "@/lib/assets";
import {
  fetchAvailableYears,
  fetchDashboardSummary,
  fetchFilterOptions,
} from "@/lib/maintenance";
import { formatDate, isIgnorableSupabaseAbortError } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { MAINTENANCE_SCHEMA, supabase } from "@/lib/supabaseClient";

function getUrgencyState(nextMaintenanceDate) {
  if (!nextMaintenanceDate) {
    return {
      label: "Belum ada histori",
      tone: "border-border bg-muted text-muted-foreground",
    };
  }

  const today = startOfDay(new Date());
  const nextDate = parseISO(nextMaintenanceDate);
  const warningThreshold = addMonths(today, 3);

  if (isBefore(nextDate, today)) {
    return {
      label: "Lewat",
      tone: "border-destructive/25 bg-destructive/12 text-destructive",
    };
  }

  if (nextDate <= warningThreshold) {
    return {
      label: "Mendekati",
      tone: "border-amber-500/25 bg-amber-500/12 text-amber-700 dark:text-amber-300",
    };
  }

  return {
    label: "Normal",
    tone: "border-border bg-muted text-muted-foreground",
  };
}

export function DashboardPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [options, setOptions] = useState({ lokasi: [], jenisKegiatan: [] });
  const [yearOptions, setYearOptions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [assetSummary, setAssetSummary] = useState(null);
  const [priorityAssets, setPriorityAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [realtimeTick, setRealtimeTick] = useState(0);
  const realtimeTimerRef = useRef(null);

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
          title: "Gagal memuat dashboard",
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
          title: "Gagal memuat tahun",
          description: error.message,
          variant: "destructive",
        });
      }
    }

    loadYears();
  }, [filters.lokasi, realtimeTick]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const assetFilters = {
          lokasi: filters.lokasi || "",
          status: "",
          search: "",
        };

        const [maintenanceSummary, assetsSummary, assetsPriority] = await Promise.all([
          fetchDashboardSummary(filters),
          fetchAssetSummary(assetFilters),
          fetchAssetList({
            filters: assetFilters,
            page: 1,
            pageSize: 5,
          }),
        ]);

        setSummary(maintenanceSummary);
        setAssetSummary(assetsSummary);
        setPriorityAssets(assetsPriority.data || []);
      } catch (error) {
        if (isIgnorableSupabaseAbortError(error)) {
          return;
        }

        toast({
          title: "Gagal memuat ringkasan",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [filters, realtimeTick]);

  useEffect(() => {
    const channel = supabase
      .channel(`maintenance-live-dashboard-${Math.random().toString(36).slice(2)}`)
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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: MAINTENANCE_SCHEMA,
          table: "assets",
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
          console.error("Dashboard realtime channel error");
        }
      });

    return () => {
      window.clearTimeout(realtimeTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, []);

  function handleFilterChange(field, value) {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-card/75 p-5 shadow-panel sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Ringkasan
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
            Dashboard Maintenance
          </h1>
        </div>
        <MaintenanceFilters
          filters={filters}
          onChange={handleFilterChange}
          onReset={() => setFilters(DEFAULT_FILTERS)}
          lokasiOptions={options.lokasi}
          yearOptions={yearOptions}
          activityOptions={options.jenisKegiatan}
        />
      </div>

      {loading && !summary ? (
        <LoadingState label="Memuat dashboard maintenance..." />
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <StatsCard
              label="Total aset"
              value={assetSummary?.total_assets ?? summary?.total_aset ?? 0}
              icon={Boxes}
              tone="secondary"
            />
            <StatsCard
              label="Aset aktif"
              value={assetSummary?.active_assets || 0}
              icon={ShieldCheck}
            />
            <StatsCard
              label="Total maintenance"
              value={summary?.total_maintenance || 0}
              icon={Wrench}
            />
            <StatsCard
              label="Perlu maintenance"
              value={assetSummary?.due_assets || 0}
              icon={AlertTriangle}
              tone="accent"
            />
          </div>

          <DashboardCharts
            yearly={summary?.yearly || []}
            activities={summary?.activities || []}
          />

          <Card className="border-border/70">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle>Prioritas Maintenance</CardTitle>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/35 px-4 py-3 md:min-w-[240px]">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-secondary/90 p-3 text-secondary-foreground">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Kegiatan Paling Sering
                      </p>
                      <p className="mt-1 text-base font-semibold capitalize">
                        {summary?.kegiatan_paling_sering || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {priorityAssets.length ? (
                <div className="grid gap-3 xl:grid-cols-2">
                  {priorityAssets.map((asset) => {
                    const urgency = getUrgencyState(asset.next_maintenance_date);

                    return (
                      <div
                        key={asset.id}
                        className="rounded-2xl border border-border/70 bg-muted/35 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{asset.nama_perangkat}</p>
                            <p className="text-sm text-muted-foreground">
                              {asset.kode_aset} · {asset.lokasi || "-"}
                            </p>
                          </div>
                          <Badge className={urgency.tone}>{urgency.label}</Badge>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">Maintenance terakhir</span>
                          <span className="font-medium">
                            {formatDate(asset.last_maintenance_date)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">Berikutnya</span>
                          <span className="font-medium">
                            {formatDate(asset.next_maintenance_date)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-border/70 bg-muted/25 p-4 text-sm text-muted-foreground">
                  Belum ada aset prioritas untuk ditampilkan.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
