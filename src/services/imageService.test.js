import { describe, expect, it } from 'vitest';
import { validateImageFile } from './imageService';
import { readFileSync } from 'node:fs';

function file(size, type = 'image/jpeg') {
  return new File([new Uint8Array(size)], 'photo.jpg', { type });
}

describe('image validation', () => {
  it('accepts supported image MIME types within the server limit', () => {
    expect(validateImageFile(file(1_000_000))).toEqual({ valid: true, error: null });
    expect(validateImageFile(file(100, 'image/webp')).valid).toBe(true);
  });

  it('rejects non-images and files over one megabyte', () => {
    expect(validateImageFile(file(10, 'text/plain')).error).toMatch(/image/i);
    expect(validateImageFile(file(1_000_001)).error).toMatch(/1 MB/i);
  });

  it('does not create bearer download-token URLs for managed uploads', () => {
    const source = readFileSync('src/services/imageService.js', 'utf8');
    expect(source).not.toContain('getDownloadURL');
    expect(source).toContain('fullPath');
  });
});
