import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]:not([contenteditable="false"]):not([tabindex="-1"])',
].join(',');

function getFocusableElements(dialog) {
  return [...dialog.querySelectorAll(FOCUSABLE_SELECTOR)].filter((element) => {
    if (element.disabled || element.hidden || element.hasAttribute('disabled')) return false;
    if (element.getAttribute('aria-disabled') === 'true') return false;
    if (element.closest('[aria-hidden="true"], [hidden], [inert]')) return false;
    const style = window.getComputedStyle?.(element);
    return style?.display !== 'none' && style?.visibility !== 'hidden';
  });
}

export default function ModalSheet({
  open,
  onClose,
  title,
  description,
  mobileSheet = false,
  initialFocusRef,
  children,
  footer,
}) {
  const dialogRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const previousOverflowRef = useRef('');
  const onCloseRef = useRef(onClose);
  const generatedId = useId();
  const titleId = `modal-sheet-${generatedId}-title`;
  const descriptionId = `modal-sheet-${generatedId}-description`;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocusedRef.current = document.activeElement;
    previousOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const initialFocus = initialFocusRef?.current;
    const firstFocusable = getFocusableElements(dialogRef.current)[0];
    (initialFocus || firstFocusable || dialogRef.current)?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCloseRef.current?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements(dialogRef.current);
      if (!focusableElements.length) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (!dialogRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const handleFocusIn = (event) => {
      const dialog = dialogRef.current;
      if (!dialog || dialog.contains(event.target)) return;

      const focusableElements = getFocusableElements(dialog);
      const target = focusableElements[0] || dialog;
      if (target !== document.activeElement) target.focus();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn, true);
      document.body.style.overflow = previousOverflowRef.current;
      previouslyFocusedRef.current?.focus?.();
    };
  }, [initialFocusRef, open]);

  if (!open) return null;

  return createPortal(
    <div className="ui-modal-sheet__backdrop" onClick={(event) => {
      if (event.target === event.currentTarget) onClose?.();
    }}>
      <section
        ref={dialogRef}
        className={`ui-modal-sheet ${mobileSheet ? 'ui-modal-sheet--mobile-sheet' : ''}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex="-1"
      >
        {mobileSheet ? <div className="ui-modal-sheet__handle" aria-hidden="true" /> : null}
        <header className="ui-modal-sheet__header">
          <h2 id={titleId} className="ui-modal-sheet__title">{title}</h2>
          {description ? <p id={descriptionId} className="ui-modal-sheet__description">{description}</p> : null}
        </header>
        <div className="ui-modal-sheet__content">{children}</div>
        {footer ? <footer className="ui-modal-sheet__footer">{footer}</footer> : null}
      </section>
    </div>,
    document.body,
  );
}
