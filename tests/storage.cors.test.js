// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('production Storage CORS contract', () => {
  it('allows only approved origins and methods required by authenticated reads, uploads, and owner avatar cleanup', async () => {
    const config = JSON.parse(await readFile('storage.cors.json', 'utf8'));
    expect(config).toHaveLength(1);
    expect(config[0].origin).toEqual([
      'https://crm-web-app-97b91.web.app',
      'https://crm-web-app-97b91.firebaseapp.com',
      'http://localhost:5173',
      'http://localhost:4173',
    ]);
    expect([...config[0].method].sort()).toEqual(['DELETE', 'GET', 'HEAD', 'POST', 'PUT']);
    expect(config[0].origin).not.toContain('*');
    expect(config[0].method).not.toContain('PATCH');
    expect(config[0].maxAgeSeconds).toBe(3600);
  });
});
