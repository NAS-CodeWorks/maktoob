import type { ContractStatus } from '../../shared/domain';

const statusLabels: Record<ContractStatus, string> = {
  draft: 'مسودة',
  completed: 'مكتمل',
  pending_payment: 'بانتظار الدفع',
};

export function StatusBadge({ status }: { status: ContractStatus }) {
  return <span className={`status status-${status}`}>{statusLabels[status]}</span>;
}
