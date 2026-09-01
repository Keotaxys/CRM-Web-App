import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const serviceMocks = vi.hoisted(() => ({
  abortCustomerUploads: vi.fn(),
  changeCustomerStatus: vi.fn(),
  createCustomer: vi.fn(),
  files: {},
  getCustomer: vi.fn(),
  prepareImage: vi.fn(),
  reserveCustomerId: vi.fn(),
  rollbackCustomerCreate: vi.fn(),
  syncLegacyCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  uploadManagedImage: vi.fn(),
  uploadPreparedImage: vi.fn(),
  values: { name: 'Test Customer', phone: '02055551234', status: 'ໃໝ່' },
}));

vi.mock('../components/Navbar', () => ({ default: () => null }));
vi.mock('./CustomerForm', () => ({
  default: ({ onSubmit }) => (
    <button type="button" onClick={() => onSubmit(serviceMocks.values, serviceMocks.files)}>
      ບັນທຶກລູກຄ້າ
    </button>
  ),
}));
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'u1' },
    claims: { role: 'staff', branchId: '010', accountStatus: 'approved' },
  }),
}));
vi.mock('../services/customersService', () => ({
  abortCustomerUploads: serviceMocks.abortCustomerUploads,
  changeCustomerStatus: serviceMocks.changeCustomerStatus,
  createCustomer: serviceMocks.createCustomer,
  getCustomer: serviceMocks.getCustomer,
  reserveCustomerId: serviceMocks.reserveCustomerId,
  rollbackCustomerCreate: serviceMocks.rollbackCustomerCreate,
  updateCustomer: serviceMocks.updateCustomer,
}));
vi.mock('../services/imageService', () => ({
  prepareImage: serviceMocks.prepareImage,
  uploadManagedImage: serviceMocks.uploadManagedImage,
  uploadPreparedImage: serviceMocks.uploadPreparedImage,
}));
vi.mock('../services/webhookService', () => ({ syncLegacyCustomer: serviceMocks.syncLegacyCustomer }));

import CustomerFormPage from './CustomerFormPage';

