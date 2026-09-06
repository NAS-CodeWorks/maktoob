# Maktoob v1.1 Form System — Handoff Notes

## Branch & Base
- **Branch**: `feature/v1.1-form-system`
- **Base SHA**: `ca783a922f28224f5af5a3d3695723432cd77c79` (Release v1.1.0)
- **Status**: READY FOR INTEGRATION

---

## Delivered Components & Assets

All components are located in `src/components/ui/` and exported from `src/components/ui/index.ts`:

1. **`Field`**: Accessible wrapper associating labels, required markers, hints, helper texts, and error messages via ARIA.
2. **`TextInput`**: 44px height input with subtle product focus ring, clear error state, clearable button, leading icon/trailing addon support, and LTR formatting for phone, IDs, and contract numbers.
3. **`NumberInput`**: 44px numeric entry with optional `+` / `-` stepper buttons and LTR digit orientation.
4. **`CurrencyInput`**: Dual amount input + currency toggle (`IQD` / `USD`), eliminating ad-hoc `.money-input` styling.
5. **`DateInput`**: 44px Arabic date picker with LTR ISO date format, calendar affordance, and quick "اليوم" (Today) button.
6. **`Select`**: Accessible dropdown replacing native select with closed/opened states, hover highlights, checkmark `✓` on active selection, comfortable row height, keyboard navigation (`ArrowDown`, `ArrowUp`, `Enter`, `Space`, `Escape`), and click-outside closure.
7. **`SearchableCombobox`**: Dedicated searchable picker for large datasets (e.g. party registry). Features live debounced filtering, search by name, phone, or national ID, rich cards showing name, phone chip, and identity chip, and empty state handling ("لا توجد نتائج مطابقة").
8. **`Textarea`**: Multi-line clause/notes entry with auto-resizing, character count display, and theme focus rings.
9. **`FieldGroup`**: Responsive CSS grid (1 to 4 columns) with standard gaps (10px, 16px, 22px), designed for 1920×1080 down to 1100×700 without horizontal scrolling.
10. **`SectionHeader`**: Section title, subtitle, badge, action slot, and divider.
11. **`FormSection`**: Section card/container with optional collapsible toggle (progressive disclosure).
12. **`ValidationMessage`**: Accessible error, warning, info, and success notices with SVG icons.
13. **`useDebouncedValue`**: Debounce hook in `src/hooks/useDebouncedValue.ts`.
14. **`src/types/ui.ts`**: TypeScript definitions.
15. **`src/styles/controls.css` & `src/styles/forms.css`**: Control and form stylesheets.

---

## Integration Guide for Consumer Agents

### 1. Stylesheet Inclusion
`src/components/ui/index.ts` automatically imports both `src/styles/controls.css` and `src/styles/forms.css`.
Alternatively, other agents can import them globally in `src/styles.css` if desired:
```css
@import './styles/controls.css';
@import './styles/forms.css';
```

---

### 2. Upgrading `ContractForm.tsx`

#### A. Replacing Party Import `<select>` with `<SearchableCombobox>`
In `src/components/ContractForm.tsx`, lines 295–320 currently use a native `<select>`:
```tsx
// BEFORE:
{parties.length > 0 && (
  <div style={{ marginBottom: '12px' }}>
    <select
      style={{ fontSize: '11px', padding: '6px 8px', width: '100%' }}
      onChange={(e) => handleSelectParty(side, e.target.value)}
      defaultValue=""
    >
      <option value="">استيراد بيانات طرف سابق...</option>
      {parties.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name} ({p.phone || 'بدون هاتف'} - {p.identifier || 'بدون هوية'})
        </option>
      ))}
    </select>
  </div>
)}
```

**Recommended Replacement**:
```tsx
import { SearchableCombobox } from './ui';

<SearchableCombobox
  label="استيراد بيانات طرف سابق"
  placeholder="ابحث باسم الطرف أو رقم الهاتف أو الهوية..."
  searchPlaceholder="ابحث باسم الطرف أو رقم الهاتف أو الهوية..."
  items={parties}
  onSelect={(party) => {
    if (party) {
      handleSelectParty(side, String(party.id));
    }
  }}
  emptyMessage="لا يوجد طرف مسجل بهذا الاسم أو الرقم"
/>
```

---

#### B. Replacing Money / Currency Input
In `src/components/ContractForm.tsx`, lines 183–197:
```tsx
// BEFORE:
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
```

**Recommended Replacement**:
```tsx
import { CurrencyInput } from './ui';

<CurrencyInput
  label="قيمة العقد"
  required
  amount={watchAmount}
  currency={watchCurrency}
  onAmountChange={(val) => setValue('amount', val)}
  onCurrencyChange={(curr) => setValue('currency', curr)}
  error={errors.amount?.message}
/>
```

---

#### C. Replacing Contract Type & Status Selects
```tsx
import { Select } from './ui';

<Select
  label="نوع العقد"
  required
  value={watchType}
  onChange={(val) => onTypeChange(val as string)}
  options={[
    { value: 'بيع عام', label: 'بيع عام' },
    { value: 'بيع عقار', label: 'عقد بيع عقار / أرض' },
    { value: 'بيع مركبة', label: 'عقد بيع سيارة / مركبة' },
    { value: 'إيجار', label: 'عقد إيجار' },
    { value: 'تعهد', label: 'تعهد والتزام' },
    { value: 'مخالصة', label: 'مخالصة وإبراء ذمة' },
  ]}
/>
```

---

#### D. Replacing Field Grids with `FieldGroup` and `FormSection`
```tsx
import { FormSection, FieldGroup, TextInput, DateInput } from './ui';

<FormSection title="البيانات الأساسية للعقد" variant="card">
  <FieldGroup columns={3}>
    <DateInput
      label="تاريخ العقد"
      required
      showTodayButton
      {...register('contractDate', { required: true })}
    />
    {/* other fields */}
  </FieldGroup>
</FormSection>
```

---

## Files Intentionally NOT Touched
To strictly prevent merge conflicts across parallel agents:
- `src/App.tsx`
- `electron/*`
- `shared/domain.ts`
- `src/components/ContractForm.tsx`
- `src/components/ContractDetails.tsx`
- `src/components/OfficeSettings.tsx`
- `src/styles.css`
- Any contract renderer or database migration files.
