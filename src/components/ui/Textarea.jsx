import { forwardRef } from 'react';

const Textarea = forwardRef(function Textarea(
  { id, label, error, hint, className = '', ...textareaProps },
  ref,
) {
  const describedBy = [
    textareaProps['aria-describedby'],
    hint && `${id}-hint`,
    error && `${id}-error`,
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div className="ui-field">
      <label className="ui-field__label" htmlFor={id}>{label}</label>
      <textarea
        ref={ref}
        {...textareaProps}
        id={id}
        className={`ui-textarea ${className}`.trim()}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
      />
      {hint ? <p id={`${id}-hint`} className="ui-field__hint">{hint}</p> : null}
      {error ? <p id={`${id}-error`} className="ui-field__error" role="alert">{error}</p> : null}
    </div>
  );
});

export default Textarea;
