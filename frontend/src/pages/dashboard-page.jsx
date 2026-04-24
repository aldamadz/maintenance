import { useEffect, useState } from "react";
import { CalendarRange, Clock3, Filter, Sparkles } from "lucide-react";
import { MaintenanceFilters } from "@/components/maintenance/maintenance-filters";
import { DashboardCharts } from "@/components/maintenance/dashboard-charts";
import { StatsCard } from "@/components/maintenance/stats-card";
import { LoadingState } from "@/components/ui/loading-state";
import { DEFAULT_FILTERS } from "@/lib/constants";
import { fetchAvailableYears, fetchDashboardSummary, fetchFilterOptions } from "@/lib/maintenance";
import { formatMinutes } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export function DashboardPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [options, setOptions] = useState({ lokasi: [], jenisKegiatan: [] });
  const [yearOptions, setYearOptions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      try {
        setLoading(true);
        const [filterOptions, dashboard] = await Promise.all([
          fetchFilterOptions(),
          fetchDashboardSummary(DEFAULT_FILTERS),
        ]);
        setOptions(filterOptions);
        setSummary(dashboard);
      } catch (error) {
        toast({
          title: "Gagal memuat dashboard",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, []);

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
        toast({
          title: "Gagal memuat tahun",
          description: error.message,
          variant: "destructive",
        });
      }
    }

    loadYears();
  }, [filters.lokasi]);

  useEffect(() => {
    async function loadSummary() {
      try {
        setLoading(true);
        const result = await fetchDashboardSummary(filters);
        setSummary(result);
      } catch (error) {
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
  }, [filters]);

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
      <MaintenanceFilters
        filters={filters}
        onChange={handleFilterChange}
        onReset={() => setFilters(DEFAULT_FILTERS)}
        lokasiOptions={options.lokasi}
        yearOptions={yearOptions}
        activityOptions={options.jenisKegiatan}
      />

      {loading && !summary ? (
        <LoadingState label="Memuat dashboard maintenance..." />
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <StatsCard
              label="Total maintenance"
              value={summary?.total_maintenance || 0}
              icon={Filter}
            />
            <StatsCard
              label="Total durasi"
              value={formatMinutes(summary?.total_durasi || 0)}
              icon={Clock3}
              tone="secondary"
            />
            <StatsCard
              label="Kegiatan paling sering"
              value={summary?.kegiatan_paling_sering || "-"}
              icon={Sparkles}
              tone="accent"
            />
            <StatsCard
              label="Periode aktif"
              value={summary?.yearly?.length || 0}
              icon={CalendarRange}
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
