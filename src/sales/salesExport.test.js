import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { buildSalesWorkbook, sanitizeSpreadsheetText, salesExportFilename } from './salesExport';

const report = { totalQuantity: 12, products: [{ productId: 'bcel', name: 'BCEL One', totalQuantity: 8, percentage: 66.666, rank: 1 }], staff: [{ staffUid: 'u1', staffName: 'A', branchId: 'VTE', totalQuantity: 8, productTotals: { bcel: 8 } }], branches: [{ branchId: 'VTE', totalQuantity: 8, productTotals: { bcel: 8 } }], days: [{ dateKey: '2026-09-11', totalQuantity: 8, rows: [{ staffUid: 'u1', staffName: 'A', branchId: 'VTE', totalQuantity: 8, items: [{ productId: 'bcel', productNameSnapshot: 'BCEL One', quantity: 8 }] }] }] };
const metadata = { startKey: '2026-09-01', endKey: '2026-09-11', preset: 'custom', filters: { productId: '', staffUid: '', branchId: '' } };

describe('sales export', () => {
  it('builds exactly three approved sheets from the shared report result', () => {
    const workbook = buildSalesWorkbook(ExcelJS, report, metadata);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['ສະຫຼຸບຜະລິດຕະພັນ', 'ສະຫຼຸບທີມງານ', 'ລາຍລະອຽດລາຍວັນ']);
    expect(workbook.getWorksheet('ສະຫຼຸບຜະລິດຕະພັນ').getCell('B6').value).toBe(8);
  });
  it('prevents spreadsheet formula injection', () => {
    expect(sanitizeSpreadsheetText('=HYPERLINK("bad")')).toBe("'=HYPERLINK(\"bad\")");
    expect(sanitizeSpreadsheetText('+123')).toBe("'+123");
    expect(sanitizeSpreadsheetText('BCEL One')).toBe('BCEL One');
  });
  it('includes metadata and stable filename', () => {
    const workbook = buildSalesWorkbook(ExcelJS, report, metadata);
    expect(workbook.getWorksheet('ສະຫຼຸບຜະລິດຕະພັນ').getCell('A2').value).toContain('2026-09-01');
    expect(salesExportFilename(metadata.startKey, metadata.endKey)).toBe('sales-report-2026-09-01-to-2026-09-11.xlsx');
  });
  it('handles empty reports and daily rows', () => {
    const workbook = buildSalesWorkbook(ExcelJS, { totalQuantity: 0, products: [], staff: [], branches: [], days: [] }, metadata);
    expect(workbook.worksheets).toHaveLength(3);
    expect(workbook.getWorksheet('ລາຍລະອຽດລາຍວັນ').rowCount).toBeGreaterThan(0);
  });
});
