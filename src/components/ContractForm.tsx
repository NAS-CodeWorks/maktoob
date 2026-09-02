import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Contract, ContractInput, ContractTemplate, PartySummary } from '../../shared/domain';

const today = () => new Date().toISOString().slice(0, 10);
const messageFrom = (error: unknown) =>
  (error instanceof Error ? error.message : String(error)).replace(/^Error invoking remote method '[^']+': Error: /, '');

const defaultContractInput = (defaultTemplateId: number | null): ContractInput => ({
  type: 'بيع عام',
  contractDate: today(),
  status: 'draft',
  amount: 0,
  currency: 'IQD',
  notes: '',
  templateId: defaultTemplateId,
  propertyDetails: null,
  vehicleDetails: null,
  firstParty: { name: '', phone: '', identifier: '', address: '' },
  secondParty: { name: '', phone: '', identifier: '', address: '' },
});

export function ContractForm({
  contract,
  templates,
  parties = [],
  onClose,
  onSaved,
}: {
  contract: Contract | null;
  templates: ContractTemplate[];
  parties?: PartySummary[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const defaultTemplateId = templates.find((t) => t.isDefault)?.id ?? null;
  const initialValues: ContractInput = contract
    ? {
        type: contract.type,
        contractDate: contract.contractDate,
        status: contract.status,
        amount: contract.amount,
        currency: contract.currency,
        notes: contract.notes,
        templateId: contract.templateId,
        propertyDetails: contract.propertyDetails,
        vehicleDetails: contract.vehicleDetails,
        firstParty: {
          name: contract.firstParty.name,
          phone: contract.firstParty.phone,
          identifier: contract.firstParty.identifier,
          address: contract.firstParty.address,
        },
        secondParty: {
          name: contract.secondParty.name,
          phone: contract.secondParty.phone,
          identifier: contract.secondParty.identifier,
          address: contract.secondParty.address,
        },
      }
    : defaultContractInput(defaultTemplateId);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ContractInput>({ defaultValues: initialValues });

  const [error, setError] = useState('');
  const [selectedType, setSelectedType] = useState<string>(initialValues.type);

  const onTypeChange = (newType: string) => {
    setSelectedType(newType);
    setValue('type', newType);
    if (!contract) {
      if (newType === 'بيع عقار') {
        const propTemplate = templates.find((t) => t.name.includes('عقار'));
        if (propTemplate) setValue('templateId', propTemplate.id);
      } else if (newType === 'بيع مركبة') {
        const vehTemplate = templates.find((t) => t.name.includes('سيارة') || t.name.includes('مركبة'));
        if (vehTemplate) setValue('templateId', vehTemplate.id);
      }
    }
  };

  const handleSelectParty = (side: 'firstParty' | 'secondParty', partyId: string) => {
    if (!partyId) return;
    const selected = parties.find((p) => String(p.id) === partyId);
    if (selected) {
      setValue(`${side}.name`, selected.name);
      setValue(`${side}.phone`, selected.phone);
      setValue(`${side}.identifier`, selected.identifier);
      setValue(`${side}.address`, selected.address);
    }
  };

  const submit = async (input: ContractInput) => {
    setError('');
    try {
      const payload: ContractInput = {
        ...input,
        propertyDetails: input.type === 'بيع عقار' ? input.propertyDetails : null,
        vehicleDetails: input.type === 'بيع مركبة' ? input.vehicleDetails : null,
      };
      if (contract) {
        await window.maktoob.updateContract(contract.id, payload);
      } else {
        await window.maktoob.createContract(payload);
      }
      onSaved();
    } catch (caught) {
      setError(messageFrom(caught));
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="modal contract-modal" role="dialog" aria-modal="true">
        <header className="modal-head">
          <div>
            <span className="eyebrow">{contract?.contractNumber ?? 'سجل جديد'}</span>
            <h2>{contract ? 'تعديل بيانات العقد' : 'إنشاء عقد جديد'}</h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            ×
          </button>
        </header>

        <form onSubmit={handleSubmit(submit)}>
          <div className="form-grid contract-basics">
            <label>
              <span>نوع العقد</span>
              <select
                {...register('type', { required: true })}
                onChange={(e) => onTypeChange(e.target.value)}
              >
                <option value="بيع عام">بيع عام</option>
                <option value="بيع عقار">عقد بيع عقار / أرض</option>
                <option value="بيع مركبة">عقد بيع سيارة / مركبة</option>
                <option value="إيجار">عقد إيجار</option>
                <option value="تعهد">تعهد والتزام</option>
                <option value="مخالصة">مخالصة وإبراء ذمة</option>
              </select>
              {errors.type && <small>مطلوب</small>}
            </label>

            <label>
              <span>تاريخ العقد</span>
              <input type="date" {...register('contractDate', { required: true })} />
            </label>

            <label>
              <span>الحالة</span>
              <select {...register('status')}>
                <option value="draft">مسودة</option>
                <option value="pending_payment">بانتظار الدفع</option>
                <option value="completed">مكتمل</option>
              </select>
            </label>

            <label>
              <span>قيمة العقد</span>
              <div className="money-input">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('amount', { valueAsNumber: true, min: 0 })}
                />
                <select {...register('currency')}>
                  <option value="IQD">د.ع</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </label>

            <label className="wide">
              <span>قالب البنود المعتمد</span>
              <select
                {...register('templateId', {
                  setValueAs: (value) => (value ? Number(value) : null),
                })}
              >
                <option value="">بدون قالب</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                    {template.isDefault ? ' — افتراضي' : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Structured Property Details */}
          {selectedType === 'بيع عقار' && (
            <fieldset style={{ border: '1px solid var(--line)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              <legend style={{ padding: '0 8px', color: '#765e30', fontWeight: 700, fontSize: '12px' }}>
                بيانات العقار / المبيع
              </legend>
              <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <label>
                  <span>نوع العقار</span>
                  <input placeholder="مثلاً: دار سكنية، قطعة أرض، شقة" {...register('propertyDetails.propertyType')} />
                </label>
                <label>
                  <span>رقم القطعة</span>
                  <input placeholder="مثلاً: 124/8" {...register('propertyDetails.plotNumber')} />
                </label>
                <label>
                  <span>المقاطعة</span>
                  <input placeholder="مثلاً: 7 الجزيرة" {...register('propertyDetails.districtNumber')} />
                </label>
                <label>
                  <span>المساحة</span>
                  <input placeholder="مثلاً: 250 م²" {...register('propertyDetails.area')} />
                </label>
                <label>
                  <span>المحافظة</span>
                  <input placeholder="مثلاً: بغداد، الأنبار، البصرة" {...register('propertyDetails.governorate')} />
                </label>
                <label>
                  <span>القضاء / الناحية</span>
                  <input placeholder="مثلاً: الرمادي، الكرخ، المركز" {...register('propertyDetails.cityDistrict')} />
                </label>
                <label className="wide">
                  <span>الموقع والحدود</span>
                  <input placeholder="حدود العقار أو تفاصيل الموقع والأقرب دالّة" {...register('propertyDetails.locationNotes')} />
                </label>
              </div>
            </fieldset>
          )}

          {/* Structured Vehicle Details */}
          {selectedType === 'بيع مركبة' && (
            <fieldset style={{ border: '1px solid var(--line)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              <legend style={{ padding: '0 8px', color: '#765e30', fontWeight: 700, fontSize: '12px' }}>
                بيانات المركبة / المبيع
              </legend>
              <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <label>
                  <span>الشركة / الماركة</span>
                  <input placeholder="مثلاً: تويوتا، كيا، هونداي" {...register('vehicleDetails.make')} />
                </label>
                <label>
                  <span>الموديل / الطراز</span>
                  <input placeholder="مثلاً: كامري، إلنترا، سبورتاج" {...register('vehicleDetails.model')} />
                </label>
                <label>
                  <span>سنة الصنع</span>
                  <input placeholder="مثلاً: 2023" {...register('vehicleDetails.year')} />
                </label>
                <label>
                  <span>اللون</span>
                  <input placeholder="مثلاً: أبيض صدفي، أسود" {...register('vehicleDetails.color')} />
                </label>
                <label>
                  <span>رقم الشاصي / الهيكل (VIN)</span>
                  <input style={{ direction: 'ltr' }} placeholder="17 حرفاً ورقم" {...register('vehicleDetails.chassisNumber')} />
                </label>
                <label>
                  <span>رقم اللوحة والمحافظة</span>
                  <input placeholder="مثلاً: بغداد 12345 خصوصي" {...register('vehicleDetails.plateNumber')} />
                </label>
              </div>
            </fieldset>
          )}

          <div className="party-columns">
            {(['firstParty', 'secondParty'] as const).map((side, index) => (
              <fieldset key={side}>
                <legend>الطرف {index === 0 ? 'الأول (البائع)' : 'الثاني (المشتري)'}</legend>
                {parties.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <select
                      style={{ fontSize: '11px', padding: '6px 8px', width: '100%' }}
                      onChange={(e) => handleSelectParty(side, e.target.value)}
                      defaultValue=""
                    >
                      <option value="">-- اختيار من سجل العملاء السابقين --</option>
                      {parties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.phone ? `(${p.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="form-grid">
                  <label className="wide">
                    <span>الاسم الكامل *</span>
                    <input {...register(`${side}.name`, { required: true })} />
                    {errors[side]?.name && <small>اسم الطرف مطلوب</small>}
                  </label>
                  <label>
                    <span>رقم الهاتف</span>
                    <input inputMode="tel" {...register(`${side}.phone`)} />
                  </label>
                  <label>
                    <span>رقم الهوية</span>
                    <input {...register(`${side}.identifier`)} />
                  </label>
                  <label className="wide">
                    <span>العنوان</span>
                    <input {...register(`${side}.address`)} />
                  </label>
                </div>
              </fieldset>
            ))}
          </div>

          <label className="notes-field">
            <span>ملاحظات العقد</span>
            <textarea rows={3} {...register('notes')} />
          </label>

          {error && <div className="form-error">{error}</div>}

          <footer className="modal-actions">
            <button type="button" className="secondary" onClick={onClose}>
              إلغاء
            </button>
            <button className="primary" disabled={isSubmitting}>
              {isSubmitting ? 'جارٍ الحفظ…' : contract ? 'حفظ التعديلات' : 'إنشاء العقد'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
