// Tipos globais para os componentes PrimeReact padronizados

import { ReactNode, CSSProperties, MouseEvent } from 'react';
import { Control, FieldValues, Path, RegisterOptions } from 'react-hook-form';
import { z } from 'zod';

// ============================================================================
// TIPOS BASE
// ============================================================================

/**
 * Tamanhos padrão para componentes
 */
export type ComponentSize = 'small' | 'medium' | 'large';

/**
 * Variantes de cor para componentes
 */
export type ComponentVariant = 
  | 'primary' 
  | 'secondary' 
  | 'success' 
  | 'warning' 
  | 'danger' 
  | 'info' 
  | 'help'
  | 'contrast';

/**
 * Severidade para notificações e alertas
 */
export type Severity = 'success' | 'info' | 'warn' | 'error';

/**
 * Posições para elementos flutuantes
 */
export type Position = 
  | 'top' 
  | 'bottom' 
  | 'left' 
  | 'right' 
  | 'top-left' 
  | 'top-right' 
  | 'bottom-left' 
  | 'bottom-right';

/**
 * Orientações para layouts
 */
export type Orientation = 'horizontal' | 'vertical';

/**
 * Estados de loading
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// ============================================================================
// TIPOS DE DADOS
// ============================================================================

/**
 * Opção para selects e dropdowns
 */
export interface SelectOption<T = any> {
  label: string;
  value: T;
  disabled?: boolean;
  icon?: string;
  description?: string;
  group?: string;
  data?: Record<string, any>;
}

/**
 * Grupo de opções
 */
export interface OptionGroup<T = any> {
  label: string;
  items: SelectOption<T>[];
  disabled?: boolean;
}

/**
 * Item de menu
 */
export interface MenuItem {
  label: string;
  icon?: string;
  url?: string;
  command?: (event: MenuItemCommandEvent) => void;
  items?: MenuItem[];
  disabled?: boolean;
  visible?: boolean;
  target?: string;
  separator?: boolean;
  badge?: string | number;
  badgeClassName?: string;
  className?: string;
  style?: CSSProperties;
  template?: (item: MenuItem, options: any) => ReactNode;
}

/**
 * Evento de comando de item de menu
 */
export interface MenuItemCommandEvent {
  originalEvent: MouseEvent<HTMLElement>;
  item: MenuItem;
}

/**
 * Breadcrumb item
 */
export interface BreadcrumbItem {
  label: string;
  url?: string;
  icon?: string;
  command?: (event: MenuItemCommandEvent) => void;
  template?: (item: BreadcrumbItem, options: any) => ReactNode;
}

/**
 * Ação de botão
 */
