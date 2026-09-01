import { beforeEach, describe, expect, it, vi } from 'vitest';

const storageMocks = vi.hoisted(() => ({
  deleteObject: vi.fn(),
  ref: vi.fn((_, path) => ({ fullPath: path })),
  uploadBytes: vi.fn(),
}));

vi.mock('firebase/storage', () => storageMocks);
vi.mock('../firebase/config', () => ({ storage: { bucket: 'crm-images' } }));

import * as imageService from './imageService';

function file(size, type = 'image/jpeg', name = 'photo.jpg') {
  return new File([new Uint8Array(size)], name, { type });
}

describe('image preprocessing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the normal pass near 1600px and quality 0.8 without forcing a 0.5 MB target', async () => {
    const source = file(8_000_000);
    const prepared = file(900_000);
    const compressor = vi.fn().mockResolvedValue(prepared);

    const result = await imageService.prepareImage(source, { compressor });

    expect(result).toBe(prepared);
    expect(compressor).toHaveBeenCalledWith(source, expect.objectContaining({
      maxSizeMB: 0.95,
      maxWidthOrHeight: 1600,
      initialQuality: 0.8,
      useWebWorker: true,
    }));
  });

  it.each([
    ['HEIC', 'image/heic', 'iphone.heic'],
    ['HEIF', 'image/heif', 'iphone.heif'],
  ])('converts %s input to JPEG before compression', async (_, type, name) => {
    const heic = file(6_000_000, type, name);
    const converted = new Blob([new Uint8Array(2_000_000)], { type: 'image/jpeg' });
    const prepared = file(850_000, 'image/jpeg', 'iphone.jpg');
    const heicConverter = vi.fn().mockResolvedValue(converted);
    const compressor = vi.fn().mockResolvedValue(prepared);

    const result = await imageService.prepareImage(heic, { compressor, heicConverter });

    expect(heicConverter).toHaveBeenCalledWith(expect.objectContaining({
      blob: heic,
      toType: 'image/jpeg',
    }));
    expect(compressor.mock.calls[0][0]).toEqual(expect.objectContaining({
      name: 'iphone.jpg',
      type: 'image/jpeg',
    }));
    expect(result).toBe(prepared);
  });

  it('uses one reasonable fallback when the normal pass is still over the Storage limit', async () => {
    const source = file(8_000_000);
    const tooLarge = file(1_100_000);
    const fallback = file(780_000);
    const compressor = vi.fn()
      .mockResolvedValueOnce(tooLarge)
      .mockResolvedValueOnce(fallback);

    const result = await imageService.prepareImage(source, { compressor });

    expect(result).toBe(fallback);
    expect(compressor).toHaveBeenCalledTimes(2);
    expect(compressor.mock.calls[1][1]).toEqual(expect.objectContaining({
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1400,
      initialQuality: 0.75,
    }));
  });

  it('rejects unsupported source files before attempting compression', async () => {
    const compressor = vi.fn();

    await expect(imageService.prepareImage(file(10, 'text/plain', 'notes.txt'), { compressor }))
      .rejects.toThrow(/supported image/i);

    expect(compressor).not.toHaveBeenCalled();
  });
});

describe('managed image upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts supported processed image MIME types within the server limit', () => {
    expect(imageService.validateImageFile(file(1_000_000))).toEqual({ valid: true, error: null });
    expect(imageService.validateImageFile(file(100, 'image/webp')).valid).toBe(true);
  });

  it('rejects non-images and processed files over one megabyte', () => {
    expect(imageService.validateImageFile(file(10, 'text/plain')).error).toMatch(/image/i);
    expect(imageService.validateImageFile(file(1_000_001)).error).toMatch(/1 MB/i);
  });

  it('uploads an already-prepared file without recompressing and returns only its managed path', async () => {
    const prepared = file(800_000, 'image/jpeg', 'prepared.jpg');
    storageMocks.uploadBytes.mockResolvedValue({
      ref: { fullPath: 'customers/c1/customer-photo' },
    });

    const result = await imageService.uploadPreparedImage('customers/c1/customer-photo', prepared);

    expect(storageMocks.uploadBytes).toHaveBeenCalledWith(
      { fullPath: 'customers/c1/customer-photo' },
      prepared,
      { contentType: 'image/jpeg' },
    );
    expect(result).toEqual({ path: 'customers/c1/customer-photo' });
  });
});
