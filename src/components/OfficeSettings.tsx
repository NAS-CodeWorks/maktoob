import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { OfficeProfile, OfficeTheme } from '../../shared/domain';

const messageFrom = (error: unknown) =>
  (error instanceof Error ? error.message : String(error)).replace(/^Error invoking remote method '[^']+': Error: /, '');

type ThemeOption = {
  id: OfficeTheme;
  title: string;
  tagline: string;
  shellBg: string;
  accentColor: string;
  description: string;
};

const THEMES: ThemeOption[] = [
  {
    id: 'original',
    title: 'نمط مكتوب الأصلي',
    tagline: 'أخضر داكن وذهبي',
    shellBg: '#10251D',
    accentColor: '#C5A664',
    description: 'طابع رسمي دافئ مناسب للمكاتب وسجلات العقود العراقية (النمط الافتراضي).',
  },
  {
    id: 'official',
    title: 'النمط الرسمي',
    tagline: 'كحلي داكن وأزرق رمادي',
    shellBg: '#0F1E36',
    accentColor: '#2B579A',
    description: 'طابع مؤسساتي وقانوني رصين وهادئ.',
  },
  {
    id: 'iraqi_warm',
    title: 'النمط العراقي الدافئ',
    tagline: 'بني داكن وذهبي رملي',
    shellBg: '#272118',
    accentColor: '#B88334',
    description: 'طابع محلي تراثي دافئ من دون زخارف أو بهرجة زائدة.',
  },
  {
    id: 'high_contrast',
    title: 'النمط عالي الوضوح',
    tagline: 'فحمي أسود وتباين فائق',
    shellBg: '#121212',
    accentColor: '#0056B3',
    description: 'مخصص للشاشات الضعيفة وبيئات الإضاءة العالية لقراءة ناصعة.',
  },
];

function processLogoFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('فشل قراءة ملف الشعار'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('ملف الشعار غير صالح'));
      img.onload = () => {
        const maxDim = 600;
        let width = img.naturalWidth;
        let height = img.naturalHeight;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('تعذر معالجة الشعار'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const isPng = file.type === 'image/png';
        resolve(canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.9));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function OfficeSettings({
  profile,
  onSaved,
}: {
  profile: OfficeProfile;
  onSaved: (profile: OfficeProfile) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<OfficeProfile>({
    defaultValues: profile,
  });

  const [selectedTheme, setSelectedTheme] = useState<OfficeTheme>(profile.theme ?? 'original');
  const [logoData, setLogoData] = useState<string | null>(profile.logoData ?? null);
  const [officeName, setOfficeName] = useState(profile.officeName);
  const [managerName, setManagerName] = useState(profile.managerName);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processingLogo, setProcessingLogo] = useState(false);

  const isDirty =
    officeName !== profile.officeName ||
    managerName !== profile.managerName ||
    selectedTheme !== (profile.theme ?? 'original') ||
    logoData !== (profile.logoData ?? null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessingLogo(true);
    try {
      const dataUrl = await processLogoFile(file);
      setLogoData(dataUrl);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل تحميل الشعار');
    } finally {
      setProcessingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = () => {
    setLogoData(null);
  };

  const handleSelectTheme = (themeId: OfficeTheme) => {
    setSelectedTheme(themeId);
    document.documentElement.setAttribute('data-theme', themeId);
  };

  const submit = async (input: OfficeProfile) => {
    setError('');
    setSuccess('');
    try {
      const payload: OfficeProfile = {
        ...input,
        officeName,
        managerName,
        theme: selectedTheme,
        logoData,
      };
      const updated = await window.maktoob.updateOfficeProfile(payload);
      document.documentElement.setAttribute('data-theme', updated.theme || 'original');
      onSaved(updated);
      setSuccess('تم حفظ إعدادات المكتب بنجاح');
      setTimeout(() => setSuccess(''), 4000);
    } catch (caught) {
      setError(messageFrom(caught));
    }
  };

  return (
    <div className="settings-page-wrapper">
      <form onSubmit={handleSubmit(submit)}>
        {/* Section 1: Office Identity */}
        <section className="settings-section card">
          <div className="section-head">
            <span className="eyebrow">هوية المستند الرسمية</span>
            <h2>هوية المكتب وبيانات العقود</h2>
            <p>
              تظهر هذه البيانات في رأس وتذييل ملفات العقود المطبوعة ونسخ PDF. تحفظ العقود عند إنشائها لقطة ثابتة
              من هذه الهوية، وتعديلها لاحقاً لا يغيّر العقود السابقة.
            </p>
          </div>

          <div className="office-identity-layout">
            <div className="logo-picker-box">
              <label className="field-label">شعار المكتب (Logo)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                onChange={handleLogoUpload}
              />

              <div className="logo-preview-card">
                {logoData ? (
                  <div className="logo-active-view">
                    <img src={logoData} alt="شعار المكتب" className="office-logo-preview-img" />
                    <div className="logo-action-buttons">
                      <button
                        type="button"
                        className="btn-tool"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={processingLogo}
                      >
                        استبدال الشعار
                      </button>
                      <button
                        type="button"
                        className="btn-tool text-danger"
                        onClick={handleRemoveLogo}
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="logo-empty-view">
                    <div className="logo-placeholder-icon">🏢</div>
                    <span>لا يوجد شعار للمكتب</span>
                    <small>يفضل PNG بخلفية شفافة</small>
                    <button
                      type="button"
                      className="primary btn-upload-logo"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={processingLogo}
                    >
                      {processingLogo ? 'جارٍ المعالجة…' : 'اختيار شعار من الجهاز'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="identity-fields-wrap">
              <div className="form-grid">
                <label className="wide">
                  <span>اسم المكتب *</span>
                  <input
                    placeholder="مثلاً: مكتب العدل للعقارات والسيارات"
                    value={officeName}
                    required
                    onChange={(e) => setOfficeName(e.target.value)}
                  />
                </label>

                <label>
                  <span>اسم المسؤول / المدير</span>
                  <input
                    placeholder="الاسم الرباعي أو اللقب"
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                  />
                </label>

                <label>
                  <span>رقم الهاتف المعتمد</span>
                  <input
                    inputMode="tel"
                    placeholder="0770 000 0000"
                    style={{ direction: 'ltr', textAlign: 'right' }}
                    {...register('phone')}
                  />
                </label>

                <label className="wide">
                  <span>عنوان ومقر المكتب</span>
                  <input placeholder="المحافظة — المنطقة — الشارع الرئيسي" {...register('address')} />
                </label>

                <label className="wide">
                  <span>تذييل المستند (Footer Note)</span>
                  <input
                    placeholder="نص التذييل أسفل العقد"
                    {...register('footerNote')}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Live Document Header Preview */}
          <div className="doc-header-preview-section">
            <span className="preview-label">معاينة مباشرة لشكل ترويسة العقد المطبوع</span>
            <div className="doc-header-preview-box">
              <div className="preview-doc-header">
                <div className="preview-doc-brand">
                  {logoData ? (
                    <img src={logoData} alt="شعار المكتب" className="preview-doc-logo" />
                  ) : (
                    <div className="preview-doc-logo-placeholder">شعار المكتب</div>
                  )}
                  <div>
                    <h3>{officeName || 'اسم المكتب'}</h3>
                    <p>{managerName ? `المسؤول: ${managerName}` : 'نظام إدارة العقود'}</p>
                  </div>
                </div>
                <div className="preview-doc-meta">
                  <strong>MK-2026-00001</strong>
                  <span>عقد بيع معتمد</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Appearance & Theme */}
        <section className="settings-section card">
          <div className="section-head">
            <span className="eyebrow">المظهر والتخصيص</span>
            <h2>نمط الواجهة (Interface Style)</h2>
            <p>
              اختر النمط البصري المفضل لمساحة العمل. تبقى مساحة العمل الرئيسية بيضاء ومريحة للقراءة في كافة
              الأنماط، والطباعة وملفات PDF محايدة تماماً.
            </p>
          </div>

          <div className="theme-selector-grid">
            {THEMES.map((theme) => {
              const isSelected = selectedTheme === theme.id;
              return (
                <div
                  key={theme.id}
                  className={`theme-card ${isSelected ? 'active' : ''}`}
                  onClick={() => handleSelectTheme(theme.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectTheme(theme.id);
                    }
                  }}
                >
                  <div className="theme-card-preview" style={{ background: theme.shellBg }}>
                    <div className="theme-card-accent-bar" style={{ background: theme.accentColor }} />
                    <div className="theme-preview-workspace">
                      <div className="theme-preview-line" />
                      <div className="theme-preview-line short" />
                    </div>
                  </div>
                  <div className="theme-card-content">
                    <div className="theme-card-title-row">
                      <strong>{theme.title}</strong>
                      {isSelected && <span className="theme-active-badge">✓ المعتمد</span>}
                    </div>
                    <span className="theme-tagline">{theme.tagline}</span>
                    <p>{theme.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Save Bar */}
        <div className="settings-save-bar card">
          <div className="save-bar-status">
            {isDirty && <span className="unsaved-badge">● توجد تعديلات غير محفوظة</span>}
            {success && <span className="success-badge">✓ {success}</span>}
            {error && <span className="error-badge">⚠️ {error}</span>}
          </div>

          <div className="save-bar-actions">
            <button className="primary btn-save-settings" disabled={isSubmitting}>
              {isSubmitting ? 'جارٍ حفظ الإعدادات…' : 'حفظ إعدادات المكتب'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
