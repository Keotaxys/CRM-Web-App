import { useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../auth/useAuth';
import { profileImagePath } from '../shared/imagePaths';
import { deleteManagedImage, uploadManagedImage } from '../services/imageService';
import { updatePersonalProfile } from '../services/profileService';
import ManagedImage from '../components/ManagedImage';
import { roleLabel } from '../shared/constants';
import CameraUpload from '../components/CameraUpload';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';
import Input from '../components/ui/Input';

export default function Profile() {
  const identity = useAuth();
  const [values, setValues] = useState({ name: identity.profile?.name ?? '', phone: identity.profile?.phone ?? '', photoURL: identity.profile?.photoURL ?? '', photoStoragePath: identity.profile?.photoStoragePath ?? '' });
  const [avatar, setAvatar] = useState(null); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setMessage(''); let abandonedPath = '';
    try {
      let photoStoragePath = values.photoStoragePath;
      if (avatar) { photoStoragePath = (await uploadManagedImage(profileImagePath(identity.user.uid), avatar)).path; if(photoStoragePath!==values.photoStoragePath)abandonedPath=photoStoragePath; }
      await updatePersonalProfile(identity.user.uid, { ...values, photoStoragePath });
      abandonedPath = '';
      await identity.refreshProfile(); setMessage('ບັນທຶກໂປຣໄຟລ໌ແລ້ວ');
    } catch (error) { console.error(error); if(abandonedPath)deleteManagedImage(abandonedPath).catch((cleanupError)=>console.error('Avatar cleanup failed',cleanupError)); setMessage('ບັນທຶກບໍ່ສຳເລັດ'); } finally { setBusy(false); }
  };
  return <><Navbar title="ໂປຣໄຟລ໌"/><main className="page-content narrow"><GlassCard as="section">
    <form className="form-stack" onSubmit={save}><div className="avatar"><ManagedImage storagePath={values.photoStoragePath} legacyUrl={values.photoURL} alt="ຮູບໂປຣໄຟລ໌" fallback={values.name?.[0] || 'ຜ'}/></div>
      <CameraUpload label="ຮູບໂປຣໄຟລ໌" actionLabel="ເລືອກຮູບໂປຣໄຟລ໌" changeActionLabel="ປ່ຽນຮູບໂປຣໄຟລ໌" file={avatar} onChange={setAvatar}/>
      <Input id="profile-name" label="ຊື່" required value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })}/>
      <Input id="profile-phone" label="ເບີໂທ" value={values.phone} onChange={(event) => setValues({ ...values, phone: event.target.value })}/>
      <div className="read-only-field"><span>ບົດບາດ</span><strong>{roleLabel(identity.claims.role)}</strong></div><div className="read-only-field"><span>ສາຂາ</span><strong>{identity.claims.branchId || 'ທຸກສາຂາ'}</strong></div>
      {message && <p className="status-message">{message}</p>}<Button type="submit" busy={busy}>ບັນທຶກ</Button>
      {identity.claims.role === 'admin' && <a className="btn-secondary text-center" href="/admin">ສູນບໍລິຫານລະບົບ</a>}
    </form></GlassCard></main></>;
}
