import { forwardRef, useCallback, useRef } from 'react';

const DateField = forwardRef(function DateField(
  {
    id,
    type = 'date',
    label,
    value,
    onChange,
    error,
    hint,
    min,
    max,
    required = false,
    disabled = false,
  },
  forwardedRef,
) {
  const inputRef = useRef(null);
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;

  const setInputRef = useCallback((node) => {
    inputRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);

  const openPicker = () => {
    const input = inputRef.current;
    if (!input || disabled) return;

    input.focus();
    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker();
      } catch {
        // Browsers that reject programmatic picker opening retain the focused native control.
      }
    }
  };

  return (
    <div className="ui-field ui-date-field">
      <label className="ui-field__label" htmlFor={id}>{label}</label>
      <div className="ui-date-field__control">
        <input
          ref={setInputRef}
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          required={required}
          disabled={disabled}
          className="ui-input ui-date-field__input"
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
        />
        <button
          type="button"
          className="ui-date-field__picker"
          aria-label={`ເປີດປະຕິທິນ ${label}`}
          onClick={openPicker}
          disabled={disabled}
        >
          <span className="material-symbols-outlined" aria-hidden="true">calendar_month</span>
        </button>
      </div>
      {hint ? <p id={`${id}-hint`} className="ui-field__hint">{hint}</p> : null}
      {error ? <p id={`${id}-error`} className="ui-field__error" role="alert">{error}</p> : null}
    </div>
  );
});

export default DateField;
