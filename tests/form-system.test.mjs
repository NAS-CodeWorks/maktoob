import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

test('form system: all 12 required UI component files exist in src/components/ui', async () => {
  const expectedComponents = [
    'Field.tsx',
    'TextInput.tsx',
    'NumberInput.tsx',
    'CurrencyInput.tsx',
    'DateInput.tsx',
    'Select.tsx',
    'SearchableCombobox.tsx',
    'Textarea.tsx',
    'FieldGroup.tsx',
    'SectionHeader.tsx',
    'FormSection.tsx',
    'ValidationMessage.tsx',
    'index.ts',
  ];

  for (const comp of expectedComponents) {
    const compPath = path.resolve('src/components/ui', comp);
    const compStat = await stat(compPath);
    assert.ok(compStat.size > 0, `Component ${comp} must exist and be non-empty`);
  }
});

test('form system: barrel index exports all components, hook, and types', async () => {
  const indexPath = path.resolve('src/components/ui/index.ts');
  const content = await readFile(indexPath, 'utf8');

  const requiredExports = [
    'Field',
    'TextInput',
    'NumberInput',
    'CurrencyInput',
    'DateInput',
    'Select',
    'SearchableCombobox',
    'Textarea',
    'FieldGroup',
    'SectionHeader',
    'FormSection',
    'ValidationMessage',
    'useDebouncedValue',
    'controls.css',
    'forms.css',
  ];

  for (const exp of requiredExports) {
    assert.ok(
      content.includes(exp),
      `src/components/ui/index.ts must include export/import for "${exp}"`,
    );
  }
});

test('form system: hooks and types modules exist and export expected contracts', async () => {
  const hookPath = path.resolve('src/hooks/useDebouncedValue.ts');
  const hookContent = await readFile(hookPath, 'utf8');
  assert.ok(hookContent.includes('export function useDebouncedValue'));

  const typesPath = path.resolve('src/types/ui.ts');
  const typesContent = await readFile(typesPath, 'utf8');
  assert.ok(typesContent.includes('export interface FieldProps'));
  assert.ok(typesContent.includes('export interface TextInputProps'));
  assert.ok(typesContent.includes('export interface NumberInputProps'));
  assert.ok(typesContent.includes('export interface CurrencyInputProps'));
  assert.ok(typesContent.includes('export interface DateInputProps'));
  assert.ok(typesContent.includes('export interface SelectProps'));
  assert.ok(typesContent.includes('export interface SearchableComboboxProps'));
  assert.ok(typesContent.includes('export interface TextareaProps'));
  assert.ok(typesContent.includes('export interface FieldGroupProps'));
  assert.ok(typesContent.includes('export interface SectionHeaderProps'));
  assert.ok(typesContent.includes('export interface FormSectionProps'));
  assert.ok(typesContent.includes('export interface ValidationMessageProps'));
});

test('form system: controls.css enforces 42-46px height, theme tokens, and LTR data presentation', async () => {
  const cssPath = path.resolve('src/styles/controls.css');
  const css = await readFile(cssPath, 'utf8');

  // Input height between 42px and 46px
  assert.ok(css.includes('height: 44px') || css.includes('min-height: 44px'), 'Standard height must be 44px (within 42-46px)');

  // Theme tokens
  assert.ok(css.includes('var(--primary'), 'Must use var(--primary)');
  assert.ok(css.includes('var(--primary-focus-ring'), 'Must use var(--primary-focus-ring)');
  assert.ok(css.includes('var(--input-border'), 'Must use var(--input-border)');
  assert.ok(css.includes('var(--danger'), 'Must use var(--danger)');

  // LTR data values preservation
  assert.ok(css.includes('data-ltr'), 'Must define data-ltr class/attribute for numerals/phone/IDs');
  assert.ok(css.includes('direction: ltr'), 'Must format data values LTR');
  assert.ok(css.includes('input-phone'), 'Must have input-phone class');
  assert.ok(css.includes('input-numeric'), 'Must have input-numeric class');

  // Select closed/opened requirements
  assert.ok(css.includes('maktoob-select-trigger'), 'Must define select trigger');
  assert.ok(css.includes('maktoob-select-listbox'), 'Must define select listbox');
  assert.ok(css.includes('is-highlighted'), 'Must define option hover/keyboard highlight');
  assert.ok(css.includes('is-selected'), 'Must define option selected state');

  // SearchableCombobox requirements
  assert.ok(css.includes('maktoob-combobox'), 'Must define combobox container');
  assert.ok(css.includes('maktoob-combobox-item-name'), 'Must display party name');
  assert.ok(css.includes('chip-phone'), 'Must display party phone chip');
  assert.ok(css.includes('chip-id'), 'Must display party identity number chip');
});

test('form system: forms.css enforces RTL-first layout, Arabic indicators, and responsive grid', async () => {
  const cssPath = path.resolve('src/styles/forms.css');
  const css = await readFile(cssPath, 'utf8');

  assert.ok(css.includes('direction: rtl'), 'Must enforce RTL direction');
  assert.ok(css.includes('maktoob-field'), 'Must define field layout container');
  assert.ok(css.includes('maktoob-field-label'), 'Must separate label from field');
  assert.ok(css.includes('maktoob-required-indicator') || css.includes('maktoob-required-badge'), 'Must provide clear Arabic required indicator');
  assert.ok(css.includes('maktoob-validation-message'), 'Must provide under-field validation message');

  // FieldGroup columns and responsiveness
  assert.ok(css.includes('columns-2'), 'Must support 2 columns');
  assert.ok(css.includes('columns-3'), 'Must support 3 columns');
  assert.ok(css.includes('columns-4'), 'Must support 4 columns');
  assert.ok(css.includes('@media'), 'Must include responsive media queries for desktop viewports');
});

test('form system: SearchableCombobox contains required party search placeholders and labels', async () => {
  const comboboxPath = path.resolve('src/components/ui/SearchableCombobox.tsx');
  const content = await readFile(comboboxPath, 'utf8');

  assert.ok(
    content.includes('ابحث باسم الطرف أو رقم الهاتف'),
    'Must include party search example placeholder',
  );
  assert.ok(
    content.includes('لا توجد نتائج مطابقة'),
    'Must include Arabic empty message',
  );
  assert.ok(
    content.includes('chip-phone') && content.includes('chip-id'),
    'Must render phone and identity chips',
  );
});

test('form system: Select component satisfies keyboard and state requirements', async () => {
  const selectPath = path.resolve('src/components/ui/Select.tsx');
  const content = await readFile(selectPath, 'utf8');

  assert.ok(content.includes('ArrowDown') && content.includes('ArrowUp'), 'Must support Arrow key navigation');
  assert.ok(content.includes('Escape'), 'Must support Escape close');
  assert.ok(content.includes('Enter') && content.includes("' '"), 'Must support Enter / Space select');
  assert.ok(content.includes('handleClickOutside') || content.includes('mousedown'), 'Must support click outside close');
  assert.ok(content.includes('✓'), 'Must mark selected option with checkmark in opened state');
});
