import type { SectionHeaderProps } from '../../types/ui';

export function SectionHeader({
  title,
  subtitle,
  badge,
  action,
  icon,
  level = 3,
  className = '',
  compact = false,
}: SectionHeaderProps) {
  const renderHeading = () => {
    switch (level) {
      case 2:
        return <h2 className="maktoob-section-title">{title}</h2>;
      case 4:
        return <h4 className="maktoob-section-title">{title}</h4>;
      case 5:
        return <h5 className="maktoob-section-title">{title}</h5>;
      case 3:
      default:
        return <h3 className="maktoob-section-title">{title}</h3>;
    }
  };

  return (
    <div
      className={`maktoob-section-header level-${level} ${
        compact ? 'is-compact' : ''
      } ${className}`.trim()}
    >
      <div className="maktoob-section-header-titles">
        <div className="maktoob-section-header-row">
          {icon && <span className="maktoob-section-icon">{icon}</span>}
          {renderHeading()}
          {badge && <span className="maktoob-section-badge">{badge}</span>}
        </div>
        {subtitle && <p className="maktoob-section-subtitle">{subtitle}</p>}
      </div>

      {action && <div className="maktoob-section-action">{action}</div>}
    </div>
  );
}
