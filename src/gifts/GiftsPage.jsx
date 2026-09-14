import { useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { BRANCHES } from '../branches/branches';
import Navbar from '../components/Navbar';
import Button from '../components/ui/Button';
import CustomSelect from '../components/ui/CustomSelect';
import GlassCard from '../components/ui/GlassCard';
import GiftDistributionForm from './GiftDistributionForm';

const managerTabs = [
  ['distribution', 'ແຈກເຄື່ອງ'], ['stock', 'ສະຕັອກ'], ['inbound', 'ຮັບເຂົ້າ'],
  ['report', 'ລາຍງານ'], ['campaigns', 'Campaign'],
];

function actor(identity) {
  return { role: identity?.claims?.role ?? identity?.role, branchId: identity?.claims?.branchId ?? identity?.branchId };
}

export default function GiftsPage() {
  const identity = useAuth();
  const { role, branchId } = actor(identity);
  const admin = role === 'admin';
  const [targetBranchId, setTargetBranchId] = useState('');
  const [tab, setTab] = useState('distribution');
  const effectiveBranchId = admin ? targetBranchId : branchId;
  const tabs = admin ? [...managerTabs, ['catalog', 'ລາຍການເຄື່ອງແຈກ']] : role === 'branch_manager' ? managerTabs : [['distribution', 'ແຈກເຄື່ອງ']];

  return <>
    <Navbar title="ຈັດການເຄື່ອງແຈກ" />
    <main className="page-content">
      {admin ? <GlassCard padded className="mb-5"><CustomSelect
        id="gift-target-branch" label="ສາຂາເປົ້າໝາຍ" value={targetBranchId}
        options={BRANCHES.map((branch) => ({ value: branch.id, label: branch.label }))}
        placeholder="ເລືອກສາຂາ" onChange={setTargetBranchId}
      /></GlassCard> : null}
      <div className="chip-row mb-5" aria-label="ໜ້າເຄື່ອງແຈກ">
        {tabs.map(([value, label]) => <Button key={value} variant="neutral" aria-pressed={tab === value} onClick={() => setTab(value)}>{label}</Button>)}
      </div>
      {admin && !effectiveBranchId && tab !== 'catalog' ? <div className="error-banner" role="alert">ກະລຸນາເລືອກສາຂາກ່ອນເຮັດລາຍການ</div> : null}
      {tab === 'distribution' && effectiveBranchId ? <GiftDistributionForm identity={identity} effectiveBranchId={effectiveBranchId} /> : null}
      {tab !== 'distribution' && (!admin || effectiveBranchId || tab === 'catalog') ? <GlassCard as="section" padded><h2>{tabs.find(([value]) => value === tab)?.[1]}</h2><p>ກຳລັງຈັດກຽມ</p></GlassCard> : null}
    </main>
  </>;
}
