import { useState } from 'react';
import { useAuth } from '../auth/useAuth';
import Navbar from '../components/Navbar';
import Button from '../components/ui/Button';
import DailySalesForm from './DailySalesForm';
import SalesReportPanel from './SalesReportPanel';

export default function SalesPage() {
  const identity = useAuth();
  const admin = identity.claims.role === 'admin';
  const [tab, setTab] = useState(admin ? 'report' : 'entry');

  return <>
    <Navbar title="ຍອດຂາຍຜະລິດຕະພັນ" />
    <main className="page-content">
      <div className="chip-row mb-5" aria-label="ໜ້າຍອດຂາຍ">
        {!admin ? <Button variant="neutral" aria-pressed={tab === 'entry'} onClick={() => setTab('entry')}>ບັນທຶກມື້ນີ້</Button> : null}
        <Button variant="neutral" aria-pressed={tab === 'report'} onClick={() => setTab('report')}>ລາຍງານຍອດຂາຍ</Button>
        {admin ? <Button variant="neutral" aria-pressed={tab === 'products'} onClick={() => setTab('products')}>ຈັດການຜະລິດຕະພັນ</Button> : null}
      </div>
      {tab === 'entry' ? <DailySalesForm /> : null}
      {tab === 'report' ? <SalesReportPanel /> : null}
      {tab === 'products' ? <div className="page-state">ຈັດການຜະລິດຕະພັນ</div> : null}
    </main>
  </>;
}
