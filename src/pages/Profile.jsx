import { useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../auth/useAuth';
import { profileImagePath } from '../shared/imagePaths';
import { uploadManagedImage } from '../services/imageService';
import { updatePersonalProfile } from '../services/profileService';

export default function Profile() {
  const identity = useAuth();
  const [values, setValues] = useState({ name: identity.profile?.name ?? '', phone: identity.profile?.phone ?? '', photoURL: identity.profile?.photoURL ?? '' });
  const [avatar, setAvatar] = useState(null); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      let photoURL = values.photoURL;
      if (avatar) photoURL = (await uploadManagedImage(profileImagePath(identity.user.uid), avatar)).url;
      await updatePersonalProfile(identity.user.uid, { ...values, photoURL });
      await identity.refreshProfile(); setMessage('ບັນທຶກໂປຣໄຟລ໌ແລ້ວ');
    } catch (error) { console.error(error); setMessage('ບັນທຶກບໍ່ສຳເລັດ'); } finally { setBusy(false); }
  };
  return <><Navbar title="ໂປຣໄຟລ໌"/><main className="page-content narrow"><section className="panel">
    <form className="form-stack" onSubmit={save}><div className="avatar">{values.photoURL ? <img src={values.photoURL} alt="Profile"/> : (values.name?.[0] || 'U')}</div>
      <label>ຮູບໂປຣໄຟລ໌<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setAvatar(event.target.files[0] ?? null)}/></label>
      <label>ຊື່<input required value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })}/></label>
      <label>ເບີໂທ<input value={values.phone} onChange={(event) => setValues({ ...values, phone: event.target.value })}/></label>
      <div className="read-only-field"><span>ບົດບາດ</span><strong>{identity.claims.role}</strong></div><div className="read-only-field"><span>ສາຂາ</span><strong>{identity.claims.branchId || 'ທຸກສາຂາ'}</strong></div>
      {message && <p className="status-message">{message}</p>}<button className="btn-primary" disabled={busy}>ບັນທຶກ</button>
      {identity.claims.role === 'admin' && <a className="btn-secondary text-center" href="/admin">Admin Center</a>}
    </form></section></main></>;
}