function renderPage(path = '/customers/new') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/customers/new" element={<CustomerFormPage />} />
        <Route path="/customers/:id/edit" element={<CustomerFormPage />} />
        <Route path="/customers/:id" element={<div>customer detail</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe('CustomerFormPage create flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.files = {};
    serviceMocks.values = { name: 'Test Customer', phone: '02055551234', status: 'ໃໝ່' };
    serviceMocks.reserveCustomerId.mockReturnValue('c1');
    serviceMocks.createCustomer.mockResolvedValue('c1');
    serviceMocks.prepareImage.mockImplementation(async (selectedFile) => selectedFile);
    serviceMocks.uploadManagedImage.mockResolvedValue({ path: 'customers/c1/customer-photo' });
    serviceMocks.uploadPreparedImage.mockResolvedValue({ path: 'customers/c1/customer-photo' });
    serviceMocks.updateCustomer.mockResolvedValue(undefined);
    serviceMocks.rollbackCustomerCreate.mockResolvedValue({ rolledBack: true });
    serviceMocks.abortCustomerUploads.mockResolvedValue(undefined);
    serviceMocks.syncLegacyCustomer.mockResolvedValue(undefined);
  });

  it('reports a customer save error when the Firestore create fails', async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    serviceMocks.createCustomer.mockRejectedValueOnce(new Error('save failed'));
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'ບັນທຶກລູກຄ້າ' }));

    const feedback = await screen.findByRole('alert');
    expect(feedback).toHaveTextContent('ບັນທຶກຂໍ້ມູນລູກຄ້າບໍ່ສຳເລັດ');
    expect(feedback).toHaveClass('error-banner');
    expect(serviceMocks.rollbackCustomerCreate).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('processes every selected image before creating the customer document', async () => {
    const user = userEvent.setup();
    const customerPhoto = new File(['customer'], 'customer.jpg', { type: 'image/jpeg' });
    const placePhoto = new File(['place'], 'place.heic', { type: 'image/heic' });
    serviceMocks.files = { customerPhoto, placePhoto };
    serviceMocks.prepareImage
      .mockResolvedValueOnce(customerPhoto)
      .mockRejectedValueOnce(new Error('cannot decode'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'ບັນທຶກລູກຄ້າ' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('ຈັດການຮູບ');
    expect(serviceMocks.prepareImage).toHaveBeenNthCalledWith(1, customerPhoto);
    expect(serviceMocks.prepareImage).toHaveBeenNthCalledWith(2, placePhoto);
    expect(serviceMocks.createCustomer).not.toHaveBeenCalled();
    expect(serviceMocks.rollbackCustomerCreate).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('rolls back the new customer and reports an upload error when image upload fails', async () => {
    const user = userEvent.setup();
    const selected = new File(['photo'], 'customer.jpg', { type: 'image/jpeg' });
    const prepared = new File(['prepared'], 'customer.jpg', { type: 'image/jpeg' });
    serviceMocks.files = { customerPhoto: selected };
    serviceMocks.prepareImage.mockResolvedValueOnce(prepared);
    const uploadError = Object.assign(new Error('upload failed'), {
      code: 'storage/retry-limit-exceeded',
    });
    serviceMocks.uploadManagedImage.mockRejectedValueOnce(uploadError);
    serviceMocks.uploadPreparedImage.mockRejectedValueOnce(uploadError);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'ບັນທຶກລູກຄ້າ' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('ອັບໂຫຼດຮູບ');
    expect(serviceMocks.prepareImage.mock.invocationCallOrder[0])
      .toBeLessThan(serviceMocks.createCustomer.mock.invocationCallOrder[0]);
    expect(serviceMocks.createCustomer.mock.invocationCallOrder[0])
      .toBeLessThan(serviceMocks.uploadPreparedImage.mock.invocationCallOrder[0]);
    expect(serviceMocks.rollbackCustomerCreate).toHaveBeenCalledWith('c1');
    expect(serviceMocks.updateCustomer).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith('Customer save flow failed', {
      errorCode: 'storage/retry-limit-exceeded',
      errorMessage: 'upload failed',
      flow: 'create',
      images: [{
        originalSize: selected.size,
        originalType: 'image/jpeg',
        processedSize: prepared.size,
        processedType: 'image/jpeg',
        slot: 'customer-photo',
      }],
      stage: 'image-upload',
    });
    consoleError.mockRestore();
  });

  it('cleans up uploaded objects and the provisional customer when final save fails', async () => {
    const user = userEvent.setup();
    serviceMocks.files = {
      customerPhoto: new File(['photo'], 'customer.jpg', { type: 'image/jpeg' }),
    };
    serviceMocks.updateCustomer.mockRejectedValueOnce(new Error('update failed'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'ບັນທຶກລູກຄ້າ' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('ບັນທຶກຂໍ້ມູນລູກຄ້າບໍ່ສຳເລັດ');
    expect(serviceMocks.uploadPreparedImage).toHaveBeenCalledOnce();
    expect(serviceMocks.rollbackCustomerCreate).toHaveBeenCalledWith('c1');
    consoleError.mockRestore();
  });

  it('ignores a duplicate submit while the first save is still in flight', async () => {
    const user = userEvent.setup();
    const pendingCreate = deferred();
    serviceMocks.createCustomer.mockReturnValueOnce(pendingCreate.promise);
    renderPage();
    const save = await screen.findByRole('button', { name: 'ບັນທຶກລູກຄ້າ' });

    await user.click(save);
    await user.click(save);

    expect(serviceMocks.createCustomer).toHaveBeenCalledOnce();
    pendingCreate.resolve('c1');
    await waitFor(() => expect(serviceMocks.syncLegacyCustomer).toHaveBeenCalledOnce());
  });
});

describe('CustomerFormPage edit status synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.files = {};
    serviceMocks.values = {
      name: 'Existing Customer',
      phone: '02055551234',
      status: 'ດຳເນີນການແລ້ວ',
    };
    serviceMocks.getCustomer.mockResolvedValue({ id: 'c1', status: 'ໃໝ່' });
    serviceMocks.prepareImage.mockImplementation(async (selectedFile) => selectedFile);
    serviceMocks.uploadPreparedImage.mockResolvedValue({ path: 'customers/c1/customer-photo' });
    serviceMocks.abortCustomerUploads.mockResolvedValue(undefined);
    serviceMocks.updateCustomer.mockResolvedValue(undefined);
    serviceMocks.changeCustomerStatus.mockResolvedValue({ id: 'c1' });
    serviceMocks.syncLegacyCustomer.mockResolvedValue(undefined);
  });

  it('keeps status changes on the trusted activity-sync callable', async () => {
    const user = userEvent.setup();
    renderPage('/customers/c1/edit');

    await user.click(await screen.findByRole('button', { name: 'ບັນທຶກລູກຄ້າ' }));

    await waitFor(() => {
      expect(serviceMocks.changeCustomerStatus)
        .toHaveBeenCalledWith('c1', 'ດຳເນີນການແລ້ວ', expect.any(Object));
    });
    expect(serviceMocks.updateCustomer.mock.calls[0][1]).not.toHaveProperty('status');
  });

  it('cleans up the first replacement image when the second edit upload fails', async () => {
    const user = userEvent.setup();
    serviceMocks.values = {
      name: 'Existing Customer',
      phone: '02055551234',
      status: 'ໃໝ່',
    };
    serviceMocks.files = {
      customerPhoto: new File(['customer'], 'customer.jpg', { type: 'image/jpeg' }),
      placePhoto: new File(['place'], 'place.jpg', { type: 'image/jpeg' }),
    };
    serviceMocks.uploadPreparedImage
      .mockResolvedValueOnce({ path: 'customers/c1/customer-photo' })
      .mockRejectedValueOnce(new Error('second upload failed'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderPage('/customers/c1/edit');

    await user.click(await screen.findByRole('button', { name: 'ບັນທຶກລູກຄ້າ' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('ອັບໂຫຼດຮູບ');
    expect(serviceMocks.abortCustomerUploads).toHaveBeenCalledWith('c1');
    consoleError.mockRestore();
  });
});
