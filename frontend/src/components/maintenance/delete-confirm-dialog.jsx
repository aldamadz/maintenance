import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  item,
  loading = false,
  onConfirm,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Hapus data maintenance</DialogTitle>
          <DialogDescription>
            Data untuk <strong>{item?.nama_perangkat || "-"}</strong> akan dihapus
            permanen dari tabel maintenance.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">
          Kode aset: {item?.kode_aset || "-"}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button variant="destructive" disabled={loading} onClick={onConfirm}>
            {loading ? "Menghapus..." : "Hapus"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

