// Basit CSV export yardımcıları (UI'lar tarafından kullanılacak)
export type CSVRow = Record<string, string | number | boolean | null | undefined>;

function escapeCSV(value: any): string {
  if (value == null) return '';
  const s = String(value);
  // Eğer özel karakter içeriyorsa tırnakla
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCSV(rows: CSVRow[], headers?: string[]): string {
  if (!rows || rows.length === 0) return '';
  const keys = headers && headers.length ? headers : Object.keys(rows[0] || {});
  const head = keys.map(escapeCSV).join(',');
  const body = rows
    .map((r) => keys.map((k) => escapeCSV(r[k])).join(','))
    .join('\n');
  return head + '\n' + body;
}

export function downloadCSV(filename: string, csv: string) {
  if (typeof window === 'undefined') return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.setAttribute('download', filename);
  a.click();
  URL.revokeObjectURL(url);
}