import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Contract,
  ContractListItem,
  ContractTemplate,
  DashboardSummary,
  LicenseState,
  OfficeProfile,
  PartySummary,
  PaymentListItem,
} from '../shared/domain';
import './templates.css';
import { ActivationScreen } from './components/ActivationScreen';
import { ContractDetails } from './components/ContractDetails';
import { ContractForm } from './components/ContractForm';
import { ContractsTable } from './components/ContractsTable';
import { OfficeSettings } from './components/OfficeSettings';
import { TemplateForm } from './components/TemplateForm';

type View = 'dashboard' | 'contracts' | 'templates' | 'parties' | 'payments' | 'backup' | 'settings';

const viewMeta: Record<View, { title: string; subtitle: string; actionLabel?: string; actionType?: 'contract' | 'template' }> = {
  dashboard: {
    title: 'نظرة عامة',
    subtitle: 'ملخص مؤشرات العقود والدفعات الحالية',
    actionLabel: '+ عقد جديد',
    actionType: 'contract',
  },
  contracts: {
    title: 'العقود',
    subtitle: 'سجل وإدارة عقود البيع والشراء',
    actionLabel: '+ عقد جديد',
    actionType: 'contract',
  },
  templates: {
    title: 'قوالب العقود',
    subtitle: 'مكتبة النماذج والبنود القانونية المعتمدة',
    actionLabel: '+ قالب جديد',
    actionType: 'template',
  },
  parties: {
    title: 'الأطراف',
    subtitle: 'دليل البائعين والمشترين وسجلاتهم',
    actionLabel: '+ عقد جديد',
    actionType: 'contract',
  },
  payments: {
    title: 'الدفعات',
    subtitle: 'حركة المقبوضات المالية وجداول السداد',
    actionLabel: '+ عقد جديد',
    actionType: 'contract',
  },
  backup: {
    title: 'النسخ الاحتياطي',
    subtitle: 'تأمين واستعادة قاعدة البيانات والوثائق',
  },
  settings: {
    title: 'إعدادات المكتب',
    subtitle: 'تخصيص هوية المستند ونمط الواجهة',
  },
};

const navItems: Array<{ id: View; label: string; icon: string }> = [
  { id: 'dashboard', label: 'نظرة عامة', icon: '⌂' },
  { id: 'contracts', label: 'العقود', icon: '▤' },
  { id: 'templates', label: 'قوالب العقود', icon: '◇' },
  { id: 'parties', label: 'الأطراف', icon: '◎' },
  { id: 'payments', label: 'الدفعات', icon: '◫' },
  { id: 'backup', label: 'النسخ الاحتياطي', icon: '↻' },
  { id: 'settings', label: 'إعدادات المكتب', icon: '⚙' },
];

const formatMoney = (value: number, currency: 'IQD' | 'USD' = 'IQD') =>
  `${new Intl.NumberFormat(currency === 'IQD' ? 'ar-IQ' : 'en-US', { maximumFractionDigits: currency === 'IQD' ? 0 : 2 }).format(value)} ${currency === 'IQD' ? 'د.ع' : '$'}`;

const messageFrom = (error: unknown) =>
  (error instanceof Error ? error.message : String(error)).replace(/^Error invoking remote method '[^']+': Error: /, '');

