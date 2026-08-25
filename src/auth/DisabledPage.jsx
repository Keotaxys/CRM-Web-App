import { useAuth } from './useAuth';
import { Navigate } from 'react-router-dom';

export default function DisabledPage() {
  const { logout, state, loading } = useAuth();
  if (loading) return <div className="page-state">ກຳລັງກວດສອບ...</div>;
  if (state !== 'disabled') return <Navigate to={state === 'approved' ? '/' : state === 'pending' ? '/pending' : '/login'} replace/>;
  return <main className="min-h-screen grid place-items-center bg-slate-50 p-6"><section className="panel max-w-md text-center">
    <div className="text-5xl mb-4">🔒</div><h1 className="text-2xl font-extrabold">ບັນຊີຖືກປິດໃຊ້ງານ</h1>
    <p className="muted mt-3">ກະລຸນາຕິດຕໍ່ Admin ຂອງລະບົບ.</p><button className="btn-secondary mt-6" onClick={logout}>ອອກຈາກລະບົບ</button>
  </section></main>;
}
