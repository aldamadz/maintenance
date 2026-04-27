import { addMonths, parseISO, startOfDay } from "date-fns";
import { Pencil, Plus, Trash2 } from "lucide-react";
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

function getIntervalLabel(intervalMonths) {
  if (Number(intervalMonths) === 6) {
    return "6 bulan";
  }

  if (Number(intervalMonths) === 24) {
    return "2 tahun";
  }

  return "1 tahun";
}

function getNextMaintenanceState(asset) {
  if (asset.priority_label === "belum-ada-histori") {
    return {
      label: "Belum ada histori",
      tone: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
      textTone: "text-sky-700 dark:text-sky-300",
      rowTone: "!bg-sky-500/8 hover:!bg-sky-500/8",
      cellTone: "bg-sky-500/8",
    };
  }

  if (asset.priority_label === "lewat") {
    return {
      label: "Lewat",
      tone: "border-destructive/25 bg-destructive/12 text-destructive",
      textTone: "text-destructive",
      rowTone: "!bg-destructive/10 hover:!bg-destructive/10",
      cellTone: "bg-destructive/10",
    };
  }

  if (asset.priority_label === "mendekati") {
    return {
      label: "Mendekati",
      tone: "border-amber-500/25 bg-amber-500/12 text-amber-700 dark:text-amber-300",
      textTone: "text-amber-700 dark:text-amber-300",
      rowTone: "!bg-amber-500/10 hover:!bg-amber-500/10",
      cellTone: "bg-amber-500/10",
    };
  }

  if (!asset.next_maintenance_date) {
    return null;
  }

  const today = startOfDay(new Date());
  const nextDate = parseISO(asset.next_maintenance_date);
  const warningThreshold = addMonths(today, 3);

  if (nextDate <= today) {
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

function AssetCard({ asset, canManage, showActions, onEdit, onDelete }) {
  const nextMaintenanceState = getNextMaintenanceState(asset);

  return (
    <div className={cn("rounded-2xl border border-border/70 bg-card p-4", nextMaintenanceState?.rowTone)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{asset.nama_perangkat}</p>
          <p className="text-sm text-muted-foreground">{asset.kode_aset}</p>
        </div>
        <Badge className={getStatusTone(asset.status)}>{asset.status}</Badge>
      </div>

      <div className="mt-4 grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Lokasi</span>
          <span className="text-right font-medium">{asset.lokasi || "-"}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Interval</span>
          <span className="text-right font-medium">
            {getIntervalLabel(asset.maintenance_interval_months)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Maintenance terakhir</span>
          <span className="text-right font-medium">
            {formatDate(asset.last_maintenance_date)}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="text-muted-foreground">Berikutnya</span>
          <div className="flex flex-col items-end gap-1 text-right">
            <span className={nextMaintenanceState?.textTone || "font-medium"}>
              {formatDate(asset.next_maintenance_date)}
            </span>
            {nextMaintenanceState ? (
              <Badge className={cn("w-fit border", nextMaintenanceState.tone)}>
                {nextMaintenanceState.label}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      {showActions ? (
        <div className="mt-4 flex justify-end gap-2">
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
      ) : null}
    </div>
  );
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
    <Card className="min-w-0 overflow-hidden border-border/70 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
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

      <CardContent className="min-w-0 p-0 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        {data.length ? (
          <>
            <div className="grid gap-3 p-4 md:hidden">
              {data.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  canManage={canManage}
                  showActions={showActions}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>

            <div className="hidden min-w-0 flex-1 flex-col overflow-hidden md:flex md:min-h-0">
              <Table
                wrapperClassName="min-h-0 min-w-0 flex-1 border-b border-border/60"
                className="min-w-[1080px]"
              >
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 z-10 bg-card">Kode Aset</TableHead>
                    <TableHead className="sticky top-0 z-10 bg-card">Perangkat</TableHead>
                    <TableHead className="sticky top-0 z-10 bg-card">Lokasi</TableHead>
                    <TableHead className="sticky top-0 z-10 bg-card">Status</TableHead>
                    <TableHead className="sticky top-0 z-10 bg-card">Interval</TableHead>
                    <TableHead className="sticky top-0 z-10 bg-card">
                      Maintenance Terakhir
                    </TableHead>
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
                    const nextMaintenanceState = getNextMaintenanceState(asset);
                    const cellTone = nextMaintenanceState?.cellTone;

                    return (
                      <TableRow key={asset.id} className={cn(nextMaintenanceState?.rowTone)}>
                        <TableCell className={cn("font-semibold", cellTone)}>
                          {asset.kode_aset}
                        </TableCell>
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
                        <TableCell className={cellTone}>
                          {getIntervalLabel(asset.maintenance_interval_months)}
                        </TableCell>
                        <TableCell className={cellTone}>
                          {formatDate(asset.last_maintenance_date)}
                        </TableCell>
                        <TableCell className={cellTone}>
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
            </div>

            <div className="flex shrink-0 flex-col gap-4 px-4 py-4 sm:px-6">
              <div className="text-sm text-muted-foreground">
                Menampilkan {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} dari {total} aset
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-muted-foreground">Rows</label>
                  <select
                    className="h-10 min-w-20 rounded-xl border border-input bg-background px-3 text-sm"
                    value={pageSize}
                    onChange={(event) => onPageSizeChange?.(Number(event.target.value))}
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:flex sm:flex-wrap sm:justify-end sm:gap-3">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    disabled={page <= 1}
                    onClick={() => onPageChange?.(page - 1)}
                  >
                    Sebelumnya
                  </Button>
                  <div className="text-center text-sm font-semibold sm:min-w-28">
                    Halaman {page} / {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange?.(page + 1)}
                  >
                    Berikutnya
                  </Button>
                </div>
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
