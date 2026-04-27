import { Pencil, Plus, Trash2 } from "lucide-react";
import { addMonths, isBefore, parseISO, startOfDay } from "date-fns";
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
import { cn, formatDate } from "@/lib/utils";

function getStatusTone(status) {
  if (status === "aktif") {
    return "bg-secondary text-secondary-foreground";
  }

  if (status === "maintenance") {
    return "bg-accent text-accent-foreground";
  }

  if (status === "rusak") {
    return "bg-destructive/15 text-destructive";
  }

  return "bg-muted text-muted-foreground";
}

function getNextMaintenanceState(nextMaintenanceDate) {
  if (!nextMaintenanceDate) {
    return null;
  }

  const today = startOfDay(new Date());
  const nextDate = parseISO(nextMaintenanceDate);
  const warningThreshold = addMonths(today, 3);

  if (isBefore(nextDate, today)) {
    return {
      label: "Lewat",
      tone: "border-destructive/25 bg-destructive/12 text-destructive",
      textTone: "text-destructive",
      rowTone: "!bg-destructive/10 hover:!bg-destructive/10",
      cellTone: "bg-destructive/10",
    };
  }

  if (nextDate <= warningThreshold) {
    return {
      label: "Mendekati",
      tone: "border-amber-500/25 bg-amber-500/12 text-amber-700 dark:text-amber-300",
      textTone: "text-amber-700 dark:text-amber-300",
      rowTone: "!bg-amber-500/10 hover:!bg-amber-500/10",
      cellTone: "bg-amber-500/10",
    };
  }

  return null;
}

export function AssetTable({
  title = "Daftar Aset",
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
  showCreate = false,
  showActions = false,
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Card className="border-border/70 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
      <CardHeader className="flex flex-col gap-4 border-b border-border/60 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
        </div>
        <div className="flex flex-wrap gap-3">
          {filterControls}
          {showCreate ? (
            <Button onClick={onCreate}>
              <Plus className="h-4 w-4" />
              Tambah Aset
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="p-0 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        {data.length ? (
          <>
            <Table wrapperClassName="lg:min-h-0 lg:flex-1" className="min-w-[1080px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 z-10 bg-card">Kode Aset</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-card">Perangkat</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-card">Lokasi</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-card">Status</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-card">Maintenance Terakhir</TableHead>
                  <TableHead className="sticky top-0 z-10 bg-card">Berikutnya</TableHead>
                  {showActions ? (
                    <TableHead className="sticky top-0 z-10 bg-card text-right">
                      Aksi
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>

              <TableBody>
                {data.map((asset) => {
                  const nextMaintenanceState = getNextMaintenanceState(asset.next_maintenance_date);
                  const cellTone = nextMaintenanceState?.cellTone;

                  return (
                    <TableRow key={asset.id} className={cn(nextMaintenanceState?.rowTone)}>
                      <TableCell className={cn("font-semibold", cellTone)}>{asset.kode_aset}</TableCell>
                      <TableCell className={cellTone}>
                        <div>
                          <p className="font-semibold">{asset.nama_perangkat}</p>
                          <p className="text-xs text-muted-foreground">
                            {asset.tipe || "Tanpa tipe"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className={cellTone}>{asset.lokasi || "-"}</TableCell>
                      <TableCell className={cellTone}>
                        <Badge className={getStatusTone(asset.status)}>{asset.status}</Badge>
                      </TableCell>
                      <TableCell className={cellTone}>{formatDate(asset.last_maintenance_date)}</TableCell>
                      <TableCell className={cellTone}>
                        {asset.next_maintenance_date ? (
                          <div className="flex flex-col gap-1">
                            <span className={nextMaintenanceState?.textTone || "text-foreground"}>
                              {formatDate(asset.next_maintenance_date)}
                            </span>
                            {nextMaintenanceState ? (
                              <Badge className={cn("w-fit border", nextMaintenanceState.tone)}>
                                {nextMaintenanceState.label}
                              </Badge>
                            ) : null}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      {showActions ? (
                        <TableCell className={cn("text-right", cellTone)}>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              disabled={!canManage}
                              onClick={() => onEdit?.(asset)}
                              title="Edit aset"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="destructive"
                              disabled={!canManage}
                              onClick={() => onDelete?.(asset)}
                              title="Hapus aset"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="flex shrink-0 flex-col gap-4 border-t border-border/60 px-6 py-4 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-muted-foreground">
                Menampilkan {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} dari {total} aset
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
              title="Belum ada aset"
              description="Tambahkan master aset agar interval maintenance bisa dipantau."
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
