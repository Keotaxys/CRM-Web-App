import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const choices = [
  ['/customers/new', 'person_add', 'ລູກຄ້າ'],
  ['/activities/new/appointment', 'event', 'ນັດໝາຍ'],
  ['/activities/new/event', 'campaign', 'ກິດຈະກຳ'],
  ['/activities/new/customer_visit', 'handshake', 'ການຢ້ຽມລູກຄ້າ'],
];

export default function QuickCreate() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const selectChoice = (path) => {
    setOpen(false);
    navigate(path);
  };
  return <>
    <button className="quick-create" aria-label="ສ້າງລາຍການໃໝ່" onClick={() => setOpen(true)}>＋</button>
    {open && <div className="modal-backdrop" onClick={() => setOpen(false)}><section className="quick-sheet" role="dialog" aria-modal="true" aria-label="ສ້າງລາຍການໃໝ່" onClick={(event) => event.stopPropagation()}>
      <div className="sheet-handle"/><h2 className="text-lg font-extrabold mb-4">ສ້າງໃໝ່</h2>
      <div className="grid grid-cols-2 gap-3">{choices.map(([path, icon, label]) => <button key={path} className="quick-choice" onClick={() => selectChoice(path)}><span className="material-symbols-outlined text-2xl" aria-hidden="true">{icon}</span>{label}</button>)}</div>
      <button className="btn-ghost w-full mt-4" onClick={() => setOpen(false)}>ປິດ</button>
    </section></div>}
  </>;
}
