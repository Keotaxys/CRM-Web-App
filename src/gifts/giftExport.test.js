import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { buildGiftWorkbook, giftWorkbookFilename } from './giftExport';
import { buildGiftReport } from './giftReport';

const gifts = [{
  id: 'umbrella', name: 'ຄັນຮົ່ມ', sortOrder: 10, active: true,
  unitsPerPack: 10, packLabel: 'pack', unitLabel: 'unit',
}];
const stocks = [{ branchId: '010', giftId: 'umbrella', currentUnits: 20, lowStockThresholdUnits: 5 }];

function movement(movementType, deltaUnits, overrides = {}) {
  return {
    id: `${movementType}-${deltaUnits}-${Object.keys(overrides).length}`,
    movementType,
    branchId: '010',
    giftId: 'umbrella',
    giftNameSnapshot: 'ຄັນຮົ່ມ',
    deltaUnits,
    balanceBeforeUnits: 20,
    balanceAfterUnits: 19,
    dateKey: '2026-09-13',
    actorUid: 'staff-a',
    actorNameSnapshot: 'Staff A',
    actorRole: 'staff',
    distributionOwnerUid: null,
    customerId: null,
    campaignId: null,
    reason: '',
    ...overrides,
  };
}

describe('gift export', () => {
  it('creates the three approved sheets with totals equal to the report', () => {
    const report = buildGiftReport({ movements: [], stocks, gifts, filters: {} });
    const metadata = {
      startKey: '2026-09-13', endKey: '2026-09-13', exportedBy: 'Admin',
      scope: '=Branch 010', filters: { giftId: 'umbrella', staffUid: '', movementType: '' },
    };
    const workbook = buildGiftWorkbook(ExcelJS, report, metadata);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      'ສະຫຼຸບ', 'ລາຍການເຄື່ອນໄຫວ', 'Stock ປັດຈຸບັນ',
    ]);
    expect(workbook.getWorksheet('ສະຫຼຸບ').getCell('B4').value).toBe(report.receivedUnits);
    expect(JSON.stringify(workbook.getWorksheet('ສະຫຼຸບ').model)).toContain("'=Branch 010");
    expect(JSON.stringify(workbook.getWorksheet('ສະຫຼຸບ').model)).not.toContain('adjustmentUnits');
    expect(workbook.getWorksheet('Stock ປັດຈຸບັນ').getRow(2).values.slice(1)).toEqual([
      '010', 'ຄັນຮົ່ມ', 20, '2 pack 0 unit', 5, 'ປົກກະຕິ',
    ]);
  });

  it('uses the exact movement columns and escapes spreadsheet formula-like user text', () => {
    const report = buildGiftReport({
      gifts, stocks, filters: {},
      movements: [movement('distribute', -1, {
        campaignId: 'campaign-a', campaignNameSnapshot: '=HYPERLINK("x")',
        distributionOwnerUid: 'staff-a', distributionOwnerNameSnapshot: '+Staff',
        reason: '@reason',
      })],
    });
    const workbook = buildGiftWorkbook(ExcelJS, report, {
      startKey: '2026-09-13', endKey: '2026-09-13', exportedBy: 'Admin',
    });
    const movements = workbook.getWorksheet('ລາຍການເຄື່ອນໄຫວ');
    expect(movements.getRow(1).values.slice(1)).toEqual([
      'dateKey', 'movementType', 'branchId', 'giftName', 'deltaUnits', 'beforeUnits',
      'afterUnits', 'distributionOwnerName', 'actorName', 'recipientType', 'recipientName', 'reason',
    ]);
    expect(String(movements.getCell('K2').value)).toBe('\'=HYPERLINK("x")');
    expect(movements.getCell('H2').value).toBe("'+Staff");
    expect(movements.getCell('L2').value).toBe("'@reason");
  });

  it('omits inbound and adjustment fields and rows from a Staff workbook', () => {
    const report = buildGiftReport({
      gifts, stocks, filters: { canViewInbound: false }, movements: [
        movement('receive', 10), movement('adjust', -2),
        movement('distribute', -3, { distributionOwnerUid: 'staff-a' }),
      ],
    });
    const workbook = buildGiftWorkbook(ExcelJS, report, {
      startKey: '2026-09-13', endKey: '2026-09-13', exportedBy: 'Staff A',
    });
    const serialized = JSON.stringify(workbook.model);
    expect(serialized).not.toContain('ຍອດຮັບ');
    expect(serialized).not.toContain('adjust');
    expect(serialized).not.toContain('receive');
    expect(workbook.getWorksheet('ລາຍການເຄື່ອນໄຫວ').rowCount).toBe(2);
    expect(workbook.getWorksheet('ສະຫຼຸບ').getCell('B4').value).toBe(3);
  });

  it('builds the approved filename from a strict range', () => {
    expect(giftWorkbookFilename({ startKey: '2026-09-01', endKey: '2026-09-30' }))
      .toBe('CRM-Gift-Inventory-2026-09-01-to-2026-09-30.xlsx');
    expect(() => giftWorkbookFilename({ startKey: '=bad', endKey: '2026-09-30' }))
      .toThrow(/date/i);
  });

  it('exports inactive zero-stock history without a low-stock count or status', () => {
    const report = buildGiftReport({ gifts: [{ ...gifts[0], active: false }],
      stocks: [{ ...stocks[0], currentUnits: 0 }], movements: [movement('distribute', -20)] });
    const workbook = buildGiftWorkbook(ExcelJS, report, { startKey: '2026-09-13', endKey: '2026-09-13' });
    expect(workbook.getWorksheet('ສະຫຼຸບ').getCell('B7').value).toBe(0);
    expect(workbook.getWorksheet('Stock ປັດຈຸບັນ').getCell('F2').value).toBe('ປົກກະຕິ');
    expect(workbook.getWorksheet('ລາຍການເຄື່ອນໄຫວ').getCell('E2').value).toBe(-20);
  });

  it('fits the longest cell up to 40 and keeps long formula-like text wrapped and sanitized', () => {
    const report = buildGiftReport({ gifts, stocks, movements: [movement('distribute', -1, {
      giftNameSnapshot: 'A moderately long gift name', reason: `=${'long reason '.repeat(8)}`,
    })] });
    const workbook = buildGiftWorkbook(ExcelJS, report, { startKey: '2026-09-13', endKey: '2026-09-13' });
    const sheet = workbook.getWorksheet('ລາຍການເຄື່ອນໄຫວ');
    expect(sheet.getColumn(4).width).toBe(29);
    expect(sheet.getColumn(12).width).toBe(40);
    expect(sheet.getCell('L2').value).toBe(`'=${'long reason '.repeat(8)}`);
    expect(sheet.getCell('L2').alignment.wrapText).toBe(true);
    expect(sheet.getCell('L1').alignment.wrapText).toBe(true);
  });
});
