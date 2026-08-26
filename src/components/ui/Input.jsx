import { forwardRef } from 'react';

const Input = forwardRef(function Input(
  { id, label, error, hint, className = '', ...inputProps },
  ref,
) {
  const describedBy = [
    inputProps['aria-describedby'],
    hint && `${id}-hint`,
    error && `${id}-error`,
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div className="ui-field">
      <label className="ui-field__label" htmlFor={id}>{label}</label>
      <input
        ref={ref}
        {...inputProps}
        id={id}
        className={`ui-input ${className}`.trim()}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
      />
      {hint ? <p id={`${id}-hint`} className="ui-field__hint">{hint}</p> : null}
      {error ? <p id={`${id}-error`} className="ui-field__error" role="alert">{error}</p> : null}
    </div>
  );
});

export default Input;
