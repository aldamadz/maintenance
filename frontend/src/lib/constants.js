export const ACTIVITY_OPTIONS = [
  "cleaning",
  "perbaikan",
  "pengecekan",
  "upgrade",
  "instalasi",
  "troubleshooting",
];

export const ASSET_STATUS_OPTIONS = [
  "aktif",
  "maintenance",
  "rusak",
  "nonaktif",
];

export const SCHEDULE_STATUS_OPTIONS = [
  "terjadwal",
  "selesai",
  "dibatalkan",
];

export const DEFAULT_FORM_VALUES = {
  tanggal_maintenance: "",
  kode_aset: "",
  nama_perangkat: "",
  tipe: "",
  lokasi: "",
  jenis_kegiatan: "",
  durasi: "",
  catatan: "",
};

export const DEFAULT_ASSET_FORM_VALUES = {
  kode_aset: "",
  nama_perangkat: "",
  tipe: "",
  lokasi: "",
  status: "aktif",
};

export const DEFAULT_SCHEDULE_FORM_VALUES = {
  asset_id: "",
  tanggal_jadwal: "",
  jenis_kegiatan: "",
  status: "terjadwal",
  catatan: "",
};

export const DEFAULT_FILTERS = {
  lokasi: "",
  tahun: "",
  tanggalMulai: "",
  tanggalSelesai: "",
  jenisKegiatan: "",
  search: "",
};

export const DEFAULT_ASSET_FILTERS = {
  lokasi: "",
  status: "",
  search: "",
};

export const DEFAULT_SCHEDULE_FILTERS = {
  assetId: "",
  status: "",
};

export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
