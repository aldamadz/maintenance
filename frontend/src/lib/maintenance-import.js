import { format } from "date-fns";
import { resolveAssetCode } from "@/lib/asset-code";

function normalizeHeader(header) {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replaceAll(/\s+/g, "_");
}

function excelSerialToDate(value, XLSX) {
  const parsed = XLSX.SSF.parse_date_code(value);
  if (!parsed) {
    throw new Error(`Nilai tanggal Excel tidak valid: ${value}`);
  }

  return format(
    new Date(parsed.y, parsed.m - 1, parsed.d),
    "yyyy-MM-dd",
  );
}

function normalizeDate(value, XLSX) {
  if (value === null || value === undefined || value === "") {
    throw new Error("Tanggal maintenance wajib diisi.");
  }

  if (typeof value === "number") {
    return excelSerialToDate(value, XLSX);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Format tanggal tidak dikenali: ${value}`);
  }

  return format(date, "yyyy-MM-dd");
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  if (isPlaceholderText(text)) {
    return null;
  }

  return text;
}

function isPlaceholderText(value) {
  const text = String(value ?? "").trim();
  return !text || text === "-" || text === "–" || text === "—";
}

function isPlanningNote(value) {
  return isPlaceholderText(value);
}

function normalizeStatus(value, planning) {
  const text = normalizeText(value)?.toLowerCase();

  if (["planning", "rencana", "terjadwal", "planned"].includes(text)) {
    return "planning";
  }

  if (["selesai", "done", "completed"].includes(text)) {
    return "selesai";
  }

  return planning ? "planning" : "selesai";
}

function normalizeRequiredText(value, fieldLabel) {
  const text = normalizeText(value);
  if (!text) {
    throw new Error(`${fieldLabel} wajib diisi.`);
  }

  return text;
}

function parseDurationToMinutes(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  const text = String(value).trim().toLowerCase();
  if (!text || text === "-") {
    return null;
  }

  let total = 0;
  const jamMatch = text.match(/(\d+)\s*jam/);
  const menitMatch = text.match(/(\d+)\s*menit/);

  if (jamMatch) {
    total += Number(jamMatch[1]) * 60;
  }

  if (menitMatch) {
    total += Number(menitMatch[1]);
  }

  if (!total && /^\d+$/.test(text)) {
    total = Number(text);
  }

  return total || null;
}

function mapRow(rawRow, XLSX) {
  const row = Object.fromEntries(
    Object.entries(rawRow).map(([key, value]) => [normalizeHeader(key), value]),
  );
  const planning = isPlanningNote(row.catatan);
  const status = normalizeStatus(row.status, planning);

  return {
    tanggal_maintenance: normalizeDate(row.tanggal_maintenance, XLSX),
    nama_perangkat: normalizeRequiredText(row.nama_perangkat, "Nama perangkat"),
    tipe: normalizeText(row.tipe),
    lokasi: normalizeText(row.lokasi),
    kode_aset: resolveAssetCode({
      kodeAset: row.kode_aset,
      namaPerangkat: row.nama_perangkat,
      lokasi: row.lokasi,
      tipe: row.tipe,
    }),
    jenis_kegiatan: normalizeText(row.jenis_kegiatan),
    durasi: parseDurationToMinutes(row.durasi),
    status,
    catatan: status === "planning" ? null : normalizeText(row.catatan),
  };
}

export async function parseMaintenanceWorkbook(file) {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.SheetNames[0];

  if (!firstSheet) {
    throw new Error("Workbook Excel tidak memiliki sheet.");
  }

  const sheet = workbook.Sheets[firstSheet];
  const rawRows = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: true,
  });

  if (!rawRows.length) {
    throw new Error("File Excel kosong.");
  }

  const rows = [];
  const errors = [];

  rawRows.forEach((rawRow, index) => {
    try {
      rows.push(mapRow(rawRow, XLSX));
    } catch (error) {
      errors.push(`Baris ${index + 2}: ${error.message}`);
    }
  });

  return {
    rows,
    errors,
    totalRows: rawRows.length,
    planningRows: rows.filter((row) => row.status === "planning").length,
  };
}
