import { useEffect, useMemo, useState } from 'react'; import Navbar from '../components/Navbar'; import ActivityCard from './ActivityCard'; import { useAuth } from '../auth/useAuth'; import { subscribeActivities } from '../services/activitiesService'; import { bucketFollowUp } from '../shared/followUp'; import { FOLLOW_UP_BUCKETS, followUpBucketLabel } from '../shared/constants'; import GlassCard from '../components/ui/GlassCard';

export default function FollowUpCenter() {
  const identity = useAuth(); const [activities, setActivities] = useState([]); const [bucket, setBucket] = useState(FOLLOW_UP_BUCKETS.TODAY);
  useEffect(() => subscribeActivities(identity, setActivities, (reason) => console.error(reason)), [identity]);
  const counts = useMemo(() => activities.reduce((result, item) => { const value = bucketFollowUp(item); if (value) result[value] += 1; return result; }, { overdue: 0, today: 0, upcoming: 0 }), [activities]);
  const shown = activities.filter((item) => bucketFollowUp(item) === bucket);
  return <><Navbar title="ສູນຕິດຕາມຕໍ່"/><main className="page-content"><div className="summary-grid">{Object.values(FOLLOW_UP_BUCKETS).map((item) => <GlassCard as="button" type="button" key={item} className={`summary-card ${bucket === item ? 'active' : ''}`} onClick={() => setBucket(item)}><span>{followUpBucketLabel(item)}</span><strong>{counts[item]}</strong></GlassCard>)}</div><section className="activity-list mt-5">{shown.map((item) => <ActivityCard activity={item} key={item.id}/>)}{!shown.length && <div className="page-state">ບໍ່ມີວຽກຕິດຕາມໃນກຸ່ມນີ້</div>}</section></main></>;
}
