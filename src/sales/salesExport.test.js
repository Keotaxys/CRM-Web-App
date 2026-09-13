import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { buildSalesWorkbook, sanitizeSpreadsheetText, salesExportFilename } from './salesExport';
import { buildSalesReport } from './salesReport';

const products = [{ id: 'bcel', name: 'BCEL', sortOrder: 1 }, { id: 'atm', name: '=ATM', sortOrder: 2 }];
const records = [
  { id: 'd1', dateKey: '2026-09-11', staffUid: 'a', staffNameSnapshot: '=Alice', branchId: '010', updatedAt: new Date('2026-09-11T17:01:02Z'),
    items: [{ productId: 'bcel', productNameSnapshot: 'BCEL', quantity: 5 }, { productId: 'atm', productNameSnapshot: '=ATM', quantity: 2 }] },
  { id: 'd2', dateKey: '2026-09-11', staffUid: 'b', staffNameSnapshot: 'Bob', branchId: '010', updatedAt: new Date('2026-09-11T10:00:00Z'),
    items: [{ productId: 'bcel', productNameSnapshot: 'BCEL', quantity: 3 }] },
  { id: 'd3', dateKey: '2026-09-11', staffUid: 'c', staffNameSnapshot: 'Outside', branchId: '019',
    items: [{ productId: 'atm', productNameSnapshot: '=ATM', quantity: 99 }] },
];
const metadata = {
  startKey: '2026-09-01', endKey: '2026-09-11', scope: 'ສາຂາ 010',
  filterLabels: { product: 'ທັງໝົດ', staff: 'ທັງໝົດ', branch: '010' },
  exporter: '=Manager', generatedAt: new Date('2026-09-11T17:02:03Z'),
};

describe('sales export', () => {
  it.each([
    ['staff', (row) => row.staffUid === 'a', 7, [5, 2]],
    ['manager', (row) => row.branchId === '010', 10, [8, 2]],
    ['admin filtered branch', (row) => row.branchId === '010', 10, [8, 2]],
  ])('exports consistent scoped %s totals and per-product team columns', (_role, filter, total, productTotals) => {
    const report = buildSalesReport(records.filter(filter), products);
    expect(report.totalQuantity).toBe(total);
    const workbook = buildSalesWorkbook(ExcelJS, report, metadata);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['ສະຫຼຸບຜະລິດຕະພັນ', 'ສະຫຼຸບທີມງານ', 'ລາຍລະອຽດລາຍວັນ']);
    const [summary, team, daily] = workbook.worksheets;
    expect(team.getRow(8).values.slice(1)).toEqual(['ພະນັກງານ', 'ສາຂາ', 'BCEL', "'=ATM", 'ຈຳນວນ']);
    expect(team.getRow(team.rowCount).values.slice(3)).toEqual([...productTotals, total]);
    expect(summary.getCell(`B${summary.rowCount}`).value).toBe(total);
    expect(daily.getCell(`E${daily.rowCount}`).value).toBe(total);
    expect(daily.getCell('F8').value).toBe('ເວລາອັບເດດລ່າສຸດ');
    expect(daily.getCell('F9').value).toBe('12/09/2026, 00:01:02');
    expect(JSON.stringify(workbook.model)).not.toContain('Outside');
  });

  it('preserves update time in shared day rows and includes sanitized provenance on every sheet', () => {
    const report = buildSalesReport([records[0]], products);
    expect(report.days[0].rows[0].updatedAt).toEqual(new Date('2026-09-11T17:01:02Z'));
    const workbook = buildSalesWorkbook(ExcelJS, report, metadata);
    for (const sheet of workbook.worksheets) {
      expect(sheet.getCell('B2').value).toBe('2026-09-01 – 2026-09-11');
      expect(sheet.getCell('B3').value).toBe('ສາຂາ 010');
      expect(sheet.getCell('B4').value).toContain('010');
      expect(sheet.getCell('B5').value).toBe("'=Manager");
      expect(sheet.getCell('B6').value).toBe('12/09/2026, 00:02:03 (Asia/Vientiane)');
      expect(sheet.views[0].ySplit).toBe(8);
    }
    expect(salesExportFilename(metadata.startKey, metadata.endKey)).toBe('CRM-Sales-2026-09-01-to-2026-09-11.xlsx');
  });

  it('exports product-filtered quantities from the same shared result', () => {
    const filtered = records.filter((row) => row.branchId === '010')
      .map((row) => ({ ...row, items: row.items.filter((item) => item.productId === 'bcel') }));
    const report = buildSalesReport(filtered, [products[0]]);
    const workbook = buildSalesWorkbook(ExcelJS, report, { ...metadata, filterLabels: { product: 'BCEL', staff: 'ທັງໝົດ', branch: '010' } });
    expect(report.totalQuantity).toBe(8);
    expect(workbook.worksheets[1].getRow(8).values.slice(1)).toEqual(['ພະນັກງານ', 'ສາຂາ', 'BCEL', 'ຈຳນວນ']);
    expect(workbook.worksheets[0].getCell('B10').value).toBe(8);
    expect(workbook.worksheets[2].getCell('E11').value).toBe(8);
  });

  it('writes an explicit zero total on all three empty sheets', () => {
    const workbook = buildSalesWorkbook(ExcelJS, buildSalesReport([], []), metadata);
    for (const [index, totalColumn] of [[0, 2], [1, 3], [2, 5]]) {
      const sheet = workbook.worksheets[index];
      expect(sheet.getRow(9).getCell(1).value).toBe('ລວມ');
      expect(sheet.getRow(9).getCell(totalColumn).value).toBe(0);
    }
  });

  it.each(['=SUM(A1)', '+123', '-1', '@value', '  =formula'])('sanitizes formula-like text %s', (value) => {
    expect(sanitizeSpreadsheetText(value)).toBe(`'${value}`);
  });
});
