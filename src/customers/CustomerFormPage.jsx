import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import Navbar from '../components/Navbar';
import { customerImagePath } from '../shared/imagePaths';
import {
  abortCustomerUploads,
  changeCustomerStatus,
  createCustomer,
  getCustomer,
  reserveCustomerId,
  rollbackCustomerCreate,
  updateCustomer,
} from '../services/customersService';
import { prepareImage, uploadPreparedImage } from '../services/imageService';
import { syncLegacyCustomer } from '../services/webhookService';
import CustomerForm from './CustomerForm';

const ERROR_MESSAGES = Object.freeze({
  'image-processing': 'ຈັດການຮູບບໍ່ສຳເລັດ. ກະລຸນາເລືອກຮູບ JPEG, PNG, WebP, HEIC ຫຼື HEIF ແລ້ວລອງໃໝ່.',
  'image-upload': 'ອັບໂຫຼດຮູບບໍ່ສຳເລັດ. ກະລຸນາກວດອິນເຕີເນັດແລ້ວລອງໃໝ່.',
  'customer-save': 'ບັນທຶກຂໍ້ມູນລູກຄ້າບໍ່ສຳເລັດ. ກະລຸນາລອງໃໝ່.',
});

const CLEANUP_WARNING = ' ການລ້າງຂໍ້ມູນຄ້າງບໍ່ສຳເລັດ; ກະລຸນາແຈ້ງຜູ້ດູແລລະບົບ.';

async function prepareSelectedImages(files = {}) {
  const prepared = {};

  // Process sequentially to avoid decoding two large mobile photos in memory at once.
  if (files.customerPhoto) {
    prepared.customerPhoto = await prepareImage(files.customerPhoto);
  }

  if (files.placePhoto) {
    prepared.placePhoto = await prepareImage(files.placePhoto);
  }

  return prepared;
}

async function uploadCustomerImages(customerId, preparedFiles, onUploaded = () => {}) {
  const images = {};

  if (preparedFiles.customerPhoto) {
    const uploaded = await uploadPreparedImage(
      customerImagePath(customerId, 'customer'),
      preparedFiles.customerPhoto,
    );
    onUploaded();
    images.imageUrl = '';
    images.imageStoragePath = uploaded.path;
  }

  if (preparedFiles.placePhoto) {
    const uploaded = await uploadPreparedImage(
      customerImagePath(customerId, 'place'),
      preparedFiles.placePhoto,
    );
    onUploaded();
    images.placeImageUrl = '';
    images.placeImageStoragePath = uploaded.path;
  }

  return images;
}

export default function CustomerFormPage() {
  const { id } = useParams();
  const edit = Boolean(id);
  const identity = useAuth();
  const navigate = useNavigate();
  const [initial, setInitial] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const reservedCustomerId = useRef(null);

  useEffect(() => {
    if (!edit) {
      setInitial({});
      return;
    }

    getCustomer(id)
      .then(setInitial)
      .catch(() => setError('ບໍ່ພົບລູກຄ້າ'));
  }, [edit, id]);

  const submit = async (values, files) => {
    if (submitting.current) return;

    submitting.current = true;
    setBusy(true);
    setError('');

    let stage = 'image-processing';
    let customerId = edit ? id : null;
    let createdCustomer = false;
    let uploadedEditImage = false;

    try {
      const preparedFiles = await prepareSelectedImages(files);

      if (!edit) {
        customerId = reservedCustomerId.current || reserveCustomerId();
        reservedCustomerId.current = customerId;
        stage = 'customer-save';
        await createCustomer(values, identity, customerId);
        createdCustomer = true;
      }

      stage = 'image-upload';
      const images = await uploadCustomerImages(
        customerId,
        preparedFiles,
        () => {
          if (edit) uploadedEditImage = true;
        },
      );

      stage = 'customer-save';
      const statusChanged = edit && initial.status !== values.status;
      const editableValues = edit ? { ...values } : {};

      if (statusChanged) delete editableValues.status;

      if (edit || Object.keys(images).length) {
        await updateCustomer(
          customerId,
          { ...editableValues, ...images },
          identity,
        );
      }

      if (statusChanged) {
        await changeCustomerStatus(customerId, values.status, identity);
      }

      createdCustomer = false;
      reservedCustomerId.current = null;
      syncLegacyCustomer(customerId, edit ? 'updated' : 'created')
        .catch((reason) => console.error('Legacy sync failed', reason));
      navigate(`/customers/${customerId}`);
    } catch (reason) {
      console.error('Customer save flow failed', { stage, reason });
      let cleanupFailed = false;

      try {
        if (!edit && createdCustomer) {
          await rollbackCustomerCreate(customerId);
        } else if (edit && uploadedEditImage) {
          await abortCustomerUploads(customerId);
        }
      } catch (cleanupError) {
        cleanupFailed = true;
        console.error('Customer save cleanup failed', cleanupError);
      }

      setError(`${ERROR_MESSAGES[stage] ?? ERROR_MESSAGES['customer-save']}${cleanupFailed ? CLEANUP_WARNING : ''}`);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  return (
    <>
      <Navbar title={edit ? 'ແກ້ໄຂລູກຄ້າ' : 'ເພີ່ມລູກຄ້າ'} showBack />
      <main className="page-content narrow">
        {error && <div className="error-banner" role="alert">{error}</div>}
        {initial ? (
          <CustomerForm
            key={id || 'new'}
            initial={initial}
            onSubmit={submit}
            busy={busy}
            admin={identity.claims.role === 'admin'}
          />
        ) : (
          <div className="page-state">ກຳລັງໂຫຼດ...</div>
        )}
      </main>
    </>
  );
}
