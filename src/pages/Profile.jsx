import { useState } from 'react';
import { Link, useInRouterContext } from 'react-router-dom';
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
  const inRouter = useInRouterContext();
  const [values, setValues] = useState({ name: identity.profile?.name ?? '', phone: identity.profile?.phone ?? '', photoURL: identity.profile?.photoURL ?? '', photoStoragePath: identity.profile?.photoStoragePath ?? '' });
  const [avatar, setAvatar] = useState(null); const [feedback, setFeedback] = useState(null); const [busy, setBusy] = useState(false);
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setFeedback(null); let abandonedPath = '';
    try {
      let photoStoragePath = values.photoStoragePath;
      if (avatar) { photoStoragePath = (await uploadManagedImage(profileImagePath(identity.user.uid), avatar)).path; if(photoStoragePath!==values.photoStoragePath)abandonedPath=photoStoragePath; }
      await updatePersonalProfile(identity.user.uid, { ...values, photoStoragePath });
      abandonedPath = '';
      await identity.refreshProfile(); setFeedback({ kind: 'success', text: 'ບັນທຶກໂປຣໄຟລ໌ແລ້ວ' });
    } catch (error) { console.error(error); if(abandonedPath)deleteManagedImage(abandonedPath).catch((cleanupError)=>console.error('Avatar cleanup failed',cleanupError)); setFeedback({ kind: 'error', text: 'ບັນທຶກບໍ່ສຳເລັດ' }); } finally { setBusy(false); }
  };
  return <><Navbar title="ໂປຣໄຟລ໌"/><main className="page-content narrow"><GlassCard as="section" padded>
    <form className="form-stack" onSubmit={save}><div className="avatar"><ManagedImage storagePath={values.photoStoragePath} legacyUrl={values.photoURL} alt="ຮູບໂປຣໄຟລ໌" fallback={values.name?.[0] || 'ຜ'}/></div>
      <CameraUpload label="ຮູບໂປຣໄຟລ໌" actionLabel="ເລືອກຮູບໂປຣໄຟລ໌" changeActionLabel="ປ່ຽນຮູບໂປຣໄຟລ໌" file={avatar} onChange={setAvatar}/>
      <Input id="profile-name" label="ຊື່" required value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })}/>
      <Input id="profile-phone" label="ເບີໂທ" value={values.phone} onChange={(event) => setValues({ ...values, phone: event.target.value })}/>
      <div className="read-only-field"><span>ບົດບາດ</span><strong>{roleLabel(identity.claims.role)}</strong></div><div className="read-only-field"><span>ສາຂາ</span><strong>{identity.claims.branchId || 'ທຸກສາຂາ'}</strong></div>
      {feedback && <p role={feedback.kind === 'error' ? 'alert' : 'status'} className={feedback.kind === 'error' ? 'error-banner' : 'status-message'}>{feedback.text}</p>}<Button type="submit" busy={busy}>ບັນທຶກ</Button>
      {inRouter ? <Link className="btn-secondary text-center" to="/sales">ຍອດຂາຍ ແລະລາຍງານ</Link> : <a className="btn-secondary text-center" href="/sales">ຍອດຂາຍ ແລະລາຍງານ</a>}{inRouter ? <Link className="btn-secondary text-center" to="/gifts">ເຄື່ອງແຈກ</Link> : <a className="btn-secondary text-center" href="/gifts">ເຄື່ອງແຈກ</a>}{identity.claims.role === 'admin' && <a className="btn-secondary text-center" href="/admin">ສູນບໍລິຫານລະບົບ</a>}
    </form></GlassCard></main></>;
}
