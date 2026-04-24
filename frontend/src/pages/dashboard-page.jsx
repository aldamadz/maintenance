import { useEffect, useRef, useState } from "react";
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
} from "@/lib/maintenance";
import { formatMinutes, isIgnorableSupabaseAbortError } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { MAINTENANCE_SCHEMA, supabase } from "@/lib/supabaseClient";

export function DashboardPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [options, setOptions] = useState({ lokasi: [], jenisKegiatan: [] });
  const [yearOptions, setYearOptions] = useState([]);
  const [summary, setSummary] = useState(null);
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
    async function loadSummary() {
      try {
        setLoading(true);
        const result = await fetchDashboardSummary(filters);
        setSummary(result);
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

    loadSummary();
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
