import { useEffect, useState } from 'react'; import { useNavigate, useParams, useSearchParams } from 'react-router-dom'; import Navbar from '../components/Navbar'; import ActivityForm from './ActivityForm'; import { useAuth } from '../auth/useAuth'; import { subscribeCustomers } from '../services/customersService'; import { subscribeAssignableUsers } from '../services/usersService'; import { getActivity, saveActivity } from '../services/activitiesService'; import { ACTIVITY_TYPES } from '../shared/constants';

export default function ActivityFormPage() {
  const params = useParams(); const [searchParams] = useSearchParams(); const navigate = useNavigate(); const identity = useAuth(); const id = params.id; const type = id ? null : params.type;
  const [initial, setInitial] = useState(id ? null : { customerId: searchParams.get('customerId') || '', startAt: searchParams.get('date') ? `${searchParams.get('date')}T09:00` : '' }); const [customers, setCustomers] = useState([]); const [users, setUsers] = useState([]); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => subscribeCustomers(identity, setCustomers, (reason) => console.error(reason)), [identity]);
  useEffect(() => subscribeAssignableUsers(identity, setUsers, (reason) => console.error(reason)), [identity]);
  useEffect(() => { if (id) getActivity(id).then(setInitial).catch(() => setError('ບໍ່ພົບກິດຈະກຳ')); }, [id]);
  const actualType = initial?.type || type;
  if (actualType && !Object.values(ACTIVITY_TYPES).includes(actualType)) return <div className="page-state">ປະເພດກິດຈະກຳບໍ່ຖືກຕ້ອງ</div>;
  const submit = async (values) => { setBusy(true); setError(''); try { const result = await saveActivity(values, id); navigate(`/activities/${result.id || id}`); } catch (reason) { console.error(reason); setError(reason.message || 'ບັນທຶກບໍ່ສຳເລັດ'); } finally { setBusy(false); } };
  return <><Navbar title={id ? 'ແກ້ໄຂກິດຈະກຳ' : 'ສ້າງກິດຈະກຳ'} showBack/><main className="page-content narrow">{error && <div className="error-banner" role="alert">{error}</div>}{initial && actualType ? <ActivityForm initial={initial} type={actualType} customers={customers} users={users} currentUid={identity.claims.role === 'admin' ? '' : identity.user.uid} onSubmit={submit} busy={busy} admin={identity.claims.role === 'admin'}/> : <div className="page-state">ກຳລັງໂຫຼດ...</div>}</main></>;
}
