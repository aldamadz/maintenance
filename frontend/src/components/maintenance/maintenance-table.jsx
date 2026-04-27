import { useRef } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  FileSpreadsheet,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PAGE_SIZE_OPTIONS } from "@/lib/constants";
import { formatDate, formatMinutes } from "@/lib/utils";

function SortIcon({ active, direction }) {
  if (!active) {
    return <ArrowUpDown className="h-4 w-4" />;
  }

  return direction === "asc" ? (
    <ArrowUp className="h-4 w-4" />
  ) : (
    <ArrowDown className="h-4 w-4" />
  );
}

function MaintenanceCard({
  item,
  canManage,
  showManageActions,
  onEdit,
  onDelete,
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{item.nama_perangkat}</p>
          <p className="text-sm text-muted-foreground">{item.kode_aset}</p>
        </div>
        <span className="text-sm font-medium">{formatDate(item.tanggal_maintenance)}</span>
      </div>

      <div className="mt-4 grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Lokasi</span>
          <span className="text-right font-medium">{item.lokasi || "-"}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Kegiatan</span>
          <div className="flex justify-end">
            {item.jenis_kegiatan ? <Badge>{item.jenis_kegiatan}</Badge> : "-"}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Durasi</span>
          <span className="text-right font-medium">{formatMinutes(item.durasi)}</span>
        </div>
        <div className="grid gap-1">
          <span className="text-muted-foreground">Catatan</span>
          <p className="text-sm">{item.catatan || "-"}</p>
        </div>
      </div>

      {showManageActions ? (
        <div className="mt-4 flex justify-end gap-2">
          <Button
            size="icon"
            variant="outline"
            disabled={!canManage}
            onClick={() => onEdit(item)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="destructive"
            disabled={!canManage}
            onClick={() => onDelete(item)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function MaintenanceTable({
  data = [],
  total = 0,
  page = 1,
  pageSize = 10,
  sortColumn,
  sortDirection,
  loading = false,
  onSort,
  onPageChange,
  onPageSizeChange,
  onCreate,
  onEdit,
  onDelete,
  onExport,
  onImport,
  canManage = false,
  onRequestLogin,
  importLoading = false,
  showManageActions = true,
  showExport = true,
  showImport = true,
  filterControls = null,
}) {
  const fileInputRef = useRef(null);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Card className="border-border/70 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
      <CardHeader className="flex flex-col gap-4 border-b border-border/60 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Data Maintenance</CardTitle>
        </div>
        <div className="flex flex-wrap gap-3">
          {filterControls}
          {showExport ? (
            <Button variant="outline" onClick={onExport}>
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel
            </Button>
          ) : null}
          {showImport ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file && onImport) {
                    onImport(file);
                  }
                  event.target.value = "";
                }}
              />
              <Button
                variant="outline"
                disabled={importLoading}
                onClick={() => {
                  if (!canManage) {
                    onRequestLogin?.();
                    return;
                  }

                  fileInputRef.current?.click();
                }}
              >
                <Upload className="h-4 w-4" />
                {importLoading ? "Import..." : "Import Excel"}
              </Button>
            </>
          ) : null}
          {showManageActions ? (
            <Button onClick={canManage ? onCreate : onRequestLogin}>
              <Plus className="h-4 w-4" />
              {canManage ? "Tambah Data" : "Login untuk CRUD"}
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="p-0 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        {loading && !data.length ? (
          <div className="p-6">
            <LoadingState label="Memuat data maintenance..." />
          </div>
        ) : data.length ? (
          <>
            <div className="grid gap-3 p-4 md:hidden">
              {data.map((item) => (
                <MaintenanceCard
                  key={item.id}
                  item={item}
                  canManage={canManage}
                  showManageActions={showManageActions}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>

            <div className="hidden md:block lg:min-h-0 lg:flex-1">
              <Table
                wrapperClassName="lg:min-h-0 lg:flex-1"
                className="min-w-[960px]"
              >
                <TableHeader>
                  <TableRow>
                    {[
                      ["tanggal_maintenance", "Tanggal"],
                      ["kode_aset", "Kode Aset"],
                      ["nama_perangkat", "Perangkat"],
                      ["lokasi", "Lokasi"],
                      ["jenis_kegiatan", "Kegiatan"],
                      ["durasi", "Durasi"],
                    ].map(([column, label]) => (
                      <TableHead key={column} className="sticky top-0 z-10 bg-card">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2"
                          onClick={() => onSort(column)}
                        >
                          {label}
                          <SortIcon
                            active={sortColumn === column}
                            direction={sortDirection}
                          />
                        </button>
                      </TableHead>
                    ))}
                    <TableHead className="sticky top-0 z-10 bg-card">Catatan</TableHead>
                    {showManageActions ? (
                      <TableHead className="sticky top-0 z-10 bg-card text-right">
                        Aksi
                      </TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="min-w-32 font-medium">
                        {formatDate(item.tanggal_maintenance)}
                      </TableCell>
                      <TableCell>{item.kode_aset}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold">{item.nama_perangkat}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.tipe || "Tanpa tipe"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{item.lokasi || "-"}</TableCell>
                      <TableCell>
                        {item.jenis_kegiatan ? (
                          <Badge>{item.jenis_kegiatan}</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{formatMinutes(item.durasi)}</TableCell>
                      <TableCell className="max-w-xs">
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {item.catatan || "-"}
                        </p>
                      </TableCell>
                      {showManageActions ? (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              disabled={!canManage}
                              onClick={() => onEdit(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="destructive"
                              disabled={!canManage}
                              onClick={() => onDelete(item)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex shrink-0 flex-col gap-4 border-t border-border/60 px-6 py-4 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-muted-foreground">
                Menampilkan {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} dari {total} data
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm text-muted-foreground">Rows</label>
                <select
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                  value={pageSize}
                  onChange={(event) => onPageSizeChange(Number(event.target.value))}
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
                  onClick={() => onPageChange(page - 1)}
                >
                  Sebelumnya
                </Button>
                <div className="text-sm font-semibold">
                  Halaman {page} / {totalPages}
                </div>
                <Button
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(page + 1)}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-6">
            <EmptyState />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
