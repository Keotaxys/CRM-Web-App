import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export default function Login() {
  const navigate = useNavigate();
  const { login, register, loginWithGoogle, state, loading: authLoading } = useAuth();
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [registering, setRegistering] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!authLoading && state !== 'anonymous') return <Navigate to={state === 'approved' ? '/' : `/${state}`} replace/>;

  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (registering) await register(values.email, values.password, { name: values.name });
      else await login(values.email, values.password);
      navigate(registering ? '/pending' : '/');
    } catch (reason) {
      console.error(reason); setError('ບໍ່ສາມາດດຳເນີນການໄດ້. ກະລຸນາກວດອີເມວ ແລະ ລະຫັດຜ່ານ.');
    } finally { setBusy(false); }
  };

  return <main className="auth-page"><section className="auth-card">
    <div className="brand-mark mx-auto mb-4">CRM</div><h1 className="text-2xl font-extrabold text-center">{registering ? 'ລົງທະບຽນພະນັກງານ' : 'ເຂົ້າສູ່ລະບົບ'}</h1>
    <p className="muted text-center mt-2">ລະບົບຕິດຕາມລູກຄ້າ CRM</p>{error && <div className="error-banner">{error}</div>}
    <form onSubmit={submit} className="form-stack mt-6">
      {registering && <label>ຊື່<input required value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })}/></label>}
      <label>ອີເມວ<input type="email" required value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })}/></label>
      <label>ລະຫັດຜ່ານ<input type="password" minLength="6" required value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })}/></label>
      <button className="btn-primary" disabled={busy}>{busy ? 'ກຳລັງປະມວນຜົນ...' : registering ? 'ສ້າງບັນຊີ Pending' : 'ເຂົ້າສູ່ລະບົບ'}</button>
    </form>
    <button className="btn-secondary w-full mt-3" disabled={busy} onClick={() => loginWithGoogle().then(() => navigate('/')).catch(() => setError('Google Sign-In ບໍ່ສຳເລັດ'))}>Google Sign-In</button>
    <button className="btn-ghost w-full mt-3" onClick={() => { setRegistering(!registering); setError(''); }}>{registering ? 'ກັບໄປເຂົ້າລະບົບ' : 'ສ້າງບັນຊີໃໝ່'}</button>
    {registering && <p className="text-xs text-slate-500 text-center mt-3">ສາຂາ ແລະ ບົດບາດຈະຖືກກຳນົດໂດຍ Admin ເທົ່ານັ້ນ.</p>}
  </section></main>;
}
