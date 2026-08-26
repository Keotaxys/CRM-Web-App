import { forwardRef } from 'react';

const IconButton = forwardRef(function IconButton(
  { label, tone = 'neutral', size = 'md', href, className = '', children, ...props },
  ref,
) {
  const classes = `ui-icon-button ui-icon-button--${tone} ui-icon-button--${size} ${className}`.trim();

  if (href) {
    return (
      <a ref={ref} href={href} className={classes} aria-label={label} {...props}>
        {children}
      </a>
    );
  }

  return (
    <button ref={ref} {...props} type="button" className={classes} aria-label={label}>
      {children}
    </button>
  );
});

export default IconButton;
