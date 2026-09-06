import { useState } from 'react';
import type { FormSectionProps } from '../../types/ui';
import { SectionHeader } from './SectionHeader';

export function FormSection({
  id,
  title,
  subtitle,
  badge,
  action,
  icon,
  collapsible = false,
  defaultExpanded = true,
  variant = 'card',
  className = '',
  children,
}: FormSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleCollapse = () => {
    if (collapsible) {
      setIsExpanded((prev) => !prev);
    }
  };

  const collapseButton = collapsible ? (
    <button
      type="button"
      className="maktoob-form-section-collapse-btn"
      onClick={toggleCollapse}
      aria-expanded={isExpanded}
      title={isExpanded ? 'طي القسم' : 'توسيع القسم'}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          transform: isExpanded ? 'rotate(0deg)' : 'rotate(90deg)',
          transition: 'transform 0.2s ease',
        }}
      >
        <polyline points="4 6 8 10 12 6" />
      </svg>
    </button>
  ) : null;

  return (
    <section
      id={id}
      className={`maktoob-form-section variant-${variant} ${
        !isExpanded ? 'is-collapsed' : ''
      } ${className}`.trim()}
    >
      {title && (
        <SectionHeader
          title={title}
          subtitle={subtitle}
          badge={badge}
          icon={icon}
          action={
            action || collapseButton ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {action}
                {collapseButton}
              </div>
            ) : undefined
          }
        />
      )}

      {isExpanded && <div className="maktoob-form-section-content">{children}</div>}
    </section>
  );
}
