import { forwardRef, useId } from 'react';
import type { TextInputProps } from '../../types/ui';
import { Field } from './Field';

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  {
    id: externalId,
    label,
    error,
    helperText,
    required = false,
    dataValueType = 'general',
    leadingIcon,
    trailingAddon,
    clearable = false,
    onClear,
    className = '',
    wrapperClassName = '',
    disabled = false,
    value,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const id = externalId ?? generatedId;

  const isLtrValue =
    dataValueType === 'phone' ||
    dataValueType === 'identifier' ||
    dataValueType === 'contractNumber' ||
    dataValueType === 'date' ||
    dataValueType === 'currency';

  const typeSpecificClass = dataValueType !== 'general' ? `input-${dataValueType}` : '';

  const inputElement = (
    <div
      className={`maktoob-input-wrapper ${leadingIcon ? 'has-leading-icon' : ''} ${
        trailingAddon || (clearable && value) ? 'has-trailing-addon' : ''
      } ${wrapperClassName}`.trim()}
    >
      {leadingIcon && <span className="maktoob-input-leading-icon">{leadingIcon}</span>}
      <input
        ref={ref}
        id={id}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error ? `${id}-error` : helperText ? `${id}-helper` : undefined
        }
        data-ltr={isLtrValue ? 'true' : undefined}
        className={`maktoob-input ${isLtrValue ? 'data-ltr' : ''} ${typeSpecificClass} ${
          error ? 'has-error' : ''
        } ${className}`.trim()}
        value={value}
        {...rest}
      />
      {clearable && value && !disabled && (
        <span className="maktoob-input-trailing-addon">
          <button
            type="button"
            className="maktoob-input-clear-btn"
            onClick={onClear}
            title="مسح القيمة"
            aria-label="مسح القيمة"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="4" x2="4" y2="12" />
              <line x1="4" y1="4" x2="12" y2="12" />
            </svg>
          </button>
        </span>
      )}
      {trailingAddon && !clearable && (
        <span className="maktoob-input-trailing-addon">{trailingAddon}</span>
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
