import { useMemo, useState } from 'react';

type ContractStatus = 'مسودة' | 'مكتمل' | 'بانتظار الدفع';

type Contract = {
  id: string;
  type: string;
  firstParty: string;
  secondParty: string;
  amount: number;
  date: string;
  status: ContractStatus;
};

const contracts: Contract[] = [
  { id: 'MK-00024', type: 'بيع عقار', firstParty: 'محمد سالم', secondParty: 'أحمد جاسم', amount: 85000000, date: '2026/09/01', status: 'مكتمل' },
  { id: 'MK-00023', type: 'بيع مركبة', firstParty: 'سعد نوري', secondParty: 'كرار حامد', amount: 18500000, date: '2026/08/31', status: 'بانتظار الدفع' },
  { id: 'MK-00022', type: 'بيع عام', firstParty: 'علي حسين', secondParty: 'مصطفى كريم', amount: 2400000, date: '2026/08/30', status: 'مسودة' },
];

const formatMoney = (value: number) => `${new Intl.NumberFormat('ar-IQ').format(value)} د.ع`;

export function App() {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return contracts;
    return contracts.filter((contract) => Object.values(contract).some((field) => String(field).toLowerCase().includes(value)));
  }, [query]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">م</span><div><strong>مكتوب</strong><small>من السجلات إلى الديسكتوب</small></div></div>
        <nav aria-label="التنقل الرئيسي">
          <button className="nav-item active">نظرة عامة</button>
          <button className="nav-item">العقود</button>
          <button className="nav-item">الأطراف</button>
          <button className="nav-item">الدفعات</button>
          <button className="nav-item">النسخ الاحتياطي</button>
        </nav>
        <div className="office-card"><span>نسخة المكتب</span><strong>مكتب الأنبار للعقود</strong><small>الجهاز مفعل</small></div>
      </aside>

      <main>
        <header className="topbar">
          <div><p>الثلاثاء، 1 أيلول 2026</p><h1>نظرة عامة</h1></div>
          <button className="primary">+ عقد جديد</button>
        </header>

        <section className="stats" aria-label="ملخص العقود">
          <article><span>العقود الكلية</span><strong>24</strong><small>منذ بدء استخدام النظام</small></article>
          <article><span>عقود هذا الشهر</span><strong>7</strong><small className="positive">+3 عن الشهر السابق</small></article>
          <article><span>المبالغ المستلمة</span><strong>3,250,000 د.ع</strong><small>خلال الشهر الحالي</small></article>
          <article><span>مبالغ معلقة</span><strong>850,000 د.ع</strong><small className="warning">تحتاج متابعة</small></article>
        </section>

        <section className="panel">
          <div className="panel-head"><div><h2>أحدث العقود</h2><p>آخر العمليات المسجلة في المكتب</p></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالاسم أو رقم العقد" aria-label="البحث في العقود" /></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>رقم العقد</th><th>النوع</th><th>الطرف الأول</th><th>الطرف الثاني</th><th>القيمة</th><th>التاريخ</th><th>الحالة</th></tr></thead>
              <tbody>{filtered.map((contract) => <tr key={contract.id}><td className="contract-id">{contract.id}</td><td>{contract.type}</td><td>{contract.firstParty}</td><td>{contract.secondParty}</td><td>{formatMoney(contract.amount)}</td><td>{contract.date}</td><td><span className={`status status-${contract.status}`}>{contract.status}</span></td></tr>)}</tbody>
            </table>
            {filtered.length === 0 && <p className="empty">لا توجد عقود تطابق البحث.</p>}
          </div>
        </section>
      </main>
    </div>
  );
}
