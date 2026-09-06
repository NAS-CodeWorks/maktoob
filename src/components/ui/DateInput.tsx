import { forwardRef, useId } from 'react';
import type { DateInputProps } from '../../types/ui';
import { Field } from './Field';

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  {
    id: externalId,
    label,
    error,
    helperText,
    required = false,
    showTodayButton = false,
    todayButtonLabel = 'اليوم',
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

  const handleSetToday = () => {
    if (disabled) return;
    const todayStr = new Date().toISOString().split('T')[0];
    if (onChange) {
      const syntheticEvent = {
        target: { value: todayStr, name: rest.name },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }
  };

  const inputElement = (
    <div className={`maktoob-date-wrapper ${wrapperClassName}`.trim()}>
      <input
        ref={ref}
        id={id}
        type="date"
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error ? `${id}-error` : helperText ? `${id}-helper` : undefined
        }
        data-ltr="true"
        className={`maktoob-input data-ltr input-date ${
          error ? 'has-error' : ''
        } ${className}`.trim()}
        value={value}
        onChange={onChange}
        {...rest}
      />
      {showTodayButton && !disabled && (
        <button
          type="button"
          className="maktoob-date-today-btn"
          onClick={handleSetToday}
          title="تعيين تاريخ اليوم"
        >
          {todayButtonLabel}
        </button>
      )}
      <span className="maktoob-date-icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="12" height="11" rx="2" />
          <line x1="11" y1="1.5" x2="11" y2="3.5" />
          <line x1="5" y1="1.5" x2="5" y2="3.5" />
          <line x1="2" y1="6.5" x2="14" y2="6.5" />
        </svg>
      </span>
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
