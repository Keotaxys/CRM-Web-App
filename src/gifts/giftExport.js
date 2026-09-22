import { sanitizeSpreadsheetText } from '../shared/spreadsheet';
import { giftDateRange } from './giftReport';

const text = sanitizeSpreadsheetText;
const MOVEMENT_HEADERS = [
  'dateKey', 'movementType', 'branchId', 'giftName', 'deltaUnits', 'beforeUnits',
  'afterUnits', 'distributionOwnerName', 'actorName', 'recipientType', 'recipientName', 'reason',
];

function styleHeader(row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
  row.alignment = { wrapText: true, vertical: 'middle' };
}

function fitColumns(sheet) {
  sheet.columns.forEach((column) => {
    const lengths = column.values.filter((value) => value != null)
      .map((value) => String(value).length + 2);
    column.width = Math.min(40, Math.max(12, ...lengths));
    column.eachCell((cell) => { cell.alignment = { ...cell.alignment, wrapText: true }; });
  });
}

function table(sheet, title, headers, rows) {
  sheet.addRow([]);
  const titleRow = sheet.addRow([title]);
  titleRow.font = { bold: true };
  const header = sheet.addRow(headers);
  styleHeader(header);
  rows.forEach((row) => sheet.addRow(row));
}

function summaryRows(report) {
  const inbound = report.canViewInbound ? ['receivedUnits'] : [];
  return (report.gifts ?? []).map((gift) => [
    text(gift.giftName), text(gift.giftId),
    ...inbound.map((field) => gift[field] ?? 0),
    gift.distributedUnits ?? 0, gift.currentUnits ?? 0,
    gift.lowStockCount > 0 ? 'ສິນຄ້າໃກ້ໝົດ' : 'ປົກກະຕິ',
  ]);
}

function addSummarySheet(workbook, report, metadata) {
  const sheet = workbook.addWorksheet('ສະຫຼຸບ');
  const range = giftDateRange('custom', metadata.startKey, metadata);
  sheet.addRow(['ສະຫຼຸບ']);
  sheet.addRow(['ຊ່ວງວັນທີ', text(`${range.startKey} – ${range.endKey}`)]);
  sheet.addRow(['ຜູ້ສົ່ງອອກ', text(metadata.exportedBy)]);
  if (report.canViewInbound) sheet.addRow(['ຍອດຮັບ', report.receivedUnits]);
  sheet.addRow(['ຍອດແຈກສຸດທິ', report.distributedUnits]);
  sheet.addRow(['Stock ປັດຈຸບັນ', report.currentUnits]);
  sheet.addRow(['ລາຍການ low-stock', report.lowStockCount]);
  sheet.addRow(['ຂອບເຂດ', text(metadata.scope)]);
  const filterText = Object.entries(metadata.filters ?? {})
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ') || 'ທັງໝົດ';
  sheet.addRow(['ຕົວກອງ', text(filterText)]);
  if (metadata.generatedAt) {
    const generatedAt = metadata.generatedAt instanceof Date
      ? metadata.generatedAt : new Date(metadata.generatedAt);
    sheet.addRow(['ເວລາສ້າງ', Number.isNaN(generatedAt.getTime()) ? '—' : generatedAt.toISOString()]);
  }

  const giftHeaders = ['giftName', 'giftId'];
  if (report.canViewInbound) giftHeaders.push('receivedUnits');
  giftHeaders.push('distributedUnits', 'currentUnits', 'lowStockStatus');
  table(sheet, 'ສະຫຼຸບຕາມ gift', giftHeaders, summaryRows(report));
  table(sheet, 'ສະຫຼຸບຕາມ branch', ['branchId', 'distributedUnits', 'currentUnits'],
    (report.branches ?? []).map((row) => [text(row.branchId), row.distributedUnits, row.currentUnits]));
  table(sheet, 'ສະຫຼຸບຕາມ staff', ['staffName', 'branchId', 'distributedUnits'],
    (report.staff ?? []).map((row) => [text(row.staffName), text(row.branchId), row.distributedUnits]));
  table(sheet, 'ສະຫຼຸບຕາມ customer', ['customerName', 'distributedUnits'],
    (report.customers ?? []).map((row) => [text(row.customerName), row.distributedUnits]));
  table(sheet, 'ສະຫຼຸບຕາມ Campaign', ['campaignName', 'distributedUnits'],
    (report.campaigns ?? []).map((row) => [text(row.campaignName), row.distributedUnits]));
  sheet.getRow(1).font = { bold: true, size: 14 };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  fitColumns(sheet);
}

function addMovementSheet(workbook, report) {
  const sheet = workbook.addWorksheet('ລາຍການເຄື່ອນໄຫວ');
  styleHeader(sheet.addRow(MOVEMENT_HEADERS));
  (report.movements ?? []).forEach((row) => sheet.addRow([
    text(row.dateKey), text(row.movementType), text(row.branchId), text(row.giftName),
    row.deltaUnits, row.beforeUnits, row.afterUnits, text(row.distributionOwnerName),
    text(row.actorName), text(row.recipientType), text(row.recipientName), text(row.reason),
  ]));
  for (const column of [5, 6, 7]) sheet.getColumn(column).numFmt = '0';
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: 'A1', to: 'L1' };
  fitColumns(sheet);
}

function stockDisplay(stock) {
  if (!Number.isSafeInteger(stock.unitsPerPack) || stock.unitsPerPack < 1) return '—';
  const packs = Math.floor(stock.currentUnits / stock.unitsPerPack);
  const looseUnits = stock.currentUnits % stock.unitsPerPack;
  return `${packs} ${stock.packLabel ?? ''} ${looseUnits} ${stock.unitLabel ?? ''}`
    .trim().replace(/\s+/g, ' ');
}

function addStockSheet(workbook, report) {
  const sheet = workbook.addWorksheet('Stock ປັດຈຸບັນ');
  styleHeader(sheet.addRow([
    'branchId', 'giftName', 'currentUnits', 'packAndLooseUnits',
    'lowStockThresholdUnits', 'lowStockStatus',
  ]));
  (report.stocks ?? []).forEach((stock) => sheet.addRow([
    text(stock.branchId), text(stock.giftName), stock.currentUnits, text(stockDisplay(stock)),
    stock.lowStockThresholdUnits, stock.lowStock ? 'ສິນຄ້າໃກ້ໝົດ' : 'ປົກກະຕິ',
  ]));
  sheet.getColumn(3).numFmt = '0';
  sheet.getColumn(5).numFmt = '0';
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: 'A1', to: 'F1' };
  fitColumns(sheet);
}

export function buildGiftWorkbook(ExcelJS, report, metadata) {
  if (!ExcelJS?.Workbook) throw new Error('ExcelJS Workbook is required');
  if (!report || typeof report !== 'object') throw new Error('Gift report is required');
  const workbook = new ExcelJS.Workbook();
  addSummarySheet(workbook, report, metadata ?? {});
  addMovementSheet(workbook, report);
  addStockSheet(workbook, report);
  return workbook;
}

export function giftWorkbookFilename(range) {
  const valid = giftDateRange('custom', range?.startKey, range ?? {});
  return `CRM-Gift-Inventory-${valid.startKey}-to-${valid.endKey}.xlsx`;
}

export async function downloadGiftWorkbook(report, metadata) {
  const excelModule = await import('exceljs');
  const ExcelJS = excelModule.default ?? excelModule;
  const workbook = buildGiftWorkbook(ExcelJS, report, metadata);
  const bytes = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob(
    [bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  ));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = giftWorkbookFilename(metadata);
  anchor.click();
  URL.revokeObjectURL(url);
}
