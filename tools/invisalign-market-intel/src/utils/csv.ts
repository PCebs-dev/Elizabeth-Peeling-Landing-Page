/** Escape a CSV field and join a row. */
export function csvRow(fields: Array<string | number | undefined | null>): string {
  return fields
    .map((f) => {
      const s = f == null ? "" : String(f);
      if (/[",\n\r]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    })
    .join(",");
}

export function csvFile(headers: string[], rows: Array<Array<string | number | undefined | null>>): string {
  return [csvRow(headers), ...rows.map(csvRow)].join("\n") + "\n";
}

export function todayStamp(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}