export interface ButtonAction {
  label: string;
  icon?: string;
  command?: (event: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  visible?: boolean;
  variant?: ComponentVariant;
  size?: ComponentSize;
  loading?: boolean;
  tooltip?: string;
  badge?: string | number;
  className?: string;
  style?: CSSProperties;
}

// ============================================================================
// TIPOS DE FORMULÁRIO
// ============================================================================

/**
 * Tipos de campo de formulário
 */
export type FormFieldType = 
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'currency'
  | 'percentage'
  | 'phone'
  | 'cpf'
  | 'cnpj'
  | 'cep'
  | 'date'
  | 'datetime'
  | 'time'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'radio'
  | 'switch'
  | 'slider'
  | 'rating'
  | 'file'
  | 'image'
  | 'editor'
  | 'autocomplete'
  | 'chips'
  | 'color'
  | 'mask';

/**
 * Configuração base de campo de formulário
 */
export interface BaseFieldConfig {
  name: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  hidden?: boolean;
  size?: ComponentSize;
  className?: string;
  style?: CSSProperties;
  tooltip?: string;
  icon?: string;
  prefix?: string;
  suffix?: string;
  validation?: RegisterOptions;
  conditional?: {
    field: string;
    value: any;
    operator?: 'equals' | 'not-equals' | 'contains' | 'not-contains' | 'greater' | 'less';
  };
}

/**
 * Configuração específica para campos de texto
 */
export interface TextFieldConfig extends BaseFieldConfig {
  type: 'text' | 'email' | 'password' | 'phone' | 'cpf' | 'cnpj' | 'cep';
  maxLength?: number;
  minLength?: number;
  mask?: string;
  format?: (value: string) => string;
  parse?: (value: string) => string;
}

/**
 * Configuração específica para campos numéricos
 */
export interface NumberFieldConfig extends BaseFieldConfig {
  type: 'number' | 'currency' | 'percentage';
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  currency?: string;
  locale?: string;
  showButtons?: boolean;
  buttonLayout?: 'stacked' | 'horizontal' | 'vertical';
}

/**
 * Configuração específica para campos de seleção
 */
export interface SelectFieldConfig extends BaseFieldConfig {
  type: 'select' | 'multiselect';
  options: SelectOption[] | OptionGroup[];
  searchable?: boolean;
  clearable?: boolean;
  multiple?: boolean;
  maxSelectedLabels?: number;
  selectedItemsLabel?: string;
  emptyMessage?: string;
  emptyFilterMessage?: string;
  loading?: boolean;
  loadingIcon?: string;
  virtualScrollerOptions?: any;
  onFilter?: (event: any) => void;
  onShow?: () => void;
  onHide?: () => void;
}

/**
 * Configuração específica para campos de data
 */
export interface DateFieldConfig extends BaseFieldConfig {
  type: 'date' | 'datetime' | 'time';
  dateFormat?: string;
  timeFormat?: string;
  showTime?: boolean;
  showSeconds?: boolean;
  showMilliseconds?: boolean;
  hourFormat?: '12' | '24';
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
  disabledDays?: number[];
  inline?: boolean;
  numberOfMonths?: number;
  view?: 'date' | 'month' | 'year';
  touchUI?: boolean;
}

/**
 * Configuração específica para campos de arquivo
 */
export interface FileFieldConfig extends BaseFieldConfig {
  type: 'file' | 'image';
  accept?: string;
  multiple?: boolean;
  maxFileSize?: number;
  maxFiles?: number;
  auto?: boolean;
  chooseLabel?: string;
  uploadLabel?: string;
  cancelLabel?: string;
  customUpload?: boolean;
  onUpload?: (event: any) => void;
  onSelect?: (event: any) => void;
  onError?: (event: any) => void;
  onClear?: () => void;
  onRemove?: (event: any) => void;
  onProgress?: (event: any) => void;
}

/**
 * União de todos os tipos de configuração de campo
 */
export type FormFieldConfig = 
  | TextFieldConfig
  | NumberFieldConfig
  | SelectFieldConfig
  | DateFieldConfig
  | FileFieldConfig
  | BaseFieldConfig;

/**
 * Configuração de seção de formulário
 */
export interface FormSectionConfig {
  title: string;
  description?: string;
  icon?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  fields: FormFieldConfig[];
  columns?: number;
  className?: string;
  style?: CSSProperties;
  conditional?: {
    field: string;
    value: any;
    operator?: 'equals' | 'not-equals' | 'contains' | 'not-contains' | 'greater' | 'less';
  };
}

/**
 * Configuração completa de formulário
 */
export interface FormConfig<T extends FieldValues = FieldValues> {
  schema: z.ZodSchema<T>;
  sections: FormSectionConfig[];
  defaultValues?: Partial<T>;
  mode?: 'onChange' | 'onBlur' | 'onSubmit' | 'onTouched' | 'all';
  reValidateMode?: 'onChange' | 'onBlur' | 'onSubmit';
  shouldFocusError?: boolean;
  shouldUnregister?: boolean;
  shouldUseNativeValidation?: boolean;
  criteriaMode?: 'firstError' | 'all';
  delayError?: number;
  resolver?: any;
}

// ============================================================================
// TIPOS DE TABELA
// ============================================================================

/**
 * Configuração de coluna de tabela
 */
export interface TableColumn<T = any> {
  field: keyof T | string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  exportable?: boolean;
  hidden?: boolean;
  frozen?: boolean;
  width?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  align?: 'left' | 'center' | 'right';
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  style?: CSSProperties;
  headerStyle?: CSSProperties;
  bodyStyle?: CSSProperties;
  template?: (rowData: T, options: any) => ReactNode;
  headerTemplate?: (options: any) => ReactNode;
  filterTemplate?: (options: any) => ReactNode;
  editorTemplate?: (options: any) => ReactNode;
  filterField?: string;
  filterType?: 'text' | 'numeric' | 'date' | 'boolean' | 'custom';
  filterMatchMode?: string;
  filterPlaceholder?: string;
  sortField?: string;
  dataType?: 'text' | 'numeric' | 'date' | 'boolean';
  format?: (value: any) => string;
  parse?: (value: string) => any;
}

/**
 * Configuração de filtro de tabela
 */
export interface TableFilter {
  field: string;
  value: any;
  matchMode: string;
  operator?: 'and' | 'or';
}

/**
 * Configuração de ordenação de tabela
 */
export interface TableSort {
  field: string;
  order: 1 | -1 | 0;
}

/**
 * Estado de seleção de tabela
 */
export interface TableSelection<T = any> {
  selected: T[];
  selectAll: boolean;
  partialSelect: boolean;
}

/**
 * Configuração de paginação
 */
export interface PaginationConfig {
  page: number;
  rows: number;
  totalRecords: number;
  rowsPerPageOptions?: number[];
  showCurrentPageReport?: boolean;
  currentPageReportTemplate?: string;
  showJumpToPageDropdown?: boolean;
  showJumpToPageInput?: boolean;
  showPageLinks?: boolean;
  showFirstLastIcon?: boolean;
  alwaysShow?: boolean;
}

/**
 * Ação em lote para tabela
 */
export interface BatchAction<T = any> {
  label: string;
  icon?: string;
  command: (selectedItems: T[]) => void | Promise<void>;
  disabled?: boolean;
  visible?: boolean;
  variant?: ComponentVariant;
  confirmMessage?: string;
  confirmHeader?: string;
  confirmIcon?: string;
  severity?: Severity;
}

/**
 * Ação de linha para tabela
 */
export interface RowAction<T = any> {
  label: string;
  icon?: string;
  command: (rowData: T, index: number) => void | Promise<void>;
  disabled?: (rowData: T) => boolean;
  visible?: (rowData: T) => boolean;
  variant?: ComponentVariant;
  confirmMessage?: string | ((rowData: T) => string);
  confirmHeader?: string;
  confirmIcon?: string;
  severity?: Severity;
}

// ============================================================================
// TIPOS DE LAYOUT
// ============================================================================

/**
 * Configuração de layout de página
 */
export interface LayoutConfig {
  showSidebar?: boolean;
  showTopNav?: boolean;
  showBreadcrumb?: boolean;
  showFooter?: boolean;
  sidebarCollapsed?: boolean;
  sidebarPosition?: 'left' | 'right';
  topNavPosition?: 'top' | 'bottom';
  contentPadding?: boolean;
  fullHeight?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Configuração de cabeçalho de página
 */
export interface PageHeaderConfig {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  avatar?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ButtonAction[];
  tabs?: MenuItem[];
  activeTab?: string;
  showDivider?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Configuração de sidebar
 */
export interface SidebarConfig {
  items: MenuItem[];
  collapsed?: boolean;
  collapsible?: boolean;
  position?: 'left' | 'right';
  width?: string | number;
  collapsedWidth?: string | number;
  overlay?: boolean;
  modal?: boolean;
  dismissible?: boolean;
  showIcons?: boolean;
  showLabels?: boolean;
  className?: string;
  style?: CSSProperties;
}

// ============================================================================
// TIPOS DE NOTIFICAÇÃO
// ============================================================================

/**
 * Configuração de notificação toast
 */
export interface ToastConfig {
  severity: Severity;
  summary: string;
  detail?: string;
  life?: number;
  sticky?: boolean;
  closable?: boolean;
  icon?: string;
  className?: string;
  style?: CSSProperties;
  contentClassName?: string;
  contentStyle?: CSSProperties;
}

/**
 * Opções para toast
 */
export interface ToastOptions {
  life?: number;
  sticky?: boolean;
  closable?: boolean;
  icon?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Ação de toast
 */
export interface ToastAction {
  label: string;
  command: () => void;
  icon?: string;
  className?: string;
  style?: CSSProperties;
}

// ============================================================================
// TIPOS DE DIALOG
// ============================================================================

/**
 * Configuração de dialog
 */
export interface DialogConfig {
  header?: string;
  footer?: ReactNode;
  visible: boolean;
  modal?: boolean;
  resizable?: boolean;
  draggable?: boolean;
  closable?: boolean;
  dismissableMask?: boolean;
  closeOnEscape?: boolean;
  showHeader?: boolean;
  appendTo?: HTMLElement | 'self';
  baseZIndex?: number;
  autoZIndex?: boolean;
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  maximizable?: boolean;
  maximized?: boolean;
  breakpoints?: Record<string, string>;
  transitionOptions?: any;
  className?: string;
  style?: CSSProperties;
  contentClassName?: string;
  contentStyle?: CSSProperties;
  headerClassName?: string;
  headerStyle?: CSSProperties;
  maskClassName?: string;
  maskStyle?: CSSProperties;
  onShow?: () => void;
  onHide: () => void;
  onMaximize?: (event: any) => void;
  onDragStart?: (event: any) => void;
  onDrag?: (event: any) => void;
  onDragEnd?: (event: any) => void;
  onResizeStart?: (event: any) => void;
  onResize?: (event: any) => void;
  onResizeEnd?: (event: any) => void;
}

/**
 * Configuração de dialog de confirmação
 */
export interface ConfirmDialogConfig {
  message: string;
  header?: string;
  icon?: string;
  acceptLabel?: string;
  rejectLabel?: string;
  acceptClassName?: string;
  rejectClassName?: string;
  acceptIcon?: string;
  rejectIcon?: string;
  accept?: () => void;
  reject?: () => void;
  onShow?: () => void;
  onHide?: () => void;
  className?: string;
  style?: CSSProperties;
  contentClassName?: string;
  contentStyle?: CSSProperties;
  appendTo?: HTMLElement | 'self';
  dismissableMask?: boolean;
  closeOnEscape?: boolean;
  blockScroll?: boolean;
  baseZIndex?: number;
  autoZIndex?: boolean;
  position?: Position;
  breakpoints?: Record<string, string>;
  transitionOptions?: any;
}

// ============================================================================
// TIPOS DE TEMA
// ============================================================================

/**
 * Configuração de cores do tema
 */
export interface ThemeColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  light: string;
  dark: string;
  muted: string;
  white: string;
  black: string;
  transparent: string;
  background: string;
  surface: string;
  border: string;
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
  };
}

/**
 * Configuração de espaçamentos do tema
 */
export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
}

/**
 * Configuração de bordas do tema
 */
export interface ThemeBorders {
  radius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  width: {
    none: string;
    thin: string;
    medium: string;
    thick: string;
  };
}

/**
 * Configuração de sombras do tema
 */
export interface ThemeShadows {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  inner: string;
}

/**
 * Configuração completa do tema
 */
export interface ThemeConfig {
  colors: ThemeColors;
  spacing: ThemeSpacing;
  borders: ThemeBorders;
  shadows: ThemeShadows;
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      xxl: string;
    };
    fontWeight: {
      light: number;
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
    };
  };
  breakpoints: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  zIndex: {
    dropdown: number;
    sticky: number;
    fixed: number;
    modal: number;
    popover: number;
    tooltip: number;
    toast: number;
  };
  transitions: {
    duration: {
      fast: string;
      normal: string;
      slow: string;
    };
    easing: {
      linear: string;
      ease: string;
      easeIn: string;
      easeOut: string;
      easeInOut: string;
    };
  };
}

