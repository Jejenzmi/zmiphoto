
export interface ReportRow {
  [key: string]: string | number;
}

export const exportToCSV = (
  headers: string[],
  rows: ReportRow[],
  filename: string
) => {
  const keys = Object.keys(rows[0] || {});
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      keys.map((k) => `"${String(row[k] ?? "").replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportToPDF = (
  title: string,
  subtitle: string,
  headers: string[],
  rows: ReportRow[],
  summaryItems?: { label: string; value: string }[]
) => {
  const keys = Object.keys(rows[0] || {});
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a1a; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .subtitle { color: #666; font-size: 13px; margin-bottom: 24px; }
  .summary { display: flex; gap: 24px; margin-bottom: 24px; flex-wrap: wrap; }
  .summary-item { background: #f5f5f5; padding: 12px 16px; border-radius: 8px; min-width: 140px; }
  .summary-item .label { font-size: 11px; color: #888; }
  .summary-item .value { font-size: 18px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #f0f0f0; text-align: left; padding: 8px 12px; font-weight: 600; border-bottom: 2px solid #ddd; }
  td { padding: 8px 12px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) { background: #fafafa; }
  .footer { margin-top: 32px; font-size: 10px; color: #aaa; text-align: center; }
  @media print { body { padding: 20px; } }
</style></head><body>
  <h1>${title}</h1>
  <div class="subtitle">${subtitle}</div>
  ${summaryItems ? `<div class="summary">${summaryItems.map(s => `<div class="summary-item"><div class="label">${s.label}</div><div class="value">${s.value}</div></div>`).join("")}</div>` : ""}
  <table>
    <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${keys.map((k) => `<td>${r[k] ?? ""}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>
  <div class="footer">Dicetak pada ${new Date().toLocaleString("id-ID")} • ZMI Photo Booth</div>
</body></html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    win.setTimeout(() => win.print(), 500);
  }
};
