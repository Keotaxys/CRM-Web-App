import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import CustomerCard from '../components/CustomerCard';
import CustomerFilters from './CustomerFilters';
import { useAuth } from '../auth/useAuth';
import { changeCustomerStatus, subscribeCustomers } from '../services/customersService';
import { syncLegacyCustomer } from '../services/webhookService';

export default function CustomersPage() {
  const identity = useAuth(); const [customers, setCustomers] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [filters, setFilters] = useState({ search: '', status: 'ທັງໝົດ', priority: 'ທັງໝົດ' });
  useEffect(() => subscribeCustomers(identity, (items) => { setCustomers(items); setLoading(false); }, (reason) => { console.error(reason); setError('ບໍ່ສາມາດໂຫຼດລູກຄ້າໄດ້'); setLoading(false); }), [identity]);
  const filtered = useMemo(() => customers.filter((customer) => {
    const term = filters.search.toLowerCase();
    return (filters.status === 'ທັງໝົດ' || customer.status === filters.status) && (filters.priority === 'ທັງໝົດ' || customer.priority === filters.priority) && [customer.name, customer.phone, customer.address, customer.note].some((value) => value?.toLowerCase().includes(term));
  }), [customers, filters]);
  const updateStatus = async (id, status) => {
    await changeCustomerStatus(id, status, identity);
    syncLegacyCustomer(id, 'status_changed').catch((reason) => console.error('Legacy sync failed', reason));
  };
  return <><Navbar title="ລູກຄ້າ"/><main className="page-content"><CustomerFilters filters={filters} onChange={setFilters}/>{error && <div className="error-banner" role="alert">{error}</div>}
    {loading ? <div className="page-state">ກຳລັງໂຫຼດ...</div> : filtered.length === 0 ? <div className="page-state">ບໍ່ພົບຂໍ້ມູນລູກຄ້າ</div> : <section className="customer-grid">{filtered.map((customer) => <CustomerCard key={customer.id} customer={customer} onStatusChange={updateStatus}/>)}</section>}
  </main></>;
}
