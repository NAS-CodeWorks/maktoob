import {
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import type { ComboboxItem, SearchableComboboxProps } from '../../types/ui';
import { Field } from './Field';

export function SearchableCombobox<T extends ComboboxItem = ComboboxItem>({
  id: externalId,
  label,
  error,
  helperText,
  required = false,
  disabled = false,
  items,
  selectedItem,
  selectedId,
  onSelect,
  placeholder = 'اختر من السجلات أو ابحث...',
  searchPlaceholder = 'ابحث باسم الطرف أو رقم الهاتف أو الهوية...',
  emptyMessage = 'لا توجد نتائج مطابقة',
  loadingMessage = 'جارِ البحث...',
  isLoading = false,
  className = '',
  wrapperClassName = '',
  clearable = true,
  customFilter,
}: SearchableComboboxProps<T>) {
  const generatedId = useId();
  const id = externalId ?? generatedId;
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const debouncedQuery = useDebouncedValue(searchQuery, 150);

  // Determine current active item
  const currentItem = useMemo(() => {
    if (selectedItem !== undefined) return selectedItem;
    if (selectedId !== undefined && selectedId !== null) {
      return items.find((item) => String(item.id) === String(selectedId)) ?? null;
    }
    return null;
  }, [selectedItem, selectedId, items]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return items;
    }
    const q = debouncedQuery.trim().toLowerCase();

    return items.filter((item) => {
      if (customFilter) {
        return customFilter(item, q);
      }
      const nameMatch = item.name.toLowerCase().includes(q);
      const phoneMatch = item.phone ? item.phone.toLowerCase().includes(q) : false;
      const idMatch = item.identifier ? item.identifier.toLowerCase().includes(q) : false;
      const addressMatch = item.address ? item.address.toLowerCase().includes(q) : false;
      return nameMatch || phoneMatch || idMatch || addressMatch;
    });
  }, [items, debouncedQuery, customFilter]);

  const openCombobox = () => {
    if (disabled) return;
    setSearchQuery('');
    setHighlightedIndex(0);
    setIsOpen(true);
  };

  const closeCombobox = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const toggleCombobox = () => {
    if (isOpen) {
      closeCombobox();
    } else {
      openCombobox();
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

  // Focus search input when opened without calling setState in effect
  useEffect(() => {
    if (isOpen) {
      searchInputRef.current?.focus();
    }
  }, [isOpen]);

  // Auto-scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current && highlightedIndex >= 0) {
      const optionElements = listRef.current.querySelectorAll<HTMLLIElement>('[role="option"]');
      const target = optionElements[highlightedIndex];
      if (target) {
        target.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelectItem = (item: T) => {
    if (item.disabled) return;
    onSelect(item);
    closeCombobox();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onSelect(null);
    setIsOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        if (!isOpen) {
          openCombobox();
        } else {
          setHighlightedIndex((prev) => {
            const next = prev + 1;
            return next >= filteredItems.length ? 0 : next;
          });
        }
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        if (!isOpen) {
          openCombobox();
        } else {
          setHighlightedIndex((prev) => {
            const next = prev - 1;
            return next < 0 ? filteredItems.length - 1 : next;
          });
        }
        break;
      }
      case 'Enter': {
        if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredItems.length) {
          e.preventDefault();
          const target = filteredItems[highlightedIndex];
          if (target && !target.disabled) {
            handleSelectItem(target);
          }
        }
        break;
      }
      case 'Escape': {
        if (isOpen) {
          e.preventDefault();
          closeCombobox();
        }
        break;
      }
    }
  };

  const comboboxNode = (
    <div
      ref={containerRef}
      className={`maktoob-combobox ${className}`.trim()}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`${id}-dropdown`}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error ? `${id}-error` : helperText ? `${id}-helper` : undefined
        }
        disabled={disabled}
        className={`maktoob-select-trigger ${error ? 'has-error' : ''}`}
        onClick={toggleCombobox}
      >
        <span
          className={`maktoob-select-value ${!currentItem ? 'is-placeholder' : ''}`}
        >
          {currentItem ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 600 }}>{currentItem.name}</span>
              {currentItem.phone && (
                <span className="maktoob-combobox-item-chip chip-phone">
                  {currentItem.phone}
                </span>
              )}
            </span>
          ) : (
            placeholder
          )}
        </span>

        <span className="maktoob-select-affordance" aria-hidden="true">
          {clearable && currentItem && !disabled ? (
            <span
              role="button"
              className="maktoob-input-clear-btn"
              onClick={handleClear}
              title="إلغاء التحديد"
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
        <div id={`${id}-dropdown`} className="maktoob-combobox-dropdown">
          <div className="maktoob-combobox-search-header">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
              <circle cx="7" cy="7" r="5" />
              <line x1="11" y1="11" x2="14.5" y2="14.5" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              className="maktoob-combobox-search-input"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={searchPlaceholder}
            />
          </div>

          <ul
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            className="maktoob-combobox-list"
          >
            {isLoading ? (
              <li className="maktoob-combobox-empty">{loadingMessage}</li>
            ) : filteredItems.length === 0 ? (
              <li className="maktoob-combobox-empty">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
                <span>{emptyMessage}</span>
              </li>
            ) : (
              filteredItems.map((item, index) => {
                const isSelected = currentItem?.id === item.id;
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={String(item.id)}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={item.disabled}
                    className={`maktoob-combobox-item ${
                      isSelected ? 'is-selected' : ''
                    } ${isHighlighted ? 'is-highlighted' : ''} ${
                      item.disabled ? 'is-disabled' : ''
                    }`.trim()}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelectItem(item)}
                  >
                    <div className="maktoob-combobox-item-main">
                      <span className="maktoob-combobox-item-name">{item.name}</span>
                      {isSelected && (
                        <span className="maktoob-select-option-check" aria-hidden="true">
                          ✓
                        </span>
                      )}
                    </div>

                    <div className="maktoob-combobox-item-meta">
                      {item.phone && (
                        <span className="maktoob-combobox-item-chip chip-phone" title="رقم الهاتف">
                          📞 {item.phone}
                        </span>
                      )}
                      {item.identifier && (
                        <span className="maktoob-combobox-item-chip chip-id" title="رقم الهوية / الأحوال">
                          🪪 {item.identifier}
                        </span>
                      )}
                    </div>

                    {item.address && (
                      <div className="maktoob-combobox-item-address">
                        📍 {item.address}
                      </div>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
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
        {comboboxNode}
      </Field>
    );
  }

  return comboboxNode;
}
