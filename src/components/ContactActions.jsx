import { customerQuickActions } from '../shared/quickActions';
import WhatsAppIcon from './icons/WhatsAppIcon';
import IconButton from './ui/IconButton';

export default function ContactActions({ customer, size = 'compact', showLabels = false, className = '' }) {
  const actions = customerQuickActions(customer);
  const iconSize = size === 'compact' ? 'sm' : 'md';
  const classes = `contact-actions contact-actions--${size} ${className}`.trim();

  return (
    <div className={classes}>
      {actions.call && <IconButton href={actions.call} label="ໂທຫາລູກຄ້າ" tone="gray" size={iconSize} className="contact-action--call"><span className="material-symbols-outlined filled" aria-hidden="true">call</span>{showLabels && <span>ໂທ</span>}</IconButton>}
      {actions.whatsapp && <IconButton href={actions.whatsapp} label="ຕິດຕໍ່ຜ່ານ WhatsApp" tone="teal" size={iconSize} className="contact-action--whatsapp" target="_blank" rel="noreferrer"><WhatsAppIcon className="contact-action__whatsapp-icon" />{showLabels && <span>WhatsApp</span>}</IconButton>}
      {actions.map && <IconButton href={actions.map} label="ເປີດແຜນທີ່ລູກຄ້າ" tone="gray" size={iconSize} className="contact-action--map" target="_blank" rel="noreferrer"><span className="material-symbols-outlined filled" aria-hidden="true">location_on</span>{showLabels && <span>ແຜນທີ່</span>}</IconButton>}
    </div>
  );
}
