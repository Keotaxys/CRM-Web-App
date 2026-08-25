import { describe, expect, it } from 'vitest';
import { BRANCHES, branchIdFromLegacy, branchName } from './branches';

describe('legacy branch mapping', () => {
  it('preserves all 22 existing branch codes without renumbering', () => {
    expect(BRANCHES).toHaveLength(22);
    expect(BRANCHES.map((branch) => branch.id)).toEqual([
      '010', '019', '020', '030', '040', '050', '060', '070', '080', '090', '110',
      '120', '130', '140', '150', '160', '170', '180', '190', '200', '210', '220',
    ]);
  });

  it('maps exact legacy labels and code-only values to canonical IDs', () => {
    expect(branchIdFromLegacy('010 - ສຳນັກງານໃຫຍ່')).toBe('010');
    expect(branchIdFromLegacy('220 - ສາຂາ ໄຊເສດຖາ')).toBe('220');
    expect(branchIdFromLegacy('030')).toBe('030');
    expect(branchName('020')).toBe('020 - ສາຂາ ຄຳມ່ວນ');
  });

  it('never infers Admin or unknown text as a branch', () => {
    expect(branchIdFromLegacy('Admin')).toBeNull();
    expect(branchIdFromLegacy('999 - Unknown')).toBeNull();
  });
});
