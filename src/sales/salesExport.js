export function sanitizeSpreadsheetText(value) {
  const text = String(value ?? '');
  return /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
}

export function salesExportFilename(startKey, endKey) {
  return `CRM-Sales-${sanitizeSpreadsheetText(startKey)}-to-${sanitizeSpreadsheetText(endKey)}.xlsx`;
}

const text = sanitizeSpreadsheetText;
const laosTimestamp = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Vientiane', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

function timestamp(value) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : laosTimestamp.format(date);
}

function setupSheet(sheet, metadata) {
  const filters = metadata.filterLabels ?? {};
  sheet.addRow([sheet.name]);
  sheet.addRow(['ຊ່ວງວັນທີ', text(`${metadata.startKey ?? ''} – ${metadata.endKey ?? ''}`)]);
  sheet.addRow(['ຂອບເຂດ', text(metadata.scope)]);
  sheet.addRow(['ຕົວກອງ', text(`ຜະລິດຕະພັນ: ${filters.product ?? 'ທັງໝົດ'}; ພະນັກງານ: ${filters.staff ?? 'ທັງໝົດ'}; ສາຂາ: ${filters.branch ?? 'ທັງໝົດ'}`)]);
  sheet.addRow(['ຜູ້ສົ່ງອອກ', text(metadata.exporter)]);
  sheet.addRow(['ເວລາສ້າງ', `${timestamp(metadata.generatedAt)} (Asia/Vientiane)`]);
  sheet.addRow([]);
  sheet.views = [{ state: 'frozen', ySplit: 8 }];
}

function style(sheet) {
  sheet.getRow(1).font = { bold: true, size: 14 };
  sheet.getRow(8).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
  sheet.getRow(sheet.rowCount).font = { bold: true };
  sheet.columns.forEach((column) => {
    column.width = Math.max(12, Math.min(40, ...column.values.filter(Boolean).map((value) => String(value).length + 2)));
  });
  for (let row = 2; row <= 6; row += 1) {
    sheet.mergeCells(row, 2, row, Math.max(4, sheet.columnCount));
    sheet.getRow(row).alignment = { wrapText: true, vertical: 'middle' };
    sheet.getRow(row).height = row === 4 ? 42 : 30;
  }
}

export function buildSalesWorkbook(ExcelJS, report = {}, metadata = {}) {
  const workbook = new ExcelJS.Workbook();
  const productRows = report.products ?? [];
  const total = report.totalQuantity ?? 0;

  const products = workbook.addWorksheet('ສະຫຼຸບຜະລິດຕະພັນ');
  setupSheet(products, metadata);
  products.addRow(['ອັນດັບ', 'ຈຳນວນ', 'ຜະລິດຕະພັນ', 'ເປີເຊັນ']);
  productRows.forEach((row) => products.addRow([row.rank, row.totalQuantity, text(row.name), row.percentage / 100]));
  products.addRow(['ລວມ', total, '', total > 0 ? 1 : 0]);
  products.getColumn(2).numFmt = '0';
  products.getColumn(4).numFmt = '0.00%';
  style(products);

  const team = workbook.addWorksheet('ສະຫຼຸບທີມງານ');
  setupSheet(team, metadata);
  team.addRow(['ພະນັກງານ', 'ສາຂາ', ...productRows.map((product) => text(product.name)), 'ຈຳນວນ']);
  (report.staff ?? []).forEach((row) => team.addRow([
    text(row.staffName), text(row.branchId),
    ...productRows.map((product) => row.productTotals?.[product.productId] ?? 0), row.totalQuantity,
  ]));
  team.addRow(['ລວມ', '', ...productRows.map((product) => product.totalQuantity), total]);
  for (let column = 3; column <= productRows.length + 3; column += 1) team.getColumn(column).numFmt = '0';
  style(team);

  const daily = workbook.addWorksheet('ລາຍລະອຽດລາຍວັນ');
  setupSheet(daily, metadata);
  daily.addRow(['ວັນທີ', 'ພະນັກງານ', 'ສາຂາ', 'ຜະລິດຕະພັນ', 'ຈຳນວນ', 'ເວລາອັບເດດລ່າສຸດ']);
  (report.days ?? []).forEach((day) => {
    (day.rows ?? []).forEach((row) => {
      (row.items ?? []).forEach((item) => daily.addRow([
        text(day.dateKey), text(row.staffName), text(row.branchId),
        text(item.productNameSnapshot ?? item.productId), item.quantity, timestamp(row.updatedAt),
      ]));
    });
  });
  daily.addRow(['ລວມ', '', '', '', total, '']);
  daily.getColumn(5).numFmt = '0';
  style(daily);
  return workbook;
}

export async function downloadSalesWorkbook(report, metadata) {
  const excelModule = await import('exceljs');
  const ExcelJS = excelModule.default ?? excelModule;
  const workbook = buildSalesWorkbook(ExcelJS, report, metadata);
  const bytes = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = salesExportFilename(metadata.startKey, metadata.endKey);
  anchor.click();
  URL.revokeObjectURL(url);
}
