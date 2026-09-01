import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const storageMocks = vi.hoisted(() => ({ getBlob: vi.fn(), ref: vi.fn((_storage, path) => ({ path })) }));
vi.mock('firebase/storage', () => storageMocks);
vi.mock('../firebase/config', () => ({ storage: {} }));

import ManagedImage from './ManagedImage';

describe('ManagedImage', () => {
  beforeEach(() => {
    storageMocks.getBlob.mockReset();
    URL.createObjectURL = vi.fn(() => 'blob:authenticated-image');
    URL.revokeObjectURL = vi.fn();
  });

  it('keeps legacy URLs as compatibility fallback', () => {
    render(<ManagedImage legacyUrl="https://legacy.example/photo.jpg" alt="Legacy"/>);
    expect(screen.getByAltText('Legacy')).toHaveAttribute('src', 'https://legacy.example/photo.jpg');
    expect(storageMocks.getBlob).not.toHaveBeenCalled();
  });

  it('fetches managed paths through the authenticated Storage SDK', async () => {
    storageMocks.getBlob.mockResolvedValue(new Blob(['image']));
    render(<ManagedImage storagePath="customers/c1/customer-photo" legacyUrl="https://legacy.example/photo.jpg" alt="Managed"/>);
    await waitFor(() => expect(screen.getByAltText('Managed')).toHaveAttribute('src', 'blob:authenticated-image'));
    expect(storageMocks.ref).toHaveBeenCalledWith({}, 'customers/c1/customer-photo');
    expect(storageMocks.getBlob).toHaveBeenCalledTimes(1);
  });

  it('reports a redacted managed-read failure before using the legacy fallback', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    storageMocks.getBlob.mockRejectedValue(Object.assign(
      new Error('request customers/c1/customer-photo?token=secret failed'),
      { code: 'storage/unauthorized' },
    ));

    render(<ManagedImage storagePath="customers/c1/customer-photo" legacyUrl="https://legacy.example/photo.jpg" alt="Fallback"/>);

    await waitFor(() => expect(screen.getByAltText('Fallback')).toHaveAttribute('src', 'https://legacy.example/photo.jpg'));
    expect(consoleError).toHaveBeenCalledWith('Managed image read failed', JSON.stringify({
      errorCode: 'storage/unauthorized',
      errorMessage: 'request customers/[redacted-customer]/customer-photo?token=[redacted] failed',
      hasLegacyFallback: true,
      slot: 'customer-photo',
    }));
    expect(JSON.stringify(consoleError.mock.calls)).not.toMatch(/c1|secret/);
    consoleError.mockRestore();
  });
});
