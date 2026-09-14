import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('index exports every reviewed gift callable and maps GiftOperationError codes', async () => {
  const source = await readFile(new URL('../src/index.js', import.meta.url), 'utf8');
  for (const name of [
    'createGiftItem', 'updateGiftItem', 'createGiftCampaign', 'updateGiftCampaign',
    'setGiftLowStockThreshold', 'receiveGiftStock', 'createGiftAllocation',
    'confirmGiftAllocation', 'cancelGiftAllocation', 'adjustGiftStock',
    'recordGiftDistribution', 'amendGiftDistribution', 'cancelGiftDistribution',
  ]) assert.match(source, new RegExp(`export const ${name} = callable`));
  assert.match(source, /error instanceof GiftOperationError/);
});
