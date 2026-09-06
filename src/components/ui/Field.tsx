import type { FieldProps } from '../../types/ui';
import { ValidationMessage } from './ValidationMessage';

export function Field({
  id,
  label,
  required = false,
  requiredIndicator,
  error,
  helperText,
  hint,
  className = '',
  children,
  wide = false,
  disabled = false,
}: FieldProps) {
  return (
    <div
      className={`maktoob-field ${wide ? 'is-wide' : ''} ${disabled ? 'is-disabled' : ''} ${className}`.trim()}
    >
      {(label || hint) && (
        <div className="maktoob-field-label-wrapper">
          {label && (
            <label htmlFor={id} className="maktoob-field-label">
              <span>{label}</span>
              {required && (
                requiredIndicator ? (
                  requiredIndicator
                ) : (
                  <span className="maktoob-required-indicator" title="حقل مطلوب" aria-hidden="true">
                    *
                  </span>
                )
              )}
            </label>
          )}
          {hint && <span className="maktoob-field-hint">{hint}</span>}
        </div>
      )}

      {children}

      {error ? (
        <ValidationMessage id={id ? `${id}-error` : undefined} variant="error" message={error} />
      ) : helperText ? (
        <div id={id ? `${id}-helper` : undefined} className="maktoob-field-helper">
          {helperText}
        </div>
      ) : null}
    </div>
  );
}