// ============================================================================
// TIPOS DE CONTEXTO
// ============================================================================

/**
 * Contexto de formulário
 */
export interface FormContextValue<T extends FieldValues = FieldValues> {
  control: Control<T>;
  formState: any;
  watch: any;
  setValue: any;
  getValues: any;
  reset: any;
  trigger: any;
  clearErrors: any;
  setError: any;
  handleSubmit: any;
  register: any;
  unregister: any;
  config: FormConfig<T>;
  loading: boolean;
  submitting: boolean;
  isDirty: boolean;
  isValid: boolean;
  errors: any;
}

/**
 * Contexto de layout
 */
export interface LayoutContextValue {
  config: LayoutConfig;
  updateConfig: (config: Partial<LayoutConfig>) => void;
  toggleSidebar: () => void;
  collapseSidebar: () => void;
  expandSidebar: () => void;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

/**
 * Contexto de toast
 */
export interface ToastContextValue {
  show: (config: ToastConfig) => void;
  showSuccess: (message: string, options?: ToastOptions) => void;
  showError: (message: string, options?: ToastOptions) => void;
  showInfo: (message: string, options?: ToastOptions) => void;
  showWarn: (message: string, options?: ToastOptions) => void;
  clear: () => void;
  remove: (message: any) => void;
}

/**
 * Contexto de tema
 */
export interface ThemeContextValue {
  theme: ThemeConfig;
  setTheme: (theme: Partial<ThemeConfig>) => void;
  isDark: boolean;
  toggleDarkMode: () => void;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
}

// ============================================================================
// TIPOS DE HOOK
// ============================================================================

/**
 * Resultado do hook useAsync
 */
export interface AsyncState<T = any> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: (...args: any[]) => Promise<T>;
  reset: () => void;
}

