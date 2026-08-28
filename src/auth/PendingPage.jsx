import { useAuth } from './useAuth';
import { Navigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';

export default function PendingPage() {
  const { logout, refreshProfile, state, loading } = useAuth();
  if (loading) return <div className="page-state">ກຳລັງກວດສອບ...</div>;
  if (state !== 'pending') return <Navigate to={state === 'approved' ? '/' : state === 'disabled' ? '/disabled' : '/login'} replace/>;
  return <main className="auth-page">
    <GlassCard as="section" variant="raised" className="auth-card auth-state-card text-center">
      <div className="text-5xl mb-4">⏳</div>
      <h1 className="text-2xl font-extrabold">ລໍຖ້າການອະນຸມັດ</h1>
      <p className="muted mt-3">ບັນຊີຖືກສ້າງແລ້ວ. Admin ຈະກຳນົດບົດບາດ ແລະ ສາຂາໃຫ້ທ່ານ.</p>
      <div className="flex flex-wrap gap-3 justify-center mt-6"><Button variant="secondary" onClick={refreshProfile}>ກວດສອບອີກຄັ້ງ</Button><Button variant="neutral" onClick={logout}>ອອກຈາກລະບົບ</Button></div>
    </GlassCard>
  </main>;
}
