import { useEffect, useMemo, useState } from "react";
import { CalendarRange, Clock3, Filter, Sparkles } from "lucide-react";
import { MaintenanceFilters } from "@/components/maintenance/maintenance-filters";
import { DashboardCharts } from "@/components/maintenance/dashboard-charts";
import { StatsCard } from "@/components/maintenance/stats-card";
import { Card, CardContent } from "@/components/ui/card";
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

  const heroHint = useMemo(() => {
    if (filters.lokasi) {
      return `Lokasi aktif: ${filters.lokasi}`;
    }

    return "Menampilkan performa maintenance seluruh lokasi.";
  }, [filters.lokasi]);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden bg-grid">
        <CardContent className="relative p-6 sm:p-8">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-accent/20" />
          <div className="relative grid gap-6 lg:grid-cols-[1.7fr,0.8fr]">
            <div>
              <div className="inline-flex rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                Maintenance analytics
              </div>
              <h1 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl">
                Monitoring maintenance perangkat IT dengan filter dinamis dan ringkasan yang langsung bisa dipakai tim support.
              </h1>
              <p className="mt-4 max-w-2xl text-muted-foreground">{heroHint}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {[
                ["Filter lokasi", "Tahun akan muncul setelah lokasi dipilih.", Filter],
                ["Range tanggal", "Pilih tahun otomatis 1 Januari sampai 31 Desember.", CalendarRange],
                ["Kinerja tim", "Pantau total durasi dan kegiatan teratas.", Sparkles],
              ].map(([title, text, Icon]) => (
                <div key={title} className="rounded-3xl border border-border/60 bg-card/80 p-4 backdrop-blur">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-secondary p-3 text-secondary-foreground">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold">{title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

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
              hint="Jumlah aktivitas maintenance sesuai filter aktif."
              icon={Filter}
            />
            <StatsCard
              label="Total durasi"
              value={formatMinutes(summary?.total_durasi || 0)}
              hint="Akumulasi durasi pekerjaan maintenance."
              icon={Clock3}
              tone="secondary"
            />
            <StatsCard
              label="Kegiatan paling sering"
              value={summary?.kegiatan_paling_sering || "-"}
              hint="Jenis kegiatan dengan frekuensi tertinggi."
              icon={Sparkles}
              tone="accent"
            />
            <StatsCard
              label="Periode aktif"
              value={summary?.yearly?.length || 0}
              hint="Jumlah tahun yang muncul dalam grafik."
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

