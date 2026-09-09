import { useState } from 'react';
import { CUSTOMER_STATUSES, PRIORITIES } from '../shared/constants';
import { BRANCHES } from '../branches/branches';
import CameraUpload from '../components/CameraUpload';
import Button from '../components/ui/Button';
import CustomSelect from '../components/ui/CustomSelect';
import GlassCard from '../components/ui/GlassCard';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import DateField from '../components/ui/DateField';
import { birthDateFromInput, birthDateToInput } from '../shared/birthday';
import { laosTodayKey } from '../shared/dateTime';

const GOOGLE_MAPS_HOME = 'https://www.google.com/maps';
const statusOptions = CUSTOMER_STATUSES.map((value) => ({ value, label: value }));
const priorityOptions = PRIORITIES.map((value) => ({ value, label: value }));
const branchOptions = BRANCHES.map((branch) => ({ value: branch.id, label: branch.label }));

export default function CustomerForm({ initial = {}, onSubmit, busy = false, admin = false, locationProvider = globalThis.navigator?.geolocation }) {
  const [values, setValues] = useState({
    name: '',
    phone: '',
    address: '',
    status: CUSTOMER_STATUSES[0],
    priority: PRIORITIES[0],
    note: '',
    gps: '',
    branchId: '010',
    ...initial,
    birthDateInput: birthDateToInput(initial.birthDate),
  });
  const [customerPhoto, setCustomerPhoto] = useState(null); const [placePhoto, setPlacePhoto] = useState(null);
  const [locating, setLocating] = useState(false); const [locationStatus, setLocationStatus] = useState(null);
  const field = (name) => ({ value: values[name] ?? '', onChange: (event) => setValues({ ...values, [name]: event.target.value }) });
  const useCurrentLocation = () => {
    setLocationStatus(null);
    if (!locationProvider?.getCurrentPosition) {
      setLocationStatus({ error: true, message: 'ອຸປະກອນນີ້ບໍ່ຮອງຮັບການດຶງຕຳແໜ່ງ.' });
      return;
    }
    setLocating(true);
    try {
      locationProvider.getCurrentPosition(
        ({ coords }) => {
          const mapUrl = `${GOOGLE_MAPS_HOME}?q=${coords.latitude},${coords.longitude}`;
          setValues((current) => ({ ...current, gps: mapUrl }));
          setLocationStatus({ error: false, message: 'ດຶງຕຳແໜ່ງປັດຈຸບັນແລ້ວ' });
          setLocating(false);
        },
        (error) => {
          const message = error?.code === 1
            ? 'ກະລຸນາອະນຸຍາດໃຫ້ເຂົ້າເຖິງຕຳແໜ່ງ ແລ້ວລອງໃໝ່.'
            : error?.code === 3
              ? 'ການດຶງຕຳແໜ່ງໃຊ້ເວລາດົນເກີນໄປ. ກະລຸນາລອງໃໝ່.'
              : 'ບໍ່ສາມາດຫາຕຳແໜ່ງປັດຈຸບັນໄດ້. ກະລຸນາລອງໃໝ່.';
          setLocationStatus({ error: true, message });
          setLocating(false);
        },
        { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
      );
    } catch {
      setLocationStatus({ error: true, message: 'ບໍ່ສາມາດຫາຕຳແໜ່ງປັດຈຸບັນໄດ້. ກະລຸນາລອງໃໝ່.' });
      setLocating(false);
    }
  };
  const mapHref = /^https?:\/\//i.test(values.gps) ? values.gps : GOOGLE_MAPS_HOME;
  const submit = (event) => {
    event.preventDefault();
    const payload = {
      ...values,
      birthDate: birthDateFromInput(values.birthDateInput),
    };
    delete payload.birthDateInput;
    onSubmit(payload, { customerPhoto, placePhoto });
  };

  return <GlassCard as="form" padded className="form-stack" onSubmit={submit}>
    <div className="form-grid"><Input id="customer-name" label="ຊື່ລູກຄ້າ" required {...field('name')}/><Input id="customer-phone" label="ເບີໂທ" required {...field('phone')}/></div>
    {admin && !initial.id && <CustomSelect id="customer-branch" label="ສາຂາ" value={values.branchId} onChange={(nextValue) => setValues({ ...values, branchId: nextValue })} options={branchOptions}/>}
    <Textarea id="customer-address" label="ທີ່ຢູ່" rows="2" {...field('address')}/><div className="form-grid"><CustomSelect id="customer-status" label="ສະຖານະ" value={values.status} onChange={(nextValue) => setValues({ ...values, status: nextValue })} options={statusOptions}/><CustomSelect id="customer-priority" label="ຄວາມສຳຄັນ" value={values.priority} onChange={(nextValue) => setValues({ ...values, priority: nextValue })} options={priorityOptions}/></div>
    <div className="birth-date-field"><DateField id="customer-birth-date" type="date" label="ວັນເກີດ (ບໍ່ບັງຄັບ)" value={values.birthDateInput} max={laosTodayKey()} onChange={(event) => setValues({ ...values, birthDateInput: event.target.value })}/>{values.birthDateInput && <Button variant="neutral" size="sm" type="button" onClick={() => setValues({ ...values, birthDateInput: '' })}>ລ້າງວັນເກີດ</Button>}</div>
    <Textarea id="customer-note" label="ໝາຍເຫດ" rows="3" {...field('note')}/>
    <div className="location-field"><Input id="customer-gps" label="ລິ້ງແຜນທີ່ / ພິກັດ GPS" type="url" inputMode="url" {...field('gps')}/><div className="location-actions"><Button variant="secondary" disabled={locating} onClick={useCurrentLocation}><span className="material-symbols-outlined" aria-hidden="true">my_location</span>{locating ? 'ກຳລັງດຶງຕຳແໜ່ງ...' : 'ໃຊ້ຕຳແໜ່ງປັດຈຸບັນ'}</Button><a className="ui-button ui-button--neutral ui-button--md" href={mapHref} target="_blank" rel="noreferrer"><span className="material-symbols-outlined" aria-hidden="true">map</span>ເປີດແຜນທີ່</a></div>{locationStatus && <p role={locationStatus.error ? 'alert' : 'status'} className={locationStatus.error ? 'location-message error' : 'location-message success'}>{locationStatus.message}</p>}</div>
    <div className="form-grid"><CameraUpload label="ຮູບລູກຄ້າ" actionLabel="ເລືອກຮູບລູກຄ້າ" changeActionLabel="ປ່ຽນຮູບລູກຄ້າ" file={customerPhoto} onChange={setCustomerPhoto}/><CameraUpload label="ຮູບຮ້ານ / ສະຖານທີ່" actionLabel="ເລືອກຮູບຮ້ານ ຫຼື ສະຖານທີ່" changeActionLabel="ປ່ຽນຮູບຮ້ານ ຫຼື ສະຖານທີ່" file={placePhoto} onChange={setPlacePhoto}/></div>
    <p className="helper-text">ຮູບຈະຖືກບີບອັດ ແລະຈັດການໃນ 2 ຊ່ອງເທົ່ານັ້ນ.</p><Button type="submit" busy={busy}>{busy ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກ'}</Button>
  </GlassCard>;
}
