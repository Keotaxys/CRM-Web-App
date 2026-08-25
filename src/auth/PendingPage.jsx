import { useAuth } from './useAuth';
import { Navigate } from 'react-router-dom';

export default function PendingPage() {
  const { logout, refreshProfile, state, loading } = useAuth();
  if (loading) return <div className="page-state">ກຳລັງກວດສອບ...</div>;
  if (state !== 'pending') return <Navigate to={state === 'approved' ? '/' : state === 'disabled' ? '/disabled' : '/login'} replace/>;
  return <main className="min-h-screen grid place-items-center bg-slate-50 p-6">
    <section className="panel max-w-md text-center">
      <div className="text-5xl mb-4">⏳</div>
      <h1 className="text-2xl font-extrabold">ລໍຖ້າການອະນຸມັດ</h1>
      <p className="muted mt-3">ບັນຊີຖືກສ້າງແລ້ວ. Admin ຈະກຳນົດບົດບາດ ແລະ ສາຂາໃຫ້ທ່ານ.</p>
      <div className="flex gap-3 justify-center mt-6"><button className="btn-secondary" onClick={refreshProfile}>ກວດສອບອີກຄັ້ງ</button><button className="btn-ghost" onClick={logout}>ອອກຈາກລະບົບ</button></div>
    </section>
  </main>;
}
