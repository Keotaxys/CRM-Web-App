import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar'; import CustomerForm from './CustomerForm'; import { useAuth } from '../auth/useAuth';
import { createCustomer, getCustomer, updateCustomer } from '../services/customersService'; import { customerImagePath } from '../shared/imagePaths'; import { uploadManagedImage } from '../services/imageService'; import { syncLegacyCustomer } from '../services/webhookService';

export default function CustomerFormPage() {
  const { id } = useParams(); const edit = Boolean(id); const identity = useAuth(); const navigate = useNavigate(); const [initial, setInitial] = useState(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => { if (!edit) setInitial({}); else getCustomer(id).then(setInitial).catch(() => setError('ບໍ່ພົບລູກຄ້າ')); }, [edit, id]);
  const submit = async (values, files) => {
    setBusy(true); setError('');
    try {
      const customerId = edit ? id : await createCustomer(values, identity); const images = {};
      if (files.customerPhoto) { const uploaded = await uploadManagedImage(customerImagePath(customerId, 'customer'), files.customerPhoto); images.imageUrl = uploaded.url; images.imageStoragePath = uploaded.path; }
      if (files.placePhoto) { const uploaded = await uploadManagedImage(customerImagePath(customerId, 'place'), files.placePhoto); images.placeImageUrl = uploaded.url; images.placeImageStoragePath = uploaded.path; }
      if (edit || Object.keys(images).length) await updateCustomer(customerId, { ...(edit ? values : {}), ...images }, identity);
      syncLegacyCustomer(customerId, edit ? 'updated' : 'created').catch((reason) => console.error('Legacy sync failed', reason)); navigate(`/customers/${customerId}`);
    } catch (reason) { console.error(reason); setError('ບັນທຶກລູກຄ້າບໍ່ສຳເລັດ'); } finally { setBusy(false); }
  };
  return <><Navbar title={edit ? 'ແກ້ໄຂລູກຄ້າ' : 'ເພີ່ມລູກຄ້າ'} showBack/><main className="page-content narrow">{error && <div className="error-banner">{error}</div>}{initial ? <CustomerForm key={id || 'new'} initial={initial} onSubmit={submit} busy={busy} admin={identity.claims.role === 'admin'}/> : <div className="page-state">ກຳລັງໂຫຼດ...</div>}</main></>;
}
