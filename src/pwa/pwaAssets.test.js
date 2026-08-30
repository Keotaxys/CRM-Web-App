import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const productionOrigin = 'https://crm.keotasystem.com/';
const manifestPath = resolve('public/manifest.webmanifest');

function parseIndexHead() {
  const html = readFileSync(resolve('index.html'), 'utf8');
  return new DOMParser().parseFromString(html, 'text/html').head;
}

function readPngSize(path) {
  const png = readFileSync(resolve(path));
  const signature = [...png.subarray(0, 8)];

  expect(signature).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
  };
}

describe('installed CRM web app contract', () => {
  it('publishes the iPhone and PWA metadata from the application head', () => {
    const head = parseIndexHead();
    const viewport = head.querySelector('meta[name="viewport"]');

    expect(viewport?.content).toContain('viewport-fit=cover');
    expect(head.querySelector('link[rel="manifest"]')?.getAttribute('href')).toBe('/manifest.webmanifest');
    expect(head.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href')).toBe('/apple-touch-icon.png');
    expect(head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(productionOrigin);
    expect(head.querySelector('meta[name="theme-color"]')?.content).toBe('#115e59');
    expect(head.querySelector('meta[name="mobile-web-app-capable"]')?.content).toBe('yes');
    expect(head.querySelector('meta[name="apple-mobile-web-app-capable"]')?.content).toBe('yes');
    expect(head.querySelector('meta[name="apple-mobile-web-app-title"]')?.content).toBe('Keota CRM');
    expect(head.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.content).toBe('black-translucent');
  });

  it('opens the installed standalone app on the CRM production origin', () => {
    expect(existsSync(manifestPath)).toBe(true);
    if (!existsSync(manifestPath)) return;

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

    expect(manifest).toMatchObject({
      id: '/',
      name: 'Keota CRM',
      short_name: 'CRM',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#f8fafc',
      theme_color: '#115e59',
    });
    expect(new URL(manifest.start_url, productionOrigin).href).toBe(productionOrigin);
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }),
      expect.objectContaining({ src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }),
      expect.objectContaining({ src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }),
    ]));
  });

  it.each([
    ['public/apple-touch-icon.png', 180],
    ['public/pwa-192x192.png', 192],
    ['public/pwa-512x512.png', 512],
    ['public/pwa-maskable-512x512.png', 512],
  ])('ships %s as a square %ipx PNG', (path, size) => {
    expect(existsSync(resolve(path))).toBe(true);
    if (!existsSync(resolve(path))) return;

    expect(readPngSize(path)).toEqual({ width: size, height: size });
  });
});
