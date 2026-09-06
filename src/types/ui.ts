import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

export type Direction = 'rtl' | 'ltr' | 'auto';
export type InputSize = 'sm' | 'md' | 'lg';
export type DataValueType = 'phone' | 'identifier' | 'contractNumber' | 'currency' | 'date' | 'general';

/**
 * Validation message types and props
 */
export type ValidationVariant = 'error' | 'warning' | 'info' | 'success';

export interface ValidationMessageProps {
  id?: string;
  variant?: ValidationVariant;
  message?: ReactNode;
  children?: ReactNode;
  className?: string;
  role?: string;
}

/**
 * Base field container props
 */
export interface FieldProps {
  id?: string;
  label?: ReactNode;
  required?: boolean;
  requiredIndicator?: ReactNode;
  error?: ReactNode;
  helperText?: ReactNode;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
  wide?: boolean;
  direction?: Direction;
  disabled?: boolean;
}

/**
 * Common styling and decoration props for inputs
 */
export interface BaseInputProps {
  label?: ReactNode;
  error?: ReactNode;
  helperText?: ReactNode;
  required?: boolean;
  inputSize?: InputSize;
  dataValueType?: DataValueType;
  leadingIcon?: ReactNode;
  trailingAddon?: ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  wrapperClassName?: string;
}

/**
 * TextInput props extending standard HTML input attributes
 */
export interface TextInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    BaseInputProps {
  multiline?: false;
}

/**
 * NumberInput props extending standard HTML input attributes
 */
export interface NumberInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'>,
    BaseInputProps {
  showStepper?: boolean;
  min?: number;
  max?: number;
  step?: number;
  allowDecimals?: boolean;
  onValueChange?: (value: number | null) => void;
}

/**
 * Currency values and props
 */
export type SupportedCurrency = 'IQD' | 'USD';

export interface CurrencyInputProps extends BaseInputProps {
  id?: string;
  name?: string;
  amount: number | string;
  currency: SupportedCurrency;
  onAmountChange: (amount: number, raw: string) => void;
  onCurrencyChange?: (currency: SupportedCurrency) => void;
  currencies?: SupportedCurrency[];
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  min?: number;
  max?: number;
  className?: string;
}

/**
 * DateInput props extending standard HTML input attributes
 */
export interface DateInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'>,
    BaseInputProps {
  showTodayButton?: boolean;
  todayButtonLabel?: string;
  displayFormat?: string;
}

/**
 * Select option definition
 */
export interface SelectOption<T = string | number> {
  value: T;
  label: string;
  description?: string;
  badge?: string;
  disabled?: boolean;
  icon?: ReactNode;
}

/**
 * Custom Select component props
 */
export interface SelectProps<T = string | number> {
  id?: string;
  name?: string;
  label?: ReactNode;
  error?: ReactNode;
  helperText?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  options: SelectOption<T>[];
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
  clearable?: boolean;
  emptyText?: string;
  ariaLabel?: string;
}

/**
 * Rich combobox search item (e.g., party record)
 */
export interface ComboboxItem {
  id: string | number;
  name: string;
  phone?: string;
  identifier?: string;
  address?: string;
  subtitle?: string;
  badge?: string;
  disabled?: boolean;
  raw?: unknown;
}

/**
 * SearchableCombobox props for large datasets (e.g. party registry)
 */
export interface SearchableComboboxProps<T extends ComboboxItem = ComboboxItem> {
  id?: string;
  label?: ReactNode;
  error?: ReactNode;
  helperText?: ReactNode;
  required?: boolean;
  disabled?: boolean;
  items: T[];
  selectedItem?: T | null;
  selectedId?: string | number | null;
  onSelect: (item: T | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loadingMessage?: string;
  isLoading?: boolean;
  className?: string;
  wrapperClassName?: string;
  clearable?: boolean;
  minSearchLength?: number;
  customFilter?: (item: T, query: string) => boolean;
}

/**
 * Textarea props extending standard HTML textarea attributes
 */
export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>,
    BaseInputProps {
  showCount?: boolean;
  maxCount?: number;
  minRows?: number;
  autoResize?: boolean;
}

/**
 * FieldGroup layout props
 */
export interface FieldGroupProps {
  columns?: 1 | 2 | 3 | 4 | 'auto';
  gap?: 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'end' | 'stretch';
  className?: string;
  children: ReactNode;
}

/**
 * SectionHeader props
 */
export interface SectionHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  level?: 2 | 3 | 4 | 5;
  className?: string;
  compact?: boolean;
}

/**
 * FormSection card / group container props
 */
export interface FormSectionProps {
  id?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  variant?: 'card' | 'bordered' | 'flat';
  className?: string;
  children: ReactNode;
}
