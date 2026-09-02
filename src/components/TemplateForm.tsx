import { useState, type FormEvent } from 'react';
import type { ContractTemplate, ContractTemplateInput } from '../../shared/domain';

const messageFrom = (error: unknown) =>
  (error instanceof Error ? error.message : String(error)).replace(/^Error invoking remote method '[^']+': Error: /, '');

export function TemplateForm({
  template,
  onClose,
  onSaved,
}: {
  template: ContractTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [clausesText, setClausesText] = useState(template?.clauses.join('\n\n') ?? '');
  const [isDefault, setIsDefault] = useState(template?.isDefault ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const input: ContractTemplateInput = {
      name,
      description,
      clauses: clausesText
        .split(/\n\s*\n/)
        .map((clause) => clause.trim())
        .filter(Boolean),
      isDefault,
    };
    try {
      if (template) await window.maktoob.updateTemplate(template.id, input);
      else await window.maktoob.createTemplate(input);
      onSaved();
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setSaving(false);
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
      <section className="modal template-modal" role="dialog" aria-modal="true">
        <header className="modal-head">
          <div>
            <span className="eyebrow">مكتبة البنود</span>
            <h2>{template ? 'تعديل قالب العقد' : 'إنشاء قالب عقد'}</h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            ×
          </button>
        </header>
        <form onSubmit={submit}>
          <div className="form-grid">
            <label>
              <span>اسم القالب *</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
            <label className="wide">
              <span>وصف الاستخدام</span>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
          </div>
          <label className="notes-field">
            <span>بنود العقد *</span>
            <textarea
              rows={12}
              value={clausesText}
              onChange={(event) => setClausesText(event.target.value)}
              placeholder={'اكتب كل بند في فقرة مستقلة.\n\nافصل بين البنود بسطر فارغ.'}
              required
            />
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(event) => setIsDefault(event.target.checked)}
            />
            <span>استخدام هذا القالب تلقائياً للعقود الجديدة</span>
          </label>
          <p className="legal-note">
            القوالب أدوات تشغيلية وليست بديلاً عن المراجعة القانونية المتخصصة.
          </p>
          {error && <div className="form-error">{error}</div>}
          <footer className="modal-actions">
            <button type="button" className="secondary" onClick={onClose}>
              إلغاء
            </button>
            <button className="primary" disabled={saving}>
              {saving ? 'جارٍ الحفظ…' : 'حفظ القالب'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
