import { useEffect, useMemo, useState } from "react";
import {
  ACTIVITY_OPTIONS,
  DEFAULT_SCHEDULE_FORM_VALUES,
  SCHEDULE_STATUS_OPTIONS,
} from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function normalizeScheduleValues(values) {
  return {
    asset_id: values?.asset_id?.toString() || "",
    tanggal_jadwal: values?.tanggal_jadwal || "",
    jenis_kegiatan: values?.jenis_kegiatan || "",
    status: values?.status || "terjadwal",
    catatan: values?.catatan || "",
  };
}

function validateScheduleForm(values) {
  const nextErrors = {};

  if (!values.asset_id) {
    nextErrors.asset_id = "Aset wajib dipilih.";
  }

  if (!values.tanggal_jadwal) {
    nextErrors.tanggal_jadwal = "Tanggal jadwal wajib diisi.";
  }

  if (!values.jenis_kegiatan) {
    nextErrors.jenis_kegiatan = "Jenis kegiatan wajib dipilih.";
  }

  return nextErrors;
}

export function ScheduleFormDialog({
  open,
  onOpenChange,
  initialValues,
  assetOptions = [],
  onSubmit,
  loading = false,
}) {
  const [formValues, setFormValues] = useState(DEFAULT_SCHEDULE_FORM_VALUES);
  const [errors, setErrors] = useState({});

  const title = useMemo(
    () => (initialValues?.id ? "Edit Jadwal Maintenance" : "Buat Jadwal Maintenance"),
    [initialValues?.id],
  );

  useEffect(() => {
    if (open) {
      setFormValues(normalizeScheduleValues(initialValues));
      setErrors({});
    }
  }, [initialValues, open]);

  function updateField(field, value) {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateScheduleForm(formValues);

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    await onSubmit({
      asset_id: Number(formValues.asset_id),
      tanggal_jadwal: formValues.tanggal_jadwal,
      jenis_kegiatan: formValues.jenis_kegiatan,
      status: formValues.status,
      catatan: formValues.catatan.trim() || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Tetapkan jadwal maintenance untuk aset yang dipilih.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold">Aset</label>
            <Select
              value={formValues.asset_id}
              onChange={(event) => updateField("asset_id", event.target.value)}
            >
              <option value="">Pilih aset</option>
              {assetOptions.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.kode_aset} - {asset.nama_perangkat}
                </option>
              ))}
            </Select>
            {errors.asset_id ? (
              <p className="mt-1 text-xs text-destructive">{errors.asset_id}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">Tanggal jadwal</label>
            <DatePicker
              value={formValues.tanggal_jadwal}
              onChange={(value) => updateField("tanggal_jadwal", value)}
              placeholder="Pilih tanggal jadwal"
            />
            {errors.tanggal_jadwal ? (
              <p className="mt-1 text-xs text-destructive">{errors.tanggal_jadwal}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">Jenis kegiatan</label>
            <Select
              value={formValues.jenis_kegiatan}
              onChange={(event) => updateField("jenis_kegiatan", event.target.value)}
            >
              <option value="">Pilih jenis kegiatan</option>
              {ACTIVITY_OPTIONS.map((activity) => (
                <option key={activity} value={activity}>
                  {activity}
                </option>
              ))}
            </Select>
            {errors.jenis_kegiatan ? (
              <p className="mt-1 text-xs text-destructive">{errors.jenis_kegiatan}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">Status</label>
            <Select
              value={formValues.status}
              onChange={(event) => updateField("status", event.target.value)}
            >
              {SCHEDULE_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold">Catatan</label>
            <Textarea
              value={formValues.catatan}
              onChange={(event) => updateField("catatan", event.target.value)}
              placeholder="Catatan teknis atau kebutuhan persiapan maintenance."
            />
          </div>

          <div className="flex items-center justify-end gap-3 md:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan Jadwal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