/**
 * Resultado do hook useLocalStorage
 */
export interface LocalStorageState<T> {
  value: T;
  setValue: (value: T | ((prev: T) => T)) => void;
  removeValue: () => void;
}

/**
 * Resultado do hook useDebounce
 */
export interface DebounceState<T> {
  debouncedValue: T;
  isDebouncing: boolean;
}

/**
 * Resultado do hook useMediaQuery
 */
export interface MediaQueryState {
  matches: boolean;
  media: string;
}

// ============================================================================
// TIPOS DE UTILIDADE
// ============================================================================

/**
 * Função de formatação
 */
export type Formatter<T = any> = (value: T) => string;

/**
 * Função de validação
 */
export type Validator<T = any> = (value: T) => boolean | string;

/**
 * Função de transformação
 */
export type Transformer<T = any, U = any> = (value: T) => U;

/**
 * Função de comparação
 */
export type Comparator<T = any> = (a: T, b: T) => number;

/**
 * Função de filtro
 */
export type Filter<T = any> = (value: T, index: number, array: T[]) => boolean;

/**
 * Função de mapeamento
 */
export type Mapper<T = any, U = any> = (value: T, index: number, array: T[]) => U;

/**
 * Função de redução
 */
export type Reducer<T = any, U = any> = (accumulator: U, currentValue: T, index: number, array: T[]) => U;

