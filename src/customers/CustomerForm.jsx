import { useState } from 'react';
import { CUSTOMER_STATUSES, PRIORITIES } from '../shared/constants';
import { BRANCHES } from '../branches/branches';
import CameraUpload from '../components/CameraUpload';

const GOOGLE_MAPS_HOME = 'https://www.google.com/maps';

export default function CustomerForm({ initial = {}, onSubmit, busy = false, admin = false, locationProvider = globalThis.navigator?.geolocation }) {
  const [values, setValues] = useState({ name: '', phone: '', address: '', status: CUSTOMER_STATUSES[0], priority: PRIORITIES[0], note: '', gps: '', branchId: '010', ...initial });
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
  return <form className="form-stack panel" onSubmit={(event) => { event.preventDefault(); onSubmit(values, { customerPhoto, placePhoto }); }}>
    <div className="form-grid"><label>ຊື່ລູກຄ້າ<input required {...field('name')}/></label><label>ເບີໂທ<input required {...field('phone')}/></label></div>{admin && !initial.id && <label>ສາຂາ<select {...field('branchId')}>{BRANCHES.map((branch) => <option key={branch.id} value={branch.id}>{branch.label}</option>)}</select></label>}
    <label>ທີ່ຢູ່<textarea rows="2" {...field('address')}/></label><div className="form-grid"><label>ສະຖານະ<select {...field('status')}>{CUSTOMER_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></label><label>ຄວາມສຳຄັນ<select {...field('priority')}>{PRIORITIES.map((item) => <option key={item}>{item}</option>)}</select></label></div>
    <label>ໝາຍເຫດ<textarea rows="3" {...field('note')}/></label>
    <div className="location-field"><label>ລິ້ງແຜນທີ່ / ພິກັດ GPS<input type="url" inputMode="url" {...field('gps')}/></label><div className="location-actions"><button type="button" className="btn-secondary" disabled={locating} onClick={useCurrentLocation}><span className="material-symbols-outlined" aria-hidden="true">my_location</span>{locating ? 'ກຳລັງດຶງຕຳແໜ່ງ...' : 'ໃຊ້ຕຳແໜ່ງປັດຈຸບັນ'}</button><a className="btn-ghost" href={mapHref} target="_blank" rel="noreferrer"><span className="material-symbols-outlined" aria-hidden="true">map</span>ເປີດແຜນທີ່</a></div>{locationStatus && <p role={locationStatus.error ? 'alert' : 'status'} className={locationStatus.error ? 'location-message error' : 'location-message success'}>{locationStatus.message}</p>}</div>
    <div className="form-grid"><CameraUpload label="ຮູບລູກຄ້າ" actionLabel="ເລືອກຮູບລູກຄ້າ" changeActionLabel="ປ່ຽນຮູບລູກຄ້າ" file={customerPhoto} onChange={setCustomerPhoto}/><CameraUpload label="ຮູບຮ້ານ / ສະຖານທີ່" actionLabel="ເລືອກຮູບຮ້ານ ຫຼື ສະຖານທີ່" changeActionLabel="ປ່ຽນຮູບຮ້ານ ຫຼື ສະຖານທີ່" file={placePhoto} onChange={setPlacePhoto}/></div>
    <p className="helper-text">ຮູບຈະຖືກບີບອັດ ແລະຈັດການໃນ 2 ຊ່ອງເທົ່ານັ້ນ.</p><button className="btn-primary" disabled={busy}>{busy ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກ'}</button>
  </form>;
}
