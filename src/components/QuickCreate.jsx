import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from './ui/Button';
import IconButton from './ui/IconButton';
import ModalSheet from './ui/ModalSheet';

const choices = [
  ['/customers/new', 'person_add', 'ລູກຄ້າ'],
  ['/activities/new/appointment', 'event', 'ນັດໝາຍ'],
  ['/activities/new/event', 'campaign', 'ກິດຈະກຳ'],
  ['/activities/new/customer_visit', 'handshake', 'ນັດພົບລູກຄ້າ'],
];

export default function QuickCreate() {
  const [open, setOpen] = useState(false);
  const firstChoiceRef = useRef(null);
  const navigate = useNavigate();
  const selectChoice = (path) => {
    setOpen(false);
    navigate(path);
  };

  return <>
    <IconButton className="quick-create" label="ສ້າງລາຍການໃໝ່" tone="teal" onClick={() => setOpen(true)}>
      <span className="material-symbols-outlined" aria-hidden="true">add</span>
    </IconButton>
    <ModalSheet open={open} onClose={() => setOpen(false)} title="ສ້າງໃໝ່" mobileSheet initialFocusRef={firstChoiceRef} footer={<Button variant="neutral" className="w-full" onClick={() => setOpen(false)}>ປິດ</Button>}>
      <div className="quick-create__choices">{choices.map(([path, icon, label], index) => <Button key={path} ref={index === 0 ? firstChoiceRef : undefined} variant="secondary" className="quick-choice" onClick={() => selectChoice(path)}><span className="material-symbols-outlined text-2xl" aria-hidden="true">{icon}</span>{label}</Button>)}</div>
    </ModalSheet>
  </>;
}
