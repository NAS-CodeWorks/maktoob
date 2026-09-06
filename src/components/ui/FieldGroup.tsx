import type { FieldGroupProps } from '../../types/ui';

export function FieldGroup({
  columns = 2,
  gap = 'md',
  align = 'start',
  className = '',
  children,
}: FieldGroupProps) {
  return (
    <div
      className={`maktoob-field-group columns-${columns} gap-${gap} align-${align} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
