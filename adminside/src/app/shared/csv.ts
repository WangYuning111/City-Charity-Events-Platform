/**
 * Minimal, dependency-free CSV export.
 *
 * Two jobs are kept separate: `toCsv` turns typed rows into text, and
 * `downloadCsv` hands that text to the browser. Keeping them apart means the
 * serialisation can be reasoned about (and tested) without touching the DOM.
 */

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

/**
 * Escape one field for RFC 4180 style CSV.
 *
 * A field is quoted only when it has to be — when it contains a comma, a
 * quote or a line break — and embedded quotes are doubled. Values that start
 * with =, +, - or @ are prefixed with an apostrophe so a spreadsheet does not
 * interpret attendee input as a formula.
 */
function escapeField(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return '';

  let value = String(raw);

  if (/^[=+\-@]/.test(value)) value = `'${value}`;

  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

/** Build the CSV body, including a header row. */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((column) => escapeField(column.header)).join(',');

  const body = rows.map((row) =>
    columns.map((column) => escapeField(column.value(row))).join(',')
  );

  return [header, ...body].join('\r\n');
}

/**
 * Trigger a download in the browser.
 *
 * The UTF-8 BOM is deliberate: without it Excel assumes the system code page
 * and mangles accented and CJK characters.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Release the object URL once the browser has started the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Filename-friendly date stamp, e.g. 2026-10-17. */
export function todayStamp(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
