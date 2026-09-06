import type { ContractListItem } from '../../shared/domain';
import { StatusBadge } from './StatusBadge';

const formatMoney = (value: number, currency: 'IQD' | 'USD' = 'IQD') =>
  `${new Intl.NumberFormat(currency === 'IQD' ? 'ar-IQ' : 'en-US', { maximumFractionDigits: currency === 'IQD' ? 0 : 2 }).format(value)} ${currency === 'IQD' ? 'د.ع' : '$'}`;

export function ContractsTable({
  contracts,
  onOpen,
  onEdit,
  onDelete,
  onDetails,
}: {
  contracts: ContractListItem[];
  onOpen: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onDetails?: (id: number) => void;
}) {
  if (!contracts.length) {
    return (
      <div className="empty-state">
        <strong>لا توجد عقود</strong>
        <span>أنشئ أول عقد لبدء سجل المكتب.</span>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>رقم العقد</th>
            <th>النوع</th>
            <th>الطرف الأول</th>
            <th>الطرف الثاني</th>
            <th>القيمة</th>
            <th>المتبقي</th>
            <th>التاريخ</th>
            <th>الحالة</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {contracts.map((contract) => (
            <tr
              key={contract.id}
              className="clickable-contract-row"
              onClick={() => onOpen(contract.id)}
              title="انقر لعرض وثيقة العقد في نافذة المعاينة والطباعة"
            >
              <td>
                <button
                  type="button"
                  className="link-button contract-id"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(contract.id);
                  }}
                >
                  {contract.contractNumber}
                </button>
              </td>
              <td>{contract.type}</td>
              <td>{contract.firstParty.name}</td>
              <td>{contract.secondParty.name}</td>
              <td>{formatMoney(contract.amount, contract.currency)}</td>
              <td>{formatMoney(contract.remainingAmount, contract.currency)}</td>
              <td>{contract.contractDate}</td>
              <td>
                <StatusBadge status={contract.status} />
              </td>
              <td onClick={(e) => e.stopPropagation()}>
                <div className="row-actions">
                  <button type="button" onClick={() => onEdit(contract.id)}>تعديل</button>
                  {onDetails && (
                    <button type="button" onClick={() => onDetails(contract.id)} title="عرض تفاصيل وتسجيل الدفعات">
                      دفعات
                    </button>
                  )}
                  <button type="button" className="danger" onClick={() => onDelete(contract.id)}>
                    حذف
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
