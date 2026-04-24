import { RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

export function MaintenanceFilters({
  filters,
  onChange,
  onReset,
  lokasiOptions = [],
  yearOptions = [],
  activityOptions = [],
  showSearch = false,
}) {
  return (
    <Card className="bg-card/95">
      <CardContent className="p-6">
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-semibold">Lokasi</label>
            <Select
              value={filters.lokasi}
              onChange={(event) => onChange("lokasi", event.target.value)}
            >
              <option value="">Semua lokasi</option>
              {lokasiOptions.map((lokasi) => (
                <option key={lokasi} value={lokasi}>
                  {lokasi}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">Tahun</label>
            <Select
              value={filters.tahun}
              disabled={!filters.lokasi}
              onChange={(event) => onChange("tahun", event.target.value)}
            >
              <option value="">Semua tahun</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">Tanggal mulai</label>
            <Input
              type="date"
              value={filters.tanggalMulai}
              onChange={(event) => onChange("tanggalMulai", event.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">Tanggal selesai</label>
            <Input
              type="date"
              value={filters.tanggalSelesai}
              onChange={(event) => onChange("tanggalSelesai", event.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-semibold">Jenis kegiatan</label>
            <Select
              value={filters.jenisKegiatan}
              onChange={(event) => onChange("jenisKegiatan", event.target.value)}
            >
              <option value="">Semua kegiatan</option>
              {activityOptions.map((activity) => (
                <option key={activity} value={activity}>
                  {activity}
                </option>
              ))}
            </Select>
          </div>

          {showSearch ? (
            <div className="lg:col-span-2">
              <label className="mb-2 block text-sm font-semibold">Search aset/perangkat</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Cari kode aset atau nama perangkat"
                  value={filters.search}
                  onChange={(event) => onChange("search", event.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="lg:col-span-2" />
          )}

          <div className="flex items-end">
            <Button variant="outline" className="w-full" onClick={onReset}>
              <RotateCcw className="h-4 w-4" />
              Reset Filter
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

