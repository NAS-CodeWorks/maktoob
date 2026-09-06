import { useId } from 'react';
import type { CurrencyInputProps, SupportedCurrency } from '../../types/ui';
import { Field } from './Field';

const DEFAULT_CURRENCIES: SupportedCurrency[] = ['IQD', 'USD'];

export function CurrencyInput({
  id: externalId,
  name,
  label,
  error,
  helperText,
  required = false,
  amount,
  currency,
  onAmountChange,
  onCurrencyChange,
  currencies = DEFAULT_CURRENCIES,
  disabled = false,
  readOnly = false,
  placeholder = '0.00',
  autoFocus = false,
  min = 0,
  max,
  className = '',
  wrapperClassName = '',
}: CurrencyInputProps) {
  const generatedId = useId();
  const id = externalId ?? generatedId;

  const handleAmountInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const parsed = raw === '' ? 0 : parseFloat(raw);
    onAmountChange(isNaN(parsed) ? 0 : parsed, raw);
  };

  const currencyLabels: Record<SupportedCurrency, string> = {
    IQD: 'د.ع',
    USD: 'USD',
  };

  const control = (
    <div
      className={`maktoob-currency-container ${disabled ? 'is-disabled' : ''} ${
        error ? 'has-error' : ''
      } ${className}`.trim()}
    >
      <input
        id={id}
        name={name}
        type="number"
        min={min}
        max={max}
        step="any"
        disabled={disabled}
        readOnly={readOnly}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={amount}
        onChange={handleAmountInput}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error ? `${id}-error` : helperText ? `${id}-helper` : undefined
        }
        data-ltr="true"
        className="maktoob-currency-amount-input"
      />
      <div className="maktoob-currency-divider" />
      <div className="maktoob-currency-selector" role="group" aria-label="اختيار العملة">
        {currencies.map((curr) => {
          const isActive = currency === curr;
          return (
            <button
              key={curr}
              type="button"
              disabled={disabled || readOnly}
              className={`maktoob-currency-btn ${isActive ? 'is-active' : ''}`}
              onClick={() => onCurrencyChange?.(curr)}
              aria-pressed={isActive}
            >
              {currencyLabels[curr] ?? curr}
            </button>
          );
        })}
      </div>
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
        {control}
      </Field>
    );
  }

  return control;
}
