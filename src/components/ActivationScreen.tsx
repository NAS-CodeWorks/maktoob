import { useState } from 'react';
import type { LicenseState } from '../../shared/domain';

export function ActivationScreen({
  license,
  onChanged,
}: {
  license: LicenseState;
  onChanged: (license: LicenseState) => void;
}) {
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);

  const activate = async () => {
    setWorking(true);
    try {
      onChanged(await window.maktoob.importLicense());
    } finally {
      setWorking(false);
    }
  };

  const copyDeviceId = async () => {
    await navigator.clipboard.writeText(license.deviceId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <main className="activation-screen">
      <section className="activation-card">
        <div className="activation-brand">
          <img src="./branding/maktoob-256.png" alt="مكتوب" className="brand-logo-img" />
          <div>
            <strong>مكتوب</strong>
            <small>ترخيص جهاز واحد</small>
          </div>
        </div>
        <span className={`license-state license-${license.status}`}>
          {license.status === 'configuration_error' ? 'خطأ في نسخة التطبيق' : 'التطبيق غير مفعّل'}
        </span>
        <h1>تفعيل نسخة المكتب</h1>
        <p>
          {license.message}. انسخ بصمة الجهاز وأرسلها إلى جهة إصدار الترخيص، ثم استورد الملف المستلم.
        </p>
        <label>
          <span>بصمة هذا الجهاز</span>
          <div className="device-id">
            <code>{license.deviceId || 'جارٍ تحديد الجهاز…'}</code>
            <button className="secondary" onClick={copyDeviceId} disabled={!license.deviceId}>
              {copied ? 'تم النسخ' : 'نسخ'}
            </button>
          </div>
        </label>
        <button
          className="primary activation-button"
          onClick={activate}
          disabled={working || license.status === 'configuration_error'}
        >
          {working ? 'جارٍ فحص الترخيص…' : 'اختيار ملف الترخيص'}
        </button>
        <small className="activation-note">
          لا يحتاج التفعيل إلى اتصال بالإنترنت، ولا يغادر معرّف الجهاز هذا الحاسوب إلا عند نسخه يدوياً.
        </small>
      </section>
    </main>
  );
}
