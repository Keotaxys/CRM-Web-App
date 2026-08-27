import { useAuth } from './useAuth';
import { Navigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';

export default function DisabledPage() {
  const { logout, state, loading } = useAuth();
  if (loading) return <div className="page-state">ກຳລັງກວດສອບ...</div>;
  if (state !== 'disabled') return <Navigate to={state === 'approved' ? '/' : state === 'pending' ? '/pending' : '/login'} replace/>;
  return <main className="auth-page"><GlassCard as="section" variant="raised" className="auth-card auth-state-card text-center">
    <div className="text-5xl mb-4">🔒</div><h1 className="text-2xl font-extrabold">ບັນຊີຖືກປິດໃຊ້ງານ</h1>
    <p className="muted mt-3">ກະລຸນາຕິດຕໍ່ Admin ຂອງລະບົບ.</p><Button variant="neutral" className="mt-6" onClick={logout}>ອອກຈາກລະບົບ</Button>
  </GlassCard></main>;
}