/**
 * Função de callback genérica
 */
export type Callback<T = void> = (...args: any[]) => T;

/**
 * Função de callback assíncrona
 */
export type AsyncCallback<T = void> = (...args: any[]) => Promise<T>;

/**
 * Função de evento
 */
export type EventHandler<T = Event> = (event: T) => void;

/**
 * Função de evento assíncrona
 */
export type AsyncEventHandler<T = Event> = (event: T) => Promise<void>;

// ============================================================================
// TIPOS DE DADOS DE NEGÓCIO
// ============================================================================

/**
 * Dados pessoais
 */
export interface PersonalData {
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  phone?: string;
  mobile?: string;
  cpf?: string;
  rg?: string;
  birthDate?: Date;
  gender?: 'M' | 'F' | 'O';
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
  nationality?: string;
  profession?: string;
}

/**
 * Dados de endereço
 */
export interface AddressData {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
  type?: 'residential' | 'commercial' | 'billing' | 'shipping';
}

/**
 * Dados de empresa
 */
export interface CompanyData {
  name: string;
  tradeName?: string;
  cnpj: string;
  stateRegistration?: string;
  municipalRegistration?: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  size?: 'micro' | 'small' | 'medium' | 'large';
  foundedAt?: Date;
  address?: AddressData;
}

/**
 * Dados financeiros
 */
export interface FinancialData {
  amount: number;
  currency: string;
  paymentMethod: 'cash' | 'credit_card' | 'credit_card_recurring' | 'bank_transfer' | 'pix' | 'boleto';
  installments?: number;
  interestRate?: number;
  dueDate?: Date;
  paidAt?: Date;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
}

/**
 * Dados de contrato
 */
export interface ContractData {
  id?: string;
  number: string;
  title: string;
  description?: string;
  type: 'service' | 'product' | 'subscription' | 'license';
  status: 'draft' | 'active' | 'suspended' | 'cancelled' | 'expired';
  startDate: Date;
  endDate?: Date;
  renewalDate?: Date;
  autoRenewal?: boolean;
  // AIDEV-NOTE: Campo para controlar se o contrato deve gerar cobranças automaticamente
  generate_billing?: boolean;
  client: PersonalData | CompanyData;
  financial: FinancialData;
  terms?: string;
  attachments?: File[];
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
}

// ============================================================================
// EXPORTAÇÕES DE CONVENIÊNCIA
// ============================================================================

/**
 * Props base para todos os componentes
 */
export interface BaseComponentProps {
  id?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  'data-testid'?: string;
}

/**
 * Props para componentes com loading
 */
export interface LoadingProps {
  loading?: boolean;
  loadingIcon?: string;
  loadingTemplate?: ReactNode;
}

/**
 * Props para componentes com tooltip
 */
export interface TooltipProps {
  tooltip?: string;
  tooltipOptions?: any;
}

/**
 * Props para componentes com validação
 */
export interface ValidationProps {
  invalid?: boolean;
  error?: string;
  required?: boolean;
}

/**
 * Props combinadas mais comuns
 */
export interface CommonComponentProps extends 
  BaseComponentProps, 
  LoadingProps, 
  TooltipProps, 
  ValidationProps {
  disabled?: boolean;
  readonly?: boolean;
  size?: ComponentSize;
  variant?: ComponentVariant;
}

/**
 * Tipo utilitário para tornar propriedades opcionais
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Tipo utilitário para tornar propriedades obrigatórias
 */
export type Required<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Tipo utilitário para extrair o tipo de valor de um array
 */
export type ArrayElement<T> = T extends (infer U)[] ? U : never;

/**
 * Tipo utilitário para extrair o tipo de retorno de uma Promise
 */
export type PromiseType<T> = T extends Promise<infer U> ? U : never;

/**
 * Tipo utilitário para criar um tipo recursivo parcial
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Tipo utilitário para criar um tipo recursivo obrigatório
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};
