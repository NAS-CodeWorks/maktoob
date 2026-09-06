import {
  type KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import type { SelectOption, SelectProps } from '../../types/ui';
import { Field } from './Field';

export function Select<T = string | number>({
  id: externalId,
  name,
  label,
  error,
  helperText,
  required = false,
  disabled = false,
  options,
  value,
  defaultValue,
  onChange,
  placeholder = 'اختر من القائمة...',
  className = '',
  wrapperClassName = '',
  clearable = false,
  emptyText = 'لا توجد خيارات متاحة',
  ariaLabel,
}: SelectProps<T>) {
  const generatedId = useId();
  const id = externalId ?? generatedId;
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Controlled or uncontrolled support without effect state synchronization
  const [uncontrolledValue, setUncontrolledValue] = useState<T | undefined>(defaultValue);
  const currentValue = value !== undefined ? value : uncontrolledValue;

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const selectedOption = options.find((opt) => opt.value === currentValue);

  const openMenu = () => {
    if (disabled) return;
    const selectedIdx = options.findIndex((opt) => opt.value === currentValue);
    setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);
    setIsOpen(true);
  };

  const closeMenu = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const toggleMenu = () => {
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Auto-scroll highlighted option into view
  useEffect(() => {
    if (isOpen && listboxRef.current && highlightedIndex >= 0) {
      const items = listboxRef.current.querySelectorAll<HTMLLIElement>('[role="option"]');
      const targetItem = items[highlightedIndex];
      if (targetItem) {
        targetItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const selectOption = (opt: SelectOption<T>) => {
    if (opt.disabled) return;
    if (value === undefined) {
      setUncontrolledValue(opt.value);
    }
    onChange?.(opt.value);
    closeMenu();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (value === undefined) {
      setUncontrolledValue(undefined);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onChange?.(undefined as any);
    setIsOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement | HTMLUListElement>) => {
    if (disabled) return;

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        if (!isOpen) {
          openMenu();
        } else {
          setHighlightedIndex((prev) => {
            const next = prev + 1;
            return next >= options.length ? 0 : next;
          });
        }
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        if (!isOpen) {
          openMenu();
        } else {
          setHighlightedIndex((prev) => {
            const next = prev - 1;
            return next < 0 ? options.length - 1 : next;
          });
        }
        break;
      }
      case 'Home': {
        if (isOpen) {
          e.preventDefault();
          setHighlightedIndex(0);
        }
        break;
      }
      case 'End': {
        if (isOpen) {
          e.preventDefault();
          setHighlightedIndex(options.length - 1);
        }
        break;
      }
      case 'Enter':
      case ' ': {
        if (isOpen && highlightedIndex >= 0 && highlightedIndex < options.length) {
          e.preventDefault();
          const target = options[highlightedIndex];
          if (target && !target.disabled) {
            selectOption(target);
          }
        } else if (!isOpen && e.key === ' ') {
          e.preventDefault();
          openMenu();
        }
        break;
      }
      case 'Escape': {
        if (isOpen) {
          e.preventDefault();
          closeMenu();
        }
        break;
      }
      case 'Tab': {
        if (isOpen) {
          setIsOpen(false);
        }
        break;
      }
    }
  };

  const selectNode = (
    <div
      ref={containerRef}
      className={`maktoob-select ${isOpen ? 'is-open' : ''} ${className}`.trim()}
    >
      <button
        ref={triggerRef}
        id={id}
        name={name}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`${id}-listbox`}
        aria-invalid={Boolean(error)}
        aria-label={ariaLabel}
        aria-describedby={
          error ? `${id}-error` : helperText ? `${id}-helper` : undefined
        }
        disabled={disabled}
        className={`maktoob-select-trigger ${error ? 'has-error' : ''}`}
        onClick={toggleMenu}
        onKeyDown={handleKeyDown}
      >
        <span
          className={`maktoob-select-value ${!selectedOption ? 'is-placeholder' : ''}`}
        >
          {selectedOption ? (
            <span className="maktoob-select-option-label">
              {selectedOption.icon && <span>{selectedOption.icon}</span>}
              <span>{selectedOption.label}</span>
              {selectedOption.badge && (
                <span className="maktoob-select-option-badge">
                  {selectedOption.badge}
                </span>
              )}
            </span>
          ) : (
            placeholder
          )}
        </span>

        <span className="maktoob-select-affordance" aria-hidden="true">
          {clearable && selectedOption && !disabled ? (
            <span
              role="button"
              className="maktoob-input-clear-btn"
              onClick={handleClear}
              title="مسح الاختيار"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="4" x2="4" y2="12" />
                <line x1="4" y1="4" x2="12" y2="12" />
              </svg>
            </span>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="4 6 8 10 12 6" />
            </svg>
          )}
        </span>
      </button>

      {isOpen && (
        <ul
          ref={listboxRef}
          id={`${id}-listbox`}
          role="listbox"
          tabIndex={-1}
          className="maktoob-select-listbox"
          aria-labelledby={id}
          onKeyDown={handleKeyDown}
        >
          {options.length === 0 ? (
            <li className="maktoob-select-empty">{emptyText}</li>
          ) : (
            options.map((opt, index) => {
              const isSelected = opt.value === currentValue;
              const isHighlighted = index === highlightedIndex;

              return (
                <li
                  key={String(opt.value)}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={opt.disabled}
                  className={`maktoob-select-option ${
                    isSelected ? 'is-selected' : ''
                  } ${isHighlighted ? 'is-highlighted' : ''} ${
                    opt.disabled ? 'is-disabled' : ''
                  }`.trim()}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => selectOption(opt)}
                >
                  <div className="maktoob-select-option-content">
                    <div className="maktoob-select-option-label">
                      {opt.icon && <span>{opt.icon}</span>}
                      <span>{opt.label}</span>
                      {opt.badge && (
                        <span className="maktoob-select-option-badge">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    {opt.description && (
                      <span className="maktoob-select-option-description">
                        {opt.description}
                      </span>
                    )}
                  </div>

                  {isSelected && (
                    <span className="maktoob-select-option-check" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );

  if (label || error || helperText) {
    return (
      <Field
        id={id}
        label={label}
        required={required}
        error={error}
        helperText={helperText}
        disabled={disabled}
        className={wrapperClassName}
      >
        {selectNode}
      </Field>
    );
  }

  return selectNode;
}
