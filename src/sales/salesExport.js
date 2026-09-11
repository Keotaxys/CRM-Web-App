export function sanitizeSpreadsheetText(value) {
  const text = String(value ?? '');
  return /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
}

export function salesExportFilename(startKey, endKey) {
  return `sales-report-${sanitizeSpreadsheetText(startKey)}-to-${sanitizeSpreadsheetText(endKey)}.xlsx`;
}

function setupSheet(sheet, title, metadata) {
  sheet.addRow([title]);
  sheet.addRow([`ຊ່ວງວັນທີ: ${metadata?.startKey ?? ''} – ${metadata?.endKey ?? ''}`]);
  sheet.addRow([]); sheet.addRow([]);
  sheet.views = [{ state: 'frozen', ySplit: 5 }];
}
function text(value) { return sanitizeSpreadsheetText(value); }
function style(sheet) {
  sheet.getRow(1).font = { bold: true, size: 14 };
  sheet.getRow(5).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
  sheet.columns.forEach((column) => { column.width = Math.max(12, Math.min(32, ...column.values.filter(Boolean).map((v) => String(v).length + 2))); });
}

export function buildSalesWorkbook(ExcelJS, report = {}, metadata = {}) {
  const workbook = new ExcelJS.Workbook();
  const products = workbook.addWorksheet('ສະຫຼຸບຜະລິດຕະພັນ');
  setupSheet(products, 'ສະຫຼຸບຜະລິດຕະພັນ', metadata);
  products.addRow(['ອັນດັບ', 'ຈຳນວນ', 'ຜະລິດຕະພັນ', 'ເປີເຊັນ']);
  (report.products ?? []).forEach((row) => products.addRow([row.rank, row.totalQuantity, text(row.name), row.percentage / 100]));
  products.getColumn(4).numFmt = '0.00%'; style(products);

  const staff = workbook.addWorksheet('ສະຫຼຸບທີມງານ'); setupSheet(staff, 'ສະຫຼຸບທີມງານ', metadata);
  staff.addRow(['ພະນັກງານ', 'ສາຂາ', 'ຈຳນວນ']);
  (report.staff ?? []).forEach((row) => staff.addRow([text(row.staffName), text(row.branchId), row.totalQuantity])); style(staff);

  const daily = workbook.addWorksheet('ລາຍລະອຽດລາຍວັນ'); setupSheet(daily, 'ລາຍລະອຽດລາຍວັນ', metadata);
  daily.addRow(['ວັນທີ', 'ພະນັກງານ', 'ສາຂາ', 'ຜະລິດຕະພັນ', 'ຈຳນວນ']);
  (report.days ?? []).forEach((day) => (day.rows ?? []).forEach((row) => (row.items ?? []).forEach((item) => daily.addRow([text(day.dateKey), text(row.staffName), text(row.branchId), text(item.productNameSnapshot ?? item.productId), item.quantity]))));
  style(daily);
  return workbook;
}

export async function downloadSalesWorkbook(report, metadata) {
  const excelModule = await import('exceljs');
  const ExcelJS = excelModule.default ?? excelModule;
  const workbook = buildSalesWorkbook(ExcelJS, report, metadata);
  const bytes = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = salesExportFilename(metadata.startKey, metadata.endKey); anchor.click(); URL.revokeObjectURL(url);
}
