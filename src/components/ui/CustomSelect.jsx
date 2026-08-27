import { forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const EMPTY_STATE = 'ບໍ່ພົບລາຍການ';

function firstEnabledIndex(options) {
  return options.findIndex((option) => !option.disabled);
}

function nextEnabledIndex(options, currentIndex, direction) {
  if (!options.length) return -1;

  for (let offset = 1; offset <= options.length; offset += 1) {
    const index = (currentIndex + (offset * direction) + options.length) % options.length;
    if (!options[index].disabled) return index;
  }

  return -1;
}

const CustomSelect = forwardRef(function CustomSelect(
  {
    id,
    label,
    ariaLabel,
    value,
    options,
    onChange,
    placeholder = '— Select —',
    disabled = false,
    required = false,
    error,
    compact = false,
    className = '',
    searchable = false,
    searchPlaceholder = 'ຄົ້ນຫາ',
  },
  forwardedRef,
) {
  const generatedId = useId();
  const controlId = id || `select-${generatedId}`;
  const listboxId = `${controlId}-listbox`;
  const triggerRef = useRef(null);
  const rootRef = useRef(null);
  const popoverRef = useRef(null);
  const disabledRef = useRef(disabled);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [popoverStyle, setPopoverStyle] = useState({});
  const [sheet, setSheet] = useState(false);
  const [previousDisabled, setPreviousDisabled] = useState(disabled);

  if (disabled !== previousDisabled) {
    setPreviousDisabled(disabled);
    if (disabled) {
      setOpen(false);
      setQuery('');
      setActiveIndex(-1);
    }
  }

  const selectedOption = options.find((option) => option.value === value);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredOptions = searchable && normalizedQuery
    ? options.filter((option) => `${option.label} ${option.searchText || ''}`.toLocaleLowerCase().includes(normalizedQuery))
    : options;
  const activeOption = filteredOptions[activeIndex];
  const accessibleLabel = ariaLabel || label;
  const describedBy = error ? `${controlId}-error` : undefined;

  const focusTrigger = useCallback(() => {
    const focus = () => triggerRef.current?.focus();
    focus();
    if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(focus);
  }, []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const isSheet = window.matchMedia?.('(max-width: 430px)').matches ?? false;
    setSheet(isSheet);
    if (isSheet) {
      setPopoverStyle({});
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const showBelow = spaceBelow >= spaceAbove;
    const width = Math.min(rect.width, window.innerWidth - 16);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    const maxHeight = Math.max(0, Math.min(320, (showBelow ? spaceBelow : spaceAbove) - 16));

    setPopoverStyle(showBelow
      ? { left, top: Math.min(rect.bottom + 4, viewportHeight - 8), width, maxHeight }
      : { bottom: Math.min(viewportHeight - rect.top + 4, viewportHeight - 8), left, width, maxHeight });
  }, []);

  const closeMenu = useCallback(({ restoreFocus = false } = {}) => {
    setOpen(false);
    setQuery('');
    setActiveIndex(-1);
    if (restoreFocus) focusTrigger();
  }, [focusTrigger]);

  const openMenu = useCallback(() => {
    if (disabled) return;
    const selectedIndex = options.findIndex((option) => option.value === value && !option.disabled);
    setQuery('');
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabledIndex(options));
    updatePosition();
    setOpen(true);
  }, [disabled, options, updatePosition, value]);

  const choose = useCallback((option) => {
    if (disabledRef.current || !option || option.disabled) return;
    onChange(option.value);
    closeMenu({ restoreFocus: true });
  }, [closeMenu, onChange]);

  const moveActive = useCallback((direction) => {
    setActiveIndex((currentIndex) => {
      const startIndex = currentIndex < 0 ? (direction > 0 ? -1 : 0) : currentIndex;
      return nextEnabledIndex(filteredOptions, startIndex, direction);
    });
  }, [filteredOptions]);

  const handleKeyDown = (event) => {
    if (disabled) return;

    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        openMenu();
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(firstEnabledIndex(filteredOptions));
    } else if (event.key === 'End') {
      event.preventDefault();
      const reversedIndex = [...filteredOptions].reverse().findIndex((option) => !option.disabled);
      setActiveIndex(reversedIndex < 0 ? -1 : filteredOptions.length - reversedIndex - 1);
    } else if (event.key === 'Enter' || (event.key === ' ' && (!searchable || !query))) {
      event.preventDefault();
      choose(activeOption);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu({ restoreFocus: true });
    } else if (event.key === 'Tab') {
      closeMenu();
    }
  };

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDownOutside = (event) => {
      const target = event.target;
      if (!rootRef.current?.contains(target) && !popoverRef.current?.contains(target)) closeMenu();
    };
    const handleDocumentKeyDown = (event) => {
      if (event.defaultPrevented) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu({ restoreFocus: true });
      } else if (event.key === 'Tab') {
        closeMenu();
      }
    };

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    document.addEventListener('pointerdown', handlePointerDownOutside);
    document.addEventListener('keydown', handleDocumentKeyDown);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('pointerdown', handlePointerDownOutside);
      document.removeEventListener('keydown', handleDocumentKeyDown);
    };
  }, [closeMenu, open, updatePosition]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const setTriggerRef = useCallback((node) => {
    triggerRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);

  const handleSearchChange = (event) => {
    const nextQuery = event.target.value;
    setQuery(nextQuery);
    const normalizedNextQuery = nextQuery.trim().toLocaleLowerCase();
    const nextOptions = normalizedNextQuery
      ? options.filter((option) => `${option.label} ${option.searchText || ''}`.toLocaleLowerCase().includes(normalizedNextQuery))
      : options;
    setActiveIndex(firstEnabledIndex(nextOptions));
  };

  const popup = open ? createPortal(
    <div
      ref={popoverRef}
      className={`ui-select-popover ${sheet ? 'ui-select-popover--sheet' : ''}`.trim()}
      style={popoverStyle}
    >
      <div id={listboxId} className="ui-select__listbox" role="listbox" aria-label={accessibleLabel}>
        {filteredOptions.map((option, index) => (
          <button
            key={option.value}
            id={`${controlId}-option-${option.value}`}
            type="button"
            role="option"
            className={`ui-select__option ${index === activeIndex ? 'is-active' : ''}`.trim()}
            aria-selected={option.value === value}
            aria-disabled={disabled || option.disabled || undefined}
            disabled={disabled || option.disabled}
            onClick={() => choose(option)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {filteredOptions.length === 0 ? <p className="ui-select__empty" role="status">{EMPTY_STATE}</p> : null}
    </div>,
    document.body,
  ) : null;

  const commonProps = {
    ref: setTriggerRef,
    id: controlId,
    className: 'ui-select-trigger',
    role: 'combobox',
    disabled,
    'aria-expanded': open,
    'aria-label': ariaLabel,
    'aria-controls': listboxId,
    'aria-haspopup': 'listbox',
    'aria-required': required || undefined,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    'aria-activedescendant': open && activeOption ? `${controlId}-option-${activeOption.value}` : undefined,
    onKeyDown: handleKeyDown,
    onClick: open ? undefined : openMenu,
  };

  return (
    <div ref={rootRef} className={`ui-field ui-select ${compact ? 'ui-select--compact' : ''} ${className}`.trim()}>
      {label ? <label className="ui-field__label" htmlFor={controlId}>{label}</label> : null}
      {searchable ? (
        <input
          {...commonProps}
          type="text"
          value={open ? query : selectedOption?.label || ''}
          placeholder={searchPlaceholder}
          aria-autocomplete="list"
          onChange={handleSearchChange}
        />
      ) : (
        <button {...commonProps} type="button">
          <span>{selectedOption?.label || placeholder}</span>
          <span className="ui-select-trigger__icon" aria-hidden="true">⌄</span>
        </button>
      )}
      {error ? <p id={`${controlId}-error`} className="ui-field__error" role="alert">{error}</p> : null}
      {popup}
    </div>
  );
});

export default CustomSelect;
