import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { OfficeProfile } from '../../shared/domain';

const messageFrom = (error: unknown) =>
  (error instanceof Error ? error.message : String(error)).replace(/^Error invoking remote method '[^']+': Error: /, '');

export function OfficeSettings({
  profile,
  onSaved,
}: {
  profile: OfficeProfile;
  onSaved: (profile: OfficeProfile) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<OfficeProfile>({ defaultValues: profile });
  const [error, setError] = useState('');

  const submit = async (input: OfficeProfile) => {
    setError('');
    try {
      onSaved(await window.maktoob.updateOfficeProfile(input));
    } catch (caught) {
      setError(messageFrom(caught));
    }
  };

  return (
    <section className="settings-panel">
      <div className="settings-intro">
        <span className="eyebrow">هوية المستند</span>
        <h2>بيانات المكتب</h2>
        <p>تظهر هذه البيانات في رأس وتذييل ملفات العقود PDF والطباعة. لا تؤثر التعديلات على بيانات العقود المسجلة.</p>
      </div>
      <form onSubmit={handleSubmit(submit)}>
        <div className="form-grid">
          <label>
            <span>اسم المكتب *</span>
            <input {...register('officeName', { required: true })} />
          </label>
          <label>
            <span>اسم المسؤول</span>
            <input {...register('managerName')} />
          </label>
          <label>
            <span>رقم الهاتف</span>
            <input inputMode="tel" {...register('phone')} />
          </label>
          <label>
            <span>العنوان</span>
            <input {...register('address')} />
          </label>
          <label className="wide">
            <span>تذييل المستند</span>
            <input {...register('footerNote')} />
          </label>
        </div>
        {error && <div className="form-error">{error}</div>}
        <footer className="modal-actions">
          <button className="primary" disabled={isSubmitting}>
            {isSubmitting ? 'جارٍ الحفظ…' : 'حفظ إعدادات المكتب'}
          </button>
        </footer>
      </form>
    </section>
  );
}
