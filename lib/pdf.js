import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatAmount } from "./money";
import { prettyDate } from "./date";

// Build the client-side report from recorded sales and daily product costs.
export function buildReport({ settings, from, to, summary, byProduct, daily, dow, purchases, wastage, closingStock }) {
  const doc = new jsPDF();
  // jsPDF's built-in fonts are Latin-1 only and can't render ₹ (it turns into "¹"
  // and breaks letter spacing). Fall back to "Rs" for any non-ASCII currency.
  const raw = settings?.currency || "";
  const cur = /^[\x20-\x7E]+$/.test(raw) ? raw : "Rs ";
  const money = (p) => `${cur}${formatAmount(p)}`;
  const W = doc.internal.pageSize.getWidth();
  let y = 16;

  // 1. Header
  doc.setFontSize(16);
  doc.text(settings?.businessName || "Fish Snacks", 14, y);
  doc.setFontSize(10);
  doc.setTextColor(120);
  y += 6;
  doc.text(`Period: ${prettyDate(from)} - ${prettyDate(to)}`, 14, y);
  y += 5;
  doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 14, y);
  doc.setTextColor(0);
  y += 8;

  // 2. Executive summary
  autoTable(doc, {
    startY: y,
    head: [["Executive summary", ""]],
    body: [
      ["Revenue", money(summary.revenue)],
      ["Total recorded cost", money(summary.cogs)],
      ["Profit / loss", money(summary.netProfit)],
      ["Margin %", summary.netMargin === null ? "n/a" : `${summary.netMargin.toFixed(1)}%`],
      ["Units sold", String(summary.units)],
    ],
    theme: "striped",
    headStyles: { fillColor: [13, 148, 136] },
  });
  y = doc.lastAutoTable.finalY + 8;

  // 3. Sales by product
  autoTable(doc, {
    startY: y,
    head: [["Product", "Units", "Revenue", "Cost", "Profit", "Margin %"]],
    body: byProduct.map((r) => [
      r.name, r.units, money(r.revenue), money(r.cost), money(r.profit),
      r.margin === null ? "n/a" : `${r.margin.toFixed(1)}%`,
    ]),
    theme: "striped",
    headStyles: { fillColor: [13, 148, 136] },
  });
  y = doc.lastAutoTable.finalY + 8;

  // 4. Daily breakdown
  if (daily.length) {
    autoTable(doc, {
      startY: y,
      head: [["Date", "Revenue", "Cost", "Profit"]],
      body: daily.map((d) => [prettyDate(d.date), money(d.revenue), money(d.cost), money(d.profit)]),
      theme: "grid",
      headStyles: { fillColor: [13, 148, 136] },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // 5. Day-of-week averages
  if (dow.length) {
    autoTable(doc, {
      startY: y,
      head: [["Weekday", "Avg revenue", "Avg profit"]],
      body: dow.map((d) => [d.day, money(d.avgRevenue), money(d.avgProfit)]),
      theme: "grid",
      headStyles: { fillColor: [13, 148, 136] },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // 6. Purchases summary
  if (purchases.length) {
    autoTable(doc, {
      startY: y,
      head: [["Material", "Qty", "Spend", "Avg rate"]],
      body: purchases.map((p) => [p.name, p.qty, money(p.spend), money(p.avgRate)]),
      theme: "striped",
      headStyles: { fillColor: [13, 148, 136] },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // 7. Wastage
  if (wastage.length) {
    autoTable(doc, {
      startY: y,
      head: [["Product", "Leftover", "Wasted", "Waste value"]],
      body: wastage.map((w) => [w.name, w.leftover, w.wasted, money(w.value)]),
      theme: "grid",
      headStyles: { fillColor: [217, 119, 6] },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // 8. Closing stock
  if (closingStock.length) {
    autoTable(doc, {
      startY: y,
      head: [["Material", "Stock", "Unit"]],
      body: closingStock.map((s) => [s.name, s.stock, s.unit]),
      theme: "striped",
      headStyles: { fillColor: [13, 148, 136] },
    });
  }

  // 9. Footer with page numbers
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pages}  ·  figures as entered`, W / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });
  }

  doc.save(`fish-report-${from}_to_${to}.pdf`);
}
