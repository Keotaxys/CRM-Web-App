import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar'; import CustomerForm from './CustomerForm'; import { useAuth } from '../auth/useAuth';
import { abortCustomerUploads, changeCustomerStatus, createCustomer, getCustomer, updateCustomer } from '../services/customersService'; import { customerImagePath } from '../shared/imagePaths'; import { uploadManagedImage } from '../services/imageService'; import { syncLegacyCustomer } from '../services/webhookService';

export default function CustomerFormPage() {
  const { id } = useParams(); const edit = Boolean(id); const identity = useAuth(); const navigate = useNavigate(); const [initial, setInitial] = useState(null); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const createdId = useRef(null);
  useEffect(() => { if (!edit) setInitial({}); else getCustomer(id).then(setInitial).catch(() => setError('ບໍ່ພົບລູກຄ້າ')); }, [edit, id]);
  const submit = async (values, files) => {
    setBusy(true); setError(''); let cleanupId = null; let uploadedManagedImage = false;
    try {
      const retryingCreate = !edit && Boolean(createdId.current); const customerId = edit ? id : createdId.current || await createCustomer(values, identity); createdId.current = customerId; const images = {};
      cleanupId = customerId;
      if (files.customerPhoto) { const uploaded = await uploadManagedImage(customerImagePath(customerId, 'customer'), files.customerPhoto); uploadedManagedImage = true; images.imageUrl = ''; images.imageStoragePath = uploaded.path; }
      if (files.placePhoto) { const uploaded = await uploadManagedImage(customerImagePath(customerId, 'place'), files.placePhoto); uploadedManagedImage = true; images.placeImageUrl = ''; images.placeImageStoragePath = uploaded.path; }
      const statusChanged = edit && initial.status !== values.status;
      const editableValues = edit || retryingCreate ? { ...values } : {};
      if (statusChanged) delete editableValues.status;
      if (edit || Object.keys(images).length || createdId.current === customerId) await updateCustomer(customerId, { ...editableValues, ...images }, identity);
      cleanupId = null;
      if (statusChanged) await changeCustomerStatus(customerId, values.status, identity);
      syncLegacyCustomer(customerId, edit ? 'updated' : 'created').catch((reason) => console.error('Legacy sync failed', reason)); navigate(`/customers/${customerId}`);
    } catch (reason) { console.error(reason); if(cleanupId&&uploadedManagedImage)abortCustomerUploads(cleanupId).catch((cleanupError)=>console.error('Upload cleanup failed',cleanupError)); setError('ບັນທຶກບໍ່ສຳເລັດ; ກົດບັນທຶກອີກຄັ້ງໄດ້ໂດຍຈະບໍ່ສ້າງລູກຄ້າຊ້ຳ'); } finally { setBusy(false); }
  };
  return <><Navbar title={edit ? 'ແກ້ໄຂລູກຄ້າ' : 'ເພີ່ມລູກຄ້າ'} showBack/><main className="page-content narrow">{error && <div className="error-banner">{error}</div>}{initial ? <CustomerForm key={id || 'new'} initial={initial} onSubmit={submit} busy={busy} admin={identity.claims.role === 'admin'}/> : <div className="page-state">ກຳລັງໂຫຼດ...</div>}</main></>;
}