export function App() {
  const [view, setView] = useState<View>('dashboard');
  const [query, setQuery] = useState('');
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [contracts, setContracts] = useState<ContractListItem[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [parties, setParties] = useState<PartySummary[]>([]);
  const [payments, setPayments] = useState<PaymentListItem[]>([]);
  const [officeProfile, setOfficeProfile] = useState<OfficeProfile | null>(null);

  const [editing, setEditing] = useState<Contract | null | 'new'>(null);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null | 'new'>(null);
  const [details, setDetails] = useState<Contract | null>(null);
  const [selectedTemplateContracts, setSelectedTemplateContracts] = useState<{
    template: ContractTemplate;
    contracts: ContractListItem[];
  } | null>(null);
  const [selectedPartyDetails, setSelectedPartyDetails] = useState<{
    party: PartySummary;
    contracts: ContractListItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [license, setLicense] = useState<LicenseState | null>(null);

  const notify = useCallback((value: string) => {
    setToast(value);
    window.setTimeout(() => setToast(''), 4000);
  }, []);

  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    setError('');
    try {
      if (view === 'dashboard') {
        const [summary, profile, partiesList] = await Promise.all([
          window.maktoob.dashboard(),
          window.maktoob.getOfficeProfile(),
          window.maktoob.listParties(),
        ]);
        setDashboard(summary);
        setOfficeProfile(profile);
        setParties(partiesList);
      }
      if (view === 'contracts') {
        const [contractList, partiesList] = await Promise.all([
          window.maktoob.listContracts(query),
          window.maktoob.listParties(),
        ]);
        setContracts(contractList);
        setParties(partiesList);
      }
      if (view === 'templates') setTemplates(await window.maktoob.listTemplates(query));
      if (view === 'parties') setParties(await window.maktoob.listParties(query));
      if (view === 'payments') setPayments(await window.maktoob.listPayments(query));
      if (view === 'settings') setOfficeProfile(await window.maktoob.getOfficeProfile());
    } catch (caught) {
      setError(messageFrom(caught));
    } finally {
      setLoading(false);
    }
  }, [query, view]);

  useEffect(() => {
    void window.maktoob.getLicenseState().then(setLicense).catch((caught) => setError(messageFrom(caught)));
    void window.maktoob
      .getOfficeProfile()
      .then((profile) => {
        setOfficeProfile(profile);
        document.documentElement.setAttribute('data-theme', profile.theme || 'original');
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (license?.status === 'active') void load();
  }, [license?.status, load]);

  useEffect(() => {
    if (!license) return;
    const timer = window.setTimeout(() => {
      const overlay = document.getElementById('startup-overlay');
      if (overlay) {
        overlay.classList.add('fade-out');
        window.setTimeout(() => overlay.remove(), 450);
      }
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [license]);

  const changeView = (next: View) => {
    setQuery('');
    setView(next);
  };

  const openDetails = async (id: number) => {
    try {
      setDetails(await window.maktoob.getContract(id));
    } catch (caught) {
      setError(messageFrom(caught));
    }
  };

  const refreshDetails = async () => {
    if (details) setDetails(await window.maktoob.getContract(details.id));
    await load();
  };

  const removeContract = async (id: number) => {
    if (!confirm('سيُحذف العقد ودفعاته نهائياً. هل تريد المتابعة؟')) return;
    try {
      await window.maktoob.deleteContract(id);
      notify('تم حذف العقد');
      await load();
    } catch (caught) {
      setError(messageFrom(caught));
    }
  };

  const openContractForm = async () => {
    try {
      const [availableTemplates, availableParties] = await Promise.all([
        window.maktoob.listTemplates(),
        window.maktoob.listParties(),
      ]);
      setTemplates(availableTemplates);
      setParties(availableParties);
      setEditing('new');
    } catch (caught) {
      setError(messageFrom(caught));
    }
  };

  const openContractEdit = async (id: number) => {
    try {
      const [contract, availableTemplates, availableParties] = await Promise.all([
        window.maktoob.getContract(id),
        window.maktoob.listTemplates(),
        window.maktoob.listParties(),
      ]);
      setTemplates(availableTemplates);
      setParties(availableParties);
      setEditing(contract);
    } catch (caught) {
      setError(messageFrom(caught));
    }
  };

  const openContractViewer = async (id: number) => {
    try {
      await window.maktoob.openContractViewer(id);
    } catch (caught) {
      setError(messageFrom(caught));
    }
  };

  const openTemplateContracts = async (template: ContractTemplate) => {
    if (!template.contractsCount) return;
    try {
      const linked = await window.maktoob.listContractsByTemplate(template.id);
      setSelectedTemplateContracts({ template, contracts: linked });
    } catch (caught) {
      setError(messageFrom(caught));
    }
  };

  const openPartyDetails = async (party: PartySummary) => {
    try {
      const linked = await window.maktoob.listContractsByParty(party.id);
      setSelectedPartyDetails({ party, contracts: linked });
    } catch (caught) {
      setError(messageFrom(caught));
    }
  };

  useEffect(() => {
    if (!window.maktoob?.onEditContractRequested) return;
    const unsubscribe = window.maktoob.onEditContractRequested((contractId) => {
      void openContractEdit(contractId);
    });
    return unsubscribe;
  }, []);

  const removeTemplate = async (template: ContractTemplate) => {
    if (!confirm(`حذف قالب «${template.name}»؟ ستبقى نسخ البنود محفوظة داخل العقود السابقة.`)) return;
    try {
      await window.maktoob.deleteTemplate(template.id);
      notify('تم حذف القالب');
      await load();
    } catch (caught) {
      setError(messageFrom(caught));
    }
  };

  const arabicDate = useMemo(
    () => new Intl.DateTimeFormat('ar-IQ', { dateStyle: 'full' }).format(new Date()),
    []
  );

  if (!license) return <div className="activation-loading">جارٍ التحقق من ترخيص مكتوب…</div>;
  if (license.status !== 'active') return <ActivationScreen license={license} onChanged={setLicense} />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="./branding/maktoob-256.png" alt="مكتوب" className="brand-logo-img" />
          <div>
            <strong>مكتوب</strong>
            <small>من السجلات إلى الديسكتوب</small>
          </div>
        </div>
        <nav>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id ? 'active' : ''}`}
              onClick={() => changeView(item.id)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="office-card">
          {officeProfile?.logoData && (
            <div className="sidebar-office-logo-wrap">
              <img src={officeProfile.logoData} alt="شعار المكتب" className="sidebar-office-logo" />
            </div>
          )}
          <span>نسخة المكتب</span>
          <strong>{officeProfile?.officeName ?? 'مكتب العقود'}</strong>
          <small>قاعدة البيانات محلية وآمنة</small>
        </div>
      </aside>

      <main>
        {(() => {
          const meta = viewMeta[view];
          const resultCount =
            view === 'contracts'
              ? contracts.length
              : view === 'templates'
              ? templates.length
              : view === 'parties'
              ? parties.length
              : payments.length;
          const isSearchable = view !== 'dashboard' && view !== 'backup' && view !== 'settings';

          return (
            <>
              <header className="page-header">
                <div className="page-header-info">
                  <span className="page-header-date">{arabicDate}</span>
                  <h1 className="page-title">{meta.title}</h1>
                  <p className="page-subtitle">{meta.subtitle}</p>
                </div>
                {meta.actionLabel && (
                  <div className="page-header-actions">
                    <button
                      className="primary"
                      onClick={meta.actionType === 'template' ? () => setEditingTemplate('new') : openContractForm}
                    >
                      {meta.actionLabel}
                    </button>
                  </div>
                )}
              </header>

              {error && (
                <div className="page-error">
                  <strong>تعذر إكمال العملية</strong>
                  <span>{error}</span>
                  <button onClick={() => setError('')}>×</button>
                </div>
              )}

              {isSearchable && (
                <div className="toolbar">
                  <div className="search-input-wrap">
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={`ابحث في ${meta.title}…`}
                      className="search-input"
                    />
                    <span className="results-count-badge">
                      {resultCount} {resultCount === 1 ? 'نتيجة' : resultCount === 2 ? 'نتيجتان' : 'نتائج'}
                    </span>
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {loading ? (
          <div className="loading">جارٍ تحميل البيانات…</div>
        ) : (
          <>
            {view === 'dashboard' && dashboard && (
              <>
                <section className="stats">
                  <article>
                    <span>العقود الكلية</span>
                    <strong>{dashboard.totalContracts}</strong>
                    <small>كل العقود المسجلة</small>
                  </article>
                  <article>
                    <span>عقود هذا الشهر</span>
                    <strong>{dashboard.currentMonthContracts}</strong>
                    <small>حسب تاريخ العقد</small>
                  </article>
                  <article>
                    <span>المبالغ المستلمة</span>
                    <div className="currency-stack">
                      <strong>{formatMoney(dashboard.receivedIQD)}</strong>
                      <strong>{formatMoney(dashboard.receivedUSD, 'USD')}</strong>
                    </div>
                    <small className="positive">إجمالي الدفعات حسب العملة</small>
                  </article>
                  <article>
                    <span>المبالغ المتبقية</span>
                    <div className="currency-stack">
                      <strong>{formatMoney(dashboard.pendingIQD)}</strong>
                      <strong>{formatMoney(dashboard.pendingUSD, 'USD')}</strong>
                    </div>
                    <small className="warning">الأرصدة الفعلية التي تحتاج متابعة</small>
                  </article>
                </section>
                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <h2>أحدث العقود</h2>
                      <p>آخر العمليات المسجلة في المكتب</p>
                    </div>
                    <button className="text-button" onClick={() => changeView('contracts')}>
                      عرض جميع العقود
                    </button>
                  </div>
                  <ContractsTable
                    contracts={dashboard.recentContracts}
                    onOpen={openContractViewer}
                    onEdit={openContractEdit}
                    onDelete={removeContract}
                    onDetails={openDetails}
                  />
                </section>
              </>
            )}

            {view === 'contracts' && (
              <section className="panel">
                <ContractsTable
                  contracts={contracts}
                  onOpen={openContractViewer}
                  onEdit={openContractEdit}
                  onDelete={removeContract}
                  onDetails={openDetails}
                />
              </section>
            )}

            {view === 'templates' && (
              <section className="template-grid">
                {templates.map((template) => (
                  <article key={template.id} className="template-card">
                    <header>
                      <div>
                        <span>{template.isDefault ? 'القالب الافتراضي' : 'قالب محفوظ'}</span>
                        <h2>{template.name}</h2>
                      </div>
                      <strong>{template.clauses.length} بنود</strong>
                    </header>
                    <p>{template.description || 'لا يوجد وصف لهذا القالب.'}</p>
                    <dl>
                      <div>
                        <dt>العقود المرتبطة</dt>
                        <dd>
                          {template.contractsCount > 0 ? (
                            <button
                              type="button"
                              className="template-contracts-badge"
                              onClick={() => openTemplateContracts(template)}
                              title="عرض العقود المرتبطة بهذا القالب"
                            >
                              {template.contractsCount} عقود
                            </button>
                          ) : (
                            <span>0</span>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>آخر تحديث</dt>
                        <dd>{template.updatedAt.slice(0, 10)}</dd>
                      </div>
                    </dl>
                    <footer>
                      <button className="secondary" onClick={() => setEditingTemplate(template)}>
                        تعديل القالب
                      </button>
                      <button
                        className="text-danger"
                        disabled={template.isDefault}
                        onClick={() => removeTemplate(template)}
                      >
                        حذف
                      </button>
                    </footer>
                  </article>
                ))}
              </section>
            )}

            {view === 'parties' && (
              <section className="panel">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>الاسم</th>
                        <th>الهاتف</th>
                        <th>رقم الهوية</th>
                        <th>العنوان</th>
                        <th>عدد العقود</th>
                        <th>إجمالي د.ع</th>
                        <th>إجمالي $</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parties.map((party) => (
                        <tr key={party.id}>
                          <td>
                            <button
                              type="button"
                              className="link-button party-name-btn"
                              onClick={() => openPartyDetails(party)}
                              title="عرض عقود هذا الطرف"
                            >
                              <strong>{party.name}</strong>
                            </button>
                          </td>
                          <td>{party.phone || '—'}</td>
                          <td>{party.identifier || '—'}</td>
                          <td>{party.address || '—'}</td>
                          <td>
                            {party.contractsCount > 0 ? (
                              <button
                                type="button"
                                className="template-contracts-badge"
                                onClick={() => openPartyDetails(party)}
                                title="عرض عقود هذا الطرف"
                              >
                                {party.contractsCount} عقود
                              </button>
                            ) : (
                              <span>0</span>
                            )}
                          </td>
                          <td>{formatMoney(party.totalValueIQD)}</td>
                          <td>{formatMoney(party.totalValueUSD, 'USD')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!parties.length && (
                    <div className="empty-state">
                      <strong>لا توجد أطراف</strong>
                      <span>تُضاف الأطراف تلقائياً مع العقود.</span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {view === 'payments' && (
              <section className="panel">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>العقد</th>
                        <th>النوع</th>
                        <th>التاريخ</th>
                        <th>الطريقة</th>
                        <th>المبلغ</th>
                        <th>ملاحظة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id}>
                          <td>
                            <button
                              type="button"
                              className="link-button contract-id"
                              onClick={() => openContractViewer(payment.contractId)}
                              title="فتح وثيقة العقد في نافذة المعاينة والطباعة"
                            >
                              {payment.contractNumber}
                            </button>
                          </td>
                          <td>{payment.contractType}</td>
                          <td>{payment.paymentDate}</td>
                          <td>{payment.method}</td>
                          <td>{formatMoney(payment.amount, payment.currency)}</td>
                          <td>{payment.note || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!payments.length && (
                    <div className="empty-state">
                      <strong>لا توجد دفعات</strong>
                      <span>يمكن تسجيل الدفعة من تفاصيل العقد.</span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {view === 'backup' && (
              <section className="backup-grid">
                <article>
                  <div className="feature-icon">↓</div>
                  <h2>إنشاء نسخة احتياطية</h2>
                  <p>
                    يحفظ نسخة كاملة من العقود والأطراف والدفعات والقوالب في ملف مستقل يمكن نقله إلى وسيط خارجي.
                  </p>
                  <button
                    className="primary"
                    onClick={async () => {
                      try {
                        const result = await window.maktoob.createBackup();
                        if (result.ok && result.path) notify(`تم حفظ النسخة: ${result.path}`);
                      } catch (caught) {
                        setError(messageFrom(caught));
                      }
                    }}
                  >
                    حفظ نسخة الآن
                  </button>
                </article>
                <article>
                  <div className="feature-icon">↑</div>
                  <h2>استعادة نسخة</h2>
                  <p>
                    يفحص سلامة ملف النسخة أولاً، ثم يستبدل قاعدة البيانات الحالية بعد التأكد التام من صلاحيته.
                  </p>
                  <button
                    className="secondary"
                    onClick={async () => {
                      if (!confirm('ستُستبدل البيانات الحالية بمحتوى النسخة. هل تريد المتابعة؟')) return;
                      try {
                        const result = await window.maktoob.restoreBackup();
                        if (result.ok) {
                          notify('تمت استعادة النسخة بنجاح');
                          changeView('dashboard');
                        } else if (result.message !== 'تم إلغاء العملية') {
                          setError(result.message);
                        }
                      } catch (caught) {
                        setError(messageFrom(caught));
                      }
                    }}
                  >
                    اختيار نسخة للاستعادة
                  </button>
                </article>
              </section>
            )}

            {view === 'settings' && officeProfile && (
              <OfficeSettings
                profile={officeProfile}
                onSaved={(profile) => {
                  setOfficeProfile(profile);
                  notify('تم حفظ إعدادات المكتب');
                }}
              />
            )}
          </>
        )}
      </main>

      {editing && (
        <ContractForm
          contract={editing === 'new' ? null : editing}
          templates={templates}
          parties={parties}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            const created = editing === 'new';
            setEditing(null);
            notify(created ? 'تم إنشاء العقد بنجاح' : 'تم تحديث العقد بنجاح');
            await load();
          }}
        />
      )}

      {editingTemplate && (
        <TemplateForm
          template={editingTemplate === 'new' ? null : editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSaved={async () => {
            const created = editingTemplate === 'new';
            setEditingTemplate(null);
            notify(created ? 'تم إنشاء القالب بنجاح' : 'تم تحديث القالب بنجاح');
            await load();
          }}
        />
      )}

      {details && (
        <ContractDetails
          contract={details}
          onClose={() => setDetails(null)}
          onChanged={refreshDetails}
          notify={notify}
        />
      )}

      {selectedTemplateContracts && (
        <div className="modal-backdrop" onClick={() => setSelectedTemplateContracts(null)}>
          <section
            className="modal template-contracts-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="modal-head">
              <div>
                <span className="eyebrow">قالب العقود</span>
                <h2>العقود المرتبطة بقالب «{selectedTemplateContracts.template.name}»</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setSelectedTemplateContracts(null)}
              >
                ×
              </button>
            </header>
            <div className="modal-body-scrollable">
              <ContractsTable
                contracts={selectedTemplateContracts.contracts}
                onOpen={openContractViewer}
                onEdit={(id) => {
                  setSelectedTemplateContracts(null);
                  openContractEdit(id);
                }}
                onDelete={async (id) => {
                  await removeContract(id);
                  const refreshed = await window.maktoob.listContractsByTemplate(
                    selectedTemplateContracts.template.id
                  );
                  setSelectedTemplateContracts({
                    ...selectedTemplateContracts,
                    contracts: refreshed,
                  });
                }}
                onDetails={(id) => {
                  setSelectedTemplateContracts(null);
                  openDetails(id);
                }}
              />
            </div>
          </section>
        </div>
      )}

      {selectedPartyDetails && (
        <div className="modal-backdrop" onClick={() => setSelectedPartyDetails(null)}>
          <section
            className="modal party-contracts-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="modal-head">
              <div>
                <span className="eyebrow">سجل الأطراف</span>
                <h2>العقود المرتبطة بالطرف: {selectedPartyDetails.party.name}</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setSelectedPartyDetails(null)}
              >
                ×
              </button>
            </header>
            <div className="party-summary-banner">
              <div>
                <span>الهاتف:</span>
                <strong>{selectedPartyDetails.party.phone || '—'}</strong>
              </div>
              <div>
                <span>الهوية:</span>
                <strong>{selectedPartyDetails.party.identifier || '—'}</strong>
              </div>
              <div>
                <span>إجمالي (د.ع):</span>
                <strong>{formatMoney(selectedPartyDetails.party.totalValueIQD)}</strong>
              </div>
              <div>
                <span>إجمالي ($):</span>
                <strong>{formatMoney(selectedPartyDetails.party.totalValueUSD, 'USD')}</strong>
              </div>
            </div>
            <div className="modal-body-scrollable">
              <ContractsTable
                contracts={selectedPartyDetails.contracts}
                onOpen={openContractViewer}
                onEdit={(id) => {
                  setSelectedPartyDetails(null);
                  openContractEdit(id);
                }}
                onDelete={async (id) => {
                  await removeContract(id);
                  const refreshed = await window.maktoob.listContractsByParty(
                    selectedPartyDetails.party.id
                  );
                  setSelectedPartyDetails({
                    ...selectedPartyDetails,
                    contracts: refreshed,
                  });
                }}
                onDetails={(id) => {
                  setSelectedPartyDetails(null);
                  openDetails(id);
                }}
              />
            </div>
          </section>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
