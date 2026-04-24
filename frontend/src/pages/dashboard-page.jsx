import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Boxes, Clock3, Sparkles, Wrench } from "lucide-react";
import { MaintenanceFilters } from "@/components/maintenance/maintenance-filters";
import { DashboardCharts } from "@/components/maintenance/dashboard-charts";
import { StatsCard } from "@/components/maintenance/stats-card";
import { LoadingState } from "@/components/ui/loading-state";
import { DEFAULT_FILTERS } from "@/lib/constants";
import {
  fetchAvailableYears,
  fetchDashboardSummary,
  fetchFilterOptions,
  subscribeToMaintenanceChanges,
} from "@/lib/maintenance";
import { formatMinutes } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export function DashboardPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [options, setOptions] = useState({ lokasi: [], jenisKegiatan: [] });
  const [yearOptions, setYearOptions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const realtimeTimerRef = useRef(null);

  const loadFilterOptions = useEffectEvent(async ({ showError = true } = {}) => {
    try {
      const filterOptions = await fetchFilterOptions();
      setOptions(filterOptions);
    } catch (error) {
      if (showError) {
        toast({
          title: "Gagal memuat dashboard",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  });

  const loadYears = useEffectEvent(async ({ showError = true } = {}) => {
    if (!filters.lokasi) {
      setYearOptions([]);
      return;
    }

    try {
      const years = await fetchAvailableYears(filters.lokasi);
      setYearOptions(years);
    } catch (error) {
      if (showError) {
        toast({
          title: "Gagal memuat tahun",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  });

  const loadSummary = useEffectEvent(async ({ nextFilters = filters, showLoading = true, showError = true } = {}) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const result = await fetchDashboardSummary(nextFilters);
      setSummary(result);
    } catch (error) {
      if (showError) {
        toast({
          title: "Gagal memuat ringkasan",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  });

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    loadYears();
  }, [filters.lokasi, loadYears]);

  useEffect(() => {
    loadSummary();
  }, [filters, loadSummary]);

  const handleRealtimeRefresh = useEffectEvent(async () => {
    await Promise.all([
      loadFilterOptions({ showError: false }),
      loadYears({ showError: false }),
      loadSummary({ showLoading: false, showError: false }),
    ]);
  });

  useEffect(() => {
    const unsubscribe = subscribeToMaintenanceChanges(() => {
      window.clearTimeout(realtimeTimerRef.current);
      realtimeTimerRef.current = window.setTimeout(() => {
        handleRealtimeRefresh();
      }, 250);
    });

    return () => {
      window.clearTimeout(realtimeTimerRef.current);
      unsubscribe();
    };
  }, [handleRealtimeRefresh]);

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
              value={summary?.total_aset || 0}
              icon={Boxes}
              tone="secondary"
            />
            <StatsCard
              label="Total maintenance"
              value={summary?.total_maintenance || 0}
              icon={Wrench}
            />
            <StatsCard
              label="Total durasi"
              value={formatMinutes(summary?.total_durasi || 0)}
              icon={Clock3}
              tone="accent"
            />
            <StatsCard
              label="Kegiatan paling sering"
              value={summary?.kegiatan_paling_sering || "-"}
              icon={Sparkles}
              tone="secondary"
            />
          </div>

          <DashboardCharts
            yearly={summary?.yearly || []}
            activities={summary?.activities || []}
          />
        </>
      )}
    </div>
  );
}
