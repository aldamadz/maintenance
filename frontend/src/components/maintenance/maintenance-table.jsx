import { ArrowDown, ArrowUp, ArrowUpDown, FileSpreadsheet, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatMinutes } from "@/lib/utils";
import { PAGE_SIZE_OPTIONS } from "@/lib/constants";

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

export function MaintenanceTable({
  data = [],
  total = 0,
  page = 1,
  pageSize = 10,
  sortColumn,
  sortDirection,
  onSort,
  onPageChange,
  onPageSizeChange,
  onCreate,
  onEdit,
  onDelete,
  onExport,
  canManage = false,
  onRequestLogin,
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 border-b border-border/60 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Data Maintenance</CardTitle>
          <CardDescription>
            Pagination, sorting, search, dan aksi CRUD untuk riwayat maintenance.
          </CardDescription>
          {!canManage ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Mode baca publik aktif. Login diperlukan untuk tambah, edit, dan hapus data.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={onExport}>
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </Button>
          <Button onClick={canManage ? onCreate : onRequestLogin}>
            <Plus className="h-4 w-4" />
            {canManage ? "Tambah Data" : "Login untuk CRUD"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {data.length ? (
          <>
            <Table>
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
                    <TableHead key={column}>
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
                  <TableHead>Catatan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex flex-col gap-4 border-t border-border/60 px-6 py-4 md:flex-row md:items-center md:justify-between">
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
