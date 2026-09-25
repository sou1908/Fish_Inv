// Minimal CSV builder + browser download.

function escape(v) {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers, rows) {
  const head = headers.map(escape).join(",");
  const body = rows.map((r) => r.map(escape).join(",")).join("\n");
  return `${head}\n${body}`;
}

export function download(filename, text, type = "text/csv;charset=utf-8") {
  const blob = new Blob(["\uFEFF", text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
