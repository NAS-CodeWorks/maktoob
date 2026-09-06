import { forwardRef, useId } from 'react';
import type { TextareaProps } from '../../types/ui';
import { Field } from './Field';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    id: externalId,
    label,
    error,
    helperText,
    required = false,
    showCount = false,
    maxCount,
    className = '',
    wrapperClassName = '',
    disabled = false,
    value,
    minRows = 3,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const id = externalId ?? generatedId;

  const currentLength = typeof value === 'string' ? value.length : 0;

  const textareaElement = (
    <div className={`maktoob-textarea-wrapper ${wrapperClassName}`.trim()}>
      <textarea
        ref={ref}
        id={id}
        rows={minRows}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error ? `${id}-error` : helperText ? `${id}-helper` : undefined
        }
        className={`maktoob-textarea ${error ? 'has-error' : ''} ${className}`.trim()}
        value={value}
        {...rest}
      />
      {showCount && (
        <div className="maktoob-textarea-count" aria-live="polite">
          {maxCount ? `${currentLength} / ${maxCount}` : `${currentLength} حرف`}
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
        {textareaElement}
      </Field>
    );
  }

  return textareaElement;
});
