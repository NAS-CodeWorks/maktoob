import type { ReactNode } from 'react';
import type { ValidationMessageProps, ValidationVariant } from '../../types/ui';

function renderIcon(variant: ValidationVariant): ReactNode {
  switch (variant) {
    case 'error':
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="8" cy="8" r="7" />
          <line x1="8" y1="5" x2="8" y2="8.5" />
          <circle cx="8" cy="11.5" r="0.6" fill="currentColor" />
        </svg>
      );
    case 'warning':
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7.13 2.5a1 1 0 0 1 1.74 0l6.06 10.5A1 1 0 0 1 14.06 14H1.94a1 1 0 0 1-.87-1.5L7.13 2.5z" />
          <line x1="8" y1="6.5" x2="8" y2="9.5" />
          <circle cx="8" cy="11.5" r="0.6" fill="currentColor" />
        </svg>
      );
    case 'success':
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="3 8.5 6.5 12 13 4.5" />
        </svg>
      );
    case 'info':
    default:
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="8" cy="8" r="7" />
          <line x1="8" y1="7.5" x2="8" y2="11.5" />
          <circle cx="8" cy="4.5" r="0.6" fill="currentColor" />
        </svg>
      );
  }
}

export function ValidationMessage({
  id,
  variant = 'error',
  message,
  children,
  className = '',
  role = variant === 'error' ? 'alert' : 'status',
}: ValidationMessageProps) {
  const content = message ?? children;
  if (!content) return null;

  return (
    <div
      id={id}
      role={role}
      className={`maktoob-validation-message variant-${variant} ${className}`.trim()}
    >
      <span className="maktoob-validation-icon">{renderIcon(variant)}</span>
      <span>{content}</span>
    </div>
  );
}
