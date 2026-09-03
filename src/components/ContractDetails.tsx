import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Contract, PaymentInput } from '../../shared/domain';
import { StatusBadge } from './StatusBadge';

const today = () => new Date().toISOString().slice(0, 10);
const formatMoney = (value: number, currency: 'IQD' | 'USD' = 'IQD') =>
  `${new Intl.NumberFormat(currency === 'IQD' ? 'ar-IQ' : 'en-US', { maximumFractionDigits: currency === 'IQD' ? 0 : 2 }).format(value)} ${currency === 'IQD' ? 'د.ع' : '$'}`;
const messageFrom = (error: unknown) =>
  (error instanceof Error ? error.message : String(error)).replace(/^Error invoking remote method '[^']+': Error: /, '');

export function ContractDetails({
  contract,
  onClose,
  onChanged,
  notify,
}: {
  contract: Contract;
  onClose: () => void;
  onChanged: () => void;
  notify: (value: string) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<PaymentInput>({
    defaultValues: {
      contractId: contract.id,
      amount: contract.remainingAmount,
      paymentDate: today(),
      method: 'نقدي',
      note: '',
    },
  });

  const [error, setError] = useState('');
  const [printing, setPrinting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const addPayment = async (input: PaymentInput) => {
    try {
      await window.maktoob.addPayment({ ...input, contractId: contract.id });
      reset({
        contractId: contract.id,
        amount: Math.max(0, contract.remainingAmount - input.amount),
        paymentDate: today(),
        method: 'نقدي',
        note: '',
      });
      onChanged();
      notify('تم تسجيل الدفعة');
    } catch (caught) {
      setError(messageFrom(caught));
    }
  };

  const exportPdf = async () => {
    setExporting(true);
    try {
      const result = await window.maktoob.exportContractPdf(contract.id);
      if (result.ok && result.path) notify(`حُفظ ملف PDF: ${result.path}`);
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setExporting(false);
    }
  };

  const printContract = async () => {
    setPrinting(true);
    try {
      const result = await window.maktoob.printContract(contract.id);
      if (result.ok) notify('تم إرسال العقد للطباعة');
      else if (result.message && result.message !== 'تم إلغاء الطباعة') setError(result.message);
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <section className="modal details-modal" role="dialog" aria-modal="true">
        <header className="modal-head">
          <div>
            <span className="eyebrow">{contract.contractNumber}</span>
            <h2>{contract.type}</h2>
          </div>
          <div className="head-actions">
            <button className="secondary" onClick={printContract} disabled={printing}>
              {printing ? 'جارٍ إرسال الأمر…' : 'طباعة العقد'}
            </button>
            <button className="secondary" onClick={exportPdf} disabled={exporting}>
              {exporting ? 'جارٍ التصدير…' : 'تصدير PDF'}
            </button>
            <button className="icon-button" onClick={onClose}>
              ×
            </button>
          </div>
        </header>

        <div className="detail-summary">
          <div>
            <span>القيمة الإجمالية</span>
            <strong>{formatMoney(contract.amount, contract.currency)}</strong>
          </div>
          <div>
            <span>المبلغ المستلم</span>
            <strong>{formatMoney(contract.paidAmount, contract.currency)}</strong>
          </div>
          <div>
            <span>المبلغ المتبقي</span>
            <strong>{formatMoney(contract.remainingAmount, contract.currency)}</strong>
          </div>
          <div>
            <span>حالة العقد</span>
            <StatusBadge status={contract.status} />
          </div>
        </div>

        {/* Property details section if present */}
        {contract.propertyDetails && (
          <div style={{ padding: '0 26px', marginBottom: '16px' }}>
            <div style={{ background: '#fcfdfc', border: '1px solid var(--line)', borderRadius: '10px', padding: '16px' }}>
              <span style={{ fontSize: '11px', color: '#826a3b', fontWeight: 700 }}>بيانات العقار / الأرض</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px', fontSize: '12px' }}>
                <div><span style={{ color: 'var(--muted)' }}>نوع العقار: </span><strong>{contract.propertyDetails.propertyType || '—'}</strong></div>
                <div><span style={{ color: 'var(--muted)' }}>رقم القطعة: </span><strong>{contract.propertyDetails.plotNumber || '—'}</strong></div>
                <div><span style={{ color: 'var(--muted)' }}>المقاطعة: </span><strong>{contract.propertyDetails.districtNumber || '—'}</strong></div>
                <div><span style={{ color: 'var(--muted)' }}>المساحة: </span><strong>{contract.propertyDetails.area || '—'}</strong></div>
                <div><span style={{ color: 'var(--muted)' }}>المحافظة: </span><strong>{contract.propertyDetails.governorate || '—'}</strong></div>
                <div><span style={{ color: 'var(--muted)' }}>القضاء / الناحية: </span><strong>{contract.propertyDetails.cityDistrict || '—'}</strong></div>
              </div>
              {contract.propertyDetails.locationNotes && (
                <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed var(--line)', fontSize: '12px' }}>
                  <span style={{ color: 'var(--muted)' }}>الموقع والحدود: </span>{contract.propertyDetails.locationNotes}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Vehicle details section if present */}
        {contract.vehicleDetails && (
          <div style={{ padding: '0 26px', marginBottom: '16px' }}>
            <div style={{ background: '#fcfdfc', border: '1px solid var(--line)', borderRadius: '10px', padding: '16px' }}>
              <span style={{ fontSize: '11px', color: '#826a3b', fontWeight: 700 }}>بيانات المركبة</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px', fontSize: '12px' }}>
                <div><span style={{ color: 'var(--muted)' }}>الماركة: </span><strong>{contract.vehicleDetails.make || '—'}</strong></div>
                <div><span style={{ color: 'var(--muted)' }}>الموديل: </span><strong>{contract.vehicleDetails.model || '—'}</strong></div>
                <div><span style={{ color: 'var(--muted)' }}>سنة الصنع: </span><strong>{contract.vehicleDetails.year || '—'}</strong></div>
                <div><span style={{ color: 'var(--muted)' }}>اللون: </span><strong>{contract.vehicleDetails.color || '—'}</strong></div>
                <div><span style={{ color: 'var(--muted)' }}>رقم الهيكل: </span><strong style={{ direction: 'ltr', display: 'inline-block' }}>{contract.vehicleDetails.chassisNumber || '—'}</strong></div>
                <div><span style={{ color: 'var(--muted)' }}>رقم اللوحة: </span><strong>{contract.vehicleDetails.plateNumber || '—'}</strong></div>
              </div>
            </div>
          </div>
        )}

        <div className="party-columns compact">
          <article>
            <span>الطرف الأول</span>
            <h3>{contract.firstParty.name}</h3>
            <p>{contract.firstParty.phone || 'لا يوجد هاتف'} · {contract.firstParty.identifier || 'لا توجد هوية'}</p>
            <small>{contract.firstParty.address || 'العنوان غير محدد'}</small>
          </article>
          <article>
            <span>الطرف الثاني</span>
            <h3>{contract.secondParty.name}</h3>
            <p>{contract.secondParty.phone || 'لا يوجد هاتف'} · {contract.secondParty.identifier || 'لا توجد هوية'}</p>
            <small>{contract.secondParty.address || 'العنوان غير محدد'}</small>
          </article>
        </div>

        {contract.clauses.length > 0 && (
          <section className="contract-clauses">
            <div>
              <span>قالب البنود</span>
              <h3>{contract.templateName || 'بنود مخصصة'}</h3>
            </div>
            <ol>
              {contract.clauses.map((clause, index) => (
                <li key={`${index}-${clause.slice(0, 12)}`}>{clause}</li>
              ))}
            </ol>
          </section>
        )}

        <section className="payments-section">
          <h3>سجل الدفعات</h3>
          {contract.payments.length ? (
            <table>
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>الطريقة</th>
                  <th>المبلغ</th>
                  <th>ملاحظة</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {contract.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.paymentDate}</td>
                    <td>{payment.method}</td>
                    <td>{formatMoney(payment.amount, contract.currency)}</td>
                    <td>{payment.note || '—'}</td>
                    <td>
                      <button
                        className="text-danger"
                        onClick={async () => {
                          if (confirm('حذف هذه الدفعة؟')) {
                            await window.maktoob.deletePayment(payment.id);
                            onChanged();
                          }
                        }}
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-inline">لا توجد دفعات مسجلة.</p>
          )}
        </section>

        {contract.remainingAmount > 0 && (
          <form className="payment-form" onSubmit={handleSubmit(addPayment)}>
            <input type="hidden" {...register('contractId', { valueAsNumber: true })} />
            <label>
              <span>المبلغ</span>
              <input
                type="number"
                min="0.01"
                max={contract.remainingAmount}
                step="0.01"
                {...register('amount', { valueAsNumber: true })}
              />
            </label>
            <label>
              <span>التاريخ</span>
              <input type="date" {...register('paymentDate')} />
            </label>
            <label>
              <span>الطريقة</span>
              <select {...register('method')}>
                <option>نقدي</option>
                <option>تحويل</option>
                <option>صك</option>
              </select>
            </label>
            <label className="grow">
              <span>ملاحظة</span>
              <input {...register('note')} />
            </label>
            <button className="primary" disabled={isSubmitting}>
              تسجيل دفعة
            </button>
          </form>
        )}

        {error && <div className="form-error">{error}</div>}
      </section>
    </div>
  );
}
