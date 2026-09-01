import { beforeEach, describe, expect, it, vi } from 'vitest';

const storageMocks = vi.hoisted(() => ({
  deleteObject: vi.fn(),
  ref: vi.fn((_, path) => ({ fullPath: path })),
  uploadBytes: vi.fn(),
  uploadBytesResumable: vi.fn(),
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

  it('skips compression for an already-supported image within 5 MB', async () => {
    const source = file(4_000_000, 'image/jpeg', 'photo.jpg');
    const compressor = vi.fn();

    const result = await imageService.prepareImage(source, { compressor });

    expect(result).toBe(source);
    expect(compressor).not.toHaveBeenCalled();
  });

  it('compresses an oversized image once using the larger mobile-friendly budget', async () => {
    const source = file(8_000_000);
    const prepared = file(4_500_000);
    const compressor = vi.fn().mockResolvedValue(prepared);

    const result = await imageService.prepareImage(source, { compressor });

    expect(result).toBe(prepared);
    expect(compressor).toHaveBeenCalledTimes(1);
    expect(compressor).toHaveBeenCalledWith(
      source,
      expect.objectContaining({
        maxSizeMB: 4.5,
        maxWidthOrHeight: 1800,
        initialQuality: 0.82,
        useWebWorker: true,
        fileType: 'image/jpeg',
      }),
    );
  });

  it.each([
    ['HEIC', 'image/heic', 'iphone.heic'],
    ['HEIF', 'image/heif', 'iphone.heif'],
  ])('converts %s input to JPEG', async (_, type, name) => {
    const heic = file(6_000_000, type, name);

    const converted = new Blob(
      [new Uint8Array(4_000_000)],
      { type: 'image/jpeg' },
    );

    const heicConverter = vi.fn().mockResolvedValue(converted);
    const compressor = vi.fn();

    const result = await imageService.prepareImage(heic, {
      compressor,
      heicConverter,
    });

    expect(heicConverter).toHaveBeenCalledWith(
      expect.objectContaining({
        blob: heic,
        toType: 'image/jpeg',
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        name: 'iphone.jpg',
        type: 'image/jpeg',
      }),
    );

    expect(result.size).toBe(4_000_000);
    expect(compressor).not.toHaveBeenCalled();
  });

  it('compresses a converted HEIC only once when conversion output exceeds 5 MB', async () => {
    const heic = file(7_000_000, 'image/heic', 'iphone.heic');

    const converted = new Blob(
      [new Uint8Array(6_000_000)],
      { type: 'image/jpeg' },
    );

    const prepared = file(
      4_500_000,
      'image/jpeg',
      'iphone.jpg',
    );

    const heicConverter = vi.fn().mockResolvedValue(converted);
    const compressor = vi.fn().mockResolvedValue(prepared);

    const result = await imageService.prepareImage(heic, {
      compressor,
      heicConverter,
    });

    expect(result).toBe(prepared);

    expect(compressor).toHaveBeenCalledTimes(1);

    expect(compressor.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        name: 'iphone.jpg',
        type: 'image/jpeg',
      }),
    );
  });

  it('rejects an image when the single compression pass still exceeds 5 MB', async () => {
    const source = file(8_000_000);

    const stillTooLarge = file(
      5_000_001,
      'image/jpeg',
      'photo.jpg',
    );

    const compressor = vi.fn().mockResolvedValue(stillTooLarge);

    await expect(
      imageService.prepareImage(source, { compressor }),
    ).rejects.toThrow(/5 MB/i);

    expect(compressor).toHaveBeenCalledTimes(1);
  });

  it('rejects unsupported source files before attempting compression', async () => {
    const compressor = vi.fn();

    await expect(
      imageService.prepareImage(
        file(10, 'text/plain', 'notes.txt'),
        { compressor },
      ),
    ).rejects.toThrow(/supported image/i);

    expect(compressor).not.toHaveBeenCalled();
  });
});

describe('managed image upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts supported processed image MIME types within 5 MB', () => {
    expect(
      imageService.validateImageFile(
        file(5_000_000),
      ),
    ).toEqual({
      valid: true,
      error: null,
    });

    expect(
      imageService.validateImageFile(
        file(100, 'image/webp'),
      ).valid,
    ).toBe(true);
  });

  it('rejects non-images and processed files over 5 MB', () => {
    expect(
      imageService.validateImageFile(
        file(10, 'text/plain'),
      ).error,
    ).toMatch(/image/i);

    expect(
      imageService.validateImageFile(
        file(5_000_001),
      ).error,
    ).toMatch(/5 MB/i);
  });

  it('uses a resumable upload for an already-prepared mobile image and returns only its managed path', async () => {
    const prepared = file(
      4_000_000,
      'image/jpeg',
      'prepared.jpg',
    );

    storageMocks.uploadBytes.mockResolvedValue({
      ref: {
        fullPath: 'customers/c1/customer-photo',
      },
    });

    storageMocks.uploadBytesResumable.mockResolvedValue({
      ref: {
        fullPath: 'customers/c1/customer-photo',
      },
    });

    const result = await imageService.uploadPreparedImage(
      'customers/c1/customer-photo',
      prepared,
    );

    expect(
      storageMocks.uploadBytesResumable,
    ).toHaveBeenCalledWith(
      {
        fullPath: 'customers/c1/customer-photo',
      },
      prepared,
      {
        contentType: 'image/jpeg',
      },
    );

    expect(
      storageMocks.uploadBytes,
    ).not.toHaveBeenCalled();

    expect(result).toEqual({
      path: 'customers/c1/customer-photo',
    });
  });
});