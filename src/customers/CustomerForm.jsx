import { useState } from 'react';
import { CUSTOMER_STATUSES, PRIORITIES } from '../shared/constants';
import { BRANCHES } from '../branches/branches';

export default function CustomerForm({ initial = {}, onSubmit, busy = false, admin = false }) {
  const [values, setValues] = useState({ name: '', phone: '', address: '', status: CUSTOMER_STATUSES[0], priority: PRIORITIES[0], note: '', gps: '', branchId: '010', ...initial });
  const [customerPhoto, setCustomerPhoto] = useState(null); const [placePhoto, setPlacePhoto] = useState(null);
  const field = (name) => ({ value: values[name] ?? '', onChange: (event) => setValues({ ...values, [name]: event.target.value }) });
  return <form className="form-stack panel" onSubmit={(event) => { event.preventDefault(); onSubmit(values, { customerPhoto, placePhoto }); }}>
    <div className="form-grid"><label>ຊື່ລູກຄ້າ<input required {...field('name')}/></label><label>ເບີໂທ<input required {...field('phone')}/></label></div>{admin && !initial.id && <label>ສາຂາ<select {...field('branchId')}>{BRANCHES.map((branch) => <option key={branch.id} value={branch.id}>{branch.label}</option>)}</select></label>}
    <label>ທີ່ຢູ່<textarea rows="2" {...field('address')}/></label><div className="form-grid"><label>ສະຖານະ<select {...field('status')}>{CUSTOMER_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></label><label>ຄວາມສຳຄັນ<select {...field('priority')}>{PRIORITIES.map((item) => <option key={item}>{item}</option>)}</select></label></div>
    <label>ໝາຍເຫດ<textarea rows="3" {...field('note')}/></label><label>Google Maps / GPS URL<input type="url" {...field('gps')}/></label>
    <div className="form-grid"><label>ຮູບລູກຄ້າ<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setCustomerPhoto(event.target.files[0] ?? null)}/></label><label>ຮູບຮ້ານ / ສະຖານທີ່<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPlacePhoto(event.target.files[0] ?? null)}/></label></div>
    <p className="text-xs text-slate-500">ຮູບຈະຖືກບີບອັດ ແລະຈັດການໃນ 2 ຊ່ອງເທົ່ານັ້ນ.</p><button className="btn-primary" disabled={busy}>{busy ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກ'}</button>
  </form>;
}
