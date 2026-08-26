import { forwardRef } from 'react';

const StatusBadge = forwardRef(function StatusBadge(
  { kind, value, label, className = '' },
  ref,
) {
  return (
    <span
      ref={ref}
      className={`ui-status-badge ${className}`.trim()}
      data-kind={kind}
      data-status={value}
    >
      {label}
    </span>
  );
});

export default StatusBadge;
