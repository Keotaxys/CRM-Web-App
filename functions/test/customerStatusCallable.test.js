import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('index exposes changeCustomerStatus through the authenticated callable wrapper', async () => {
  const source = await readFile(
    new URL('../src/index.js', import.meta.url),
    'utf8',
  );

  assert.match(
    source,
    /changeCustomerStatusOperation/,
    'index.js must import changeCustomerStatusOperation',
  );

  assert.match(
    source,
    /export const changeCustomerStatus\s*=\s*callable\(changeCustomerStatusOperation\)/,
    'index.js must export the authenticated changeCustomerStatus callable',
  );
});
