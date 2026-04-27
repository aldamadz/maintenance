import { CheckCircle2, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PAGE_SIZE_OPTIONS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

function getScheduleTone(status) {
  if (status === "terjadwal") {
    return "bg-accent text-accent-foreground";
  }

  if (status === "selesai") {
    return "bg-secondary text-secondary-foreground";
  }

  return "bg-muted text-muted-foreground";
}

export function ScheduleTable({
  data = [],
  total = 0,
  page = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  filterControls = null,
  canManage = false,
  onCreate,
  onEdit,
  onDelete,
  onMarkDone,
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Card className="border-border/70">
      <CardHeader className="flex flex-col gap-4 border-b border-border/60 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Jadwal Maintenance</CardTitle>
        </div>
        <div className="flex flex-wrap gap-3">
          {filterControls}
          <Button onClick={onCreate}>
            <Plus className="h-4 w-4" />
            Buat Jadwal
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {data.length ? (
          <>
            <Table className="min-w-[920px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Aset</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Kegiatan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-semibold">
                      {formatDate(schedule.tanggal_jadwal)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold">{schedule.asset?.nama_perangkat}</p>
                        <p className="text-xs text-muted-foreground">
                          {schedule.asset?.kode_aset}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{schedule.asset?.lokasi || "-"}</TableCell>
                    <TableCell>{schedule.jenis_kegiatan}</TableCell>
                    <TableCell>
                      <Badge className={getScheduleTone(schedule.status)}>
                        {schedule.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {schedule.catatan || "-"}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          disabled={!canManage || schedule.status === "selesai"}
                          onClick={() => onMarkDone?.(schedule)}
                          title="Tandai selesai"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          disabled={!canManage}
                          onClick={() => onEdit?.(schedule)}
                          title="Edit jadwal"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          disabled={!canManage}
                          onClick={() => onDelete?.(schedule)}
                          title="Hapus jadwal"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex flex-col gap-4 border-t border-border/60 px-6 py-4 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-muted-foreground">
                Menampilkan {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} dari {total} jadwal
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm text-muted-foreground">Rows</label>
                <select
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                  value={pageSize}
                  onChange={(event) => onPageSizeChange?.(Number(event.target.value))}
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => onPageChange?.(page - 1)}
                >
                  Sebelumnya
                </Button>
                <div className="text-sm font-semibold">
                  Halaman {page} / {totalPages}
                </div>
                <Button
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange?.(page + 1)}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-6">
            <EmptyState
              title="Belum ada jadwal maintenance"
              description="Buat jadwal baru agar setiap aset punya rencana maintenance yang jelas."
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
