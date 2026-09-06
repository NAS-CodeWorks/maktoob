import { forwardRef, useId } from 'react';
import type { NumberInputProps } from '../../types/ui';
import { Field } from './Field';

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  {
    id: externalId,
    label,
    error,
    helperText,
    required = false,
    showStepper = false,
    min,
    max,
    step = 1,
    allowDecimals = true,
    onValueChange,
    className = '',
    wrapperClassName = '',
    disabled = false,
    value,
    onChange,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const id = externalId ?? generatedId;

  const handleStep = (delta: number) => {
    if (disabled) return;
    const currentNum = Number(value) || 0;
    const nextVal = currentNum + delta * (step || 1);
    if (min !== undefined && nextVal < min) return;
    if (max !== undefined && nextVal > max) return;
    if (onValueChange) {
      onValueChange(nextVal);
    }
  };

  const inputElement = (
    <div className={`maktoob-number-wrapper ${wrapperClassName}`.trim()}>
      <input
        ref={ref}
        id={id}
        type="number"
        min={min}
        max={max}
        step={allowDecimals ? step : 1}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error ? `${id}-error` : helperText ? `${id}-helper` : undefined
        }
        data-ltr="true"
        className={`maktoob-input data-ltr input-numeric ${
          error ? 'has-error' : ''
        } ${className}`.trim()}
        value={value}
        onChange={(e) => {
          onChange?.(e);
          if (onValueChange) {
            const parsed = e.target.value === '' ? null : Number(e.target.value);
            onValueChange(isNaN(Number(parsed)) ? null : parsed);
          }
        }}
        {...rest}
      />
      {showStepper && !disabled && (
        <div className="maktoob-number-stepper">
          <button
            type="button"
            className="maktoob-stepper-btn"
            onClick={() => handleStep(1)}
            disabled={max !== undefined && Number(value) >= max}
            title="زيادة"
            aria-label="زيادة"
          >
            +
          </button>
          <button
            type="button"
            className="maktoob-stepper-btn"
            onClick={() => handleStep(-1)}
            disabled={min !== undefined && Number(value) <= min}
            title="نقصان"
            aria-label="نقصان"
          >
            -
          </button>
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
      >
        {inputElement}
      </Field>
    );
  }

  return inputElement;
});
