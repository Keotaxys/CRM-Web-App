import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { BRANCHES, isKnownBranch } from '../branches/branches';
import Navbar from '../components/Navbar';
import Button from '../components/ui/Button';
import CustomSelect from '../components/ui/CustomSelect';
import GlassCard from '../components/ui/GlassCard';
import GiftDistributionForm from './GiftDistributionForm';
import GiftDistributionHistory from './GiftDistributionHistory';
import GiftStockPanel from './GiftStockPanel';
import GiftInboundPanel from './GiftInboundPanel';
import GiftCatalogAdmin from './GiftCatalogAdmin';
import GiftCampaignAdmin from './GiftCampaignAdmin';
import GiftReportPanel from './GiftReportPanel';

const managerTabs = [
  ['distribution', 'ແຈກເຄື່ອງ'], ['stock', 'ສະຕັອກ'], ['inbound', 'ຮັບເຂົ້າ'],
  ['report', 'ລາຍງານ'], ['campaigns', 'ແຄມເປນ'],
];

function actor(identity) {
  return { role: identity?.claims?.role ?? identity?.role, branchId: identity?.claims?.branchId ?? identity?.branchId };
}

function singleParam(params, name) {
  return params.getAll(name).length === 1 ? params.get(name) : '';
}

export default function GiftsPage() {
  const identity = useAuth();
  const { role, branchId } = actor(identity);
  const admin = role === 'admin';
  const [params, setParams] = useSearchParams();
  const requestedBranch = singleParam(params, 'branchId');
  const targetBranchId = isKnownBranch(requestedBranch) ? requestedBranch : '';
  const effectiveBranchId = admin ? targetBranchId : branchId;
  const tabs = admin ? [...managerTabs, ['catalog', 'ລາຍການເຄື່ອງແຈກ']] : role === 'branch_manager' ? managerTabs : [
    ['distribution', 'ແຈກເຄື່ອງ'], ['report', 'ລາຍງານ'],
  ];
  const requestedTab = singleParam(params, 'tab');
  const tab = tabs.some(([value]) => value === requestedTab) ? requestedTab : 'distribution';
  const requestedGift = singleParam(params, 'giftId');
  const giftFilterId = /^[A-Za-z0-9_-]{1,128}$/.test(requestedGift) ? requestedGift : '';
  const scopeKey = `${identity?.user?.uid ?? identity?.uid}:${role}:${effectiveBranchId}`;
  const setTab = (value) => setParams((current) => { const next = new URLSearchParams(current); next.set('tab', value); return next; });
  const setTargetBranchId = (value) => setParams((current) => {
    const next = new URLSearchParams(current); next.set('branchId', value); next.delete('giftId'); return next;
  });
  const clearGiftFilter = () => setParams((current) => { const next = new URLSearchParams(current); next.delete('giftId'); return next; });

  return <>
    <Navbar title="ຈັດການເຄື່ອງແຈກ" />
    <main className="page-content gift-page">
      {admin ? <GlassCard padded className="mb-5"><CustomSelect
        id="gift-target-branch" label="ສາຂາເປົ້າໝາຍ" value={targetBranchId}
        options={BRANCHES.map((branch) => ({ value: branch.id, label: branch.label }))}
        placeholder="ເລືອກສາຂາ" onChange={setTargetBranchId}
      /></GlassCard> : null}
      <div className="chip-row gift-tabs mb-5" aria-label="ໜ້າເຄື່ອງແຈກ">
        {tabs.map(([value, label]) => <Button key={value} variant="neutral" aria-pressed={tab === value} onClick={() => setTab(value)}>{label}</Button>)}
      </div>
      {admin && !effectiveBranchId && tab !== 'catalog' ? <div className="error-banner" role="alert">ກະລຸນາເລືອກສາຂາກ່ອນເຮັດລາຍການ</div> : null}
      {tab === 'distribution' && effectiveBranchId ? <div key={scopeKey} className="form-stack">
        <GiftDistributionForm identity={identity} effectiveBranchId={effectiveBranchId} />
        <GiftDistributionHistory identity={identity} effectiveBranchId={effectiveBranchId} />
      </div> : null}
      {tab === 'stock' && effectiveBranchId ? <GiftStockPanel key={`${scopeKey}:${giftFilterId}`} identity={identity} effectiveBranchId={effectiveBranchId} giftFilterId={giftFilterId} onClearGiftFilter={clearGiftFilter} /> : null}
      {tab === 'inbound' && effectiveBranchId ? <GiftInboundPanel key={scopeKey} identity={identity} effectiveBranchId={effectiveBranchId} /> : null}
      {tab === 'campaigns' && effectiveBranchId ? <GiftCampaignAdmin identity={identity} effectiveBranchId={effectiveBranchId} /> : null}
      {tab === 'catalog' && admin ? <GiftCatalogAdmin identity={identity} effectiveBranchId={effectiveBranchId} /> : null}
      {tab === 'report' && effectiveBranchId ? <GiftReportPanel effectiveBranchId={effectiveBranchId} /> : null}
    </main>
  </>;
}
