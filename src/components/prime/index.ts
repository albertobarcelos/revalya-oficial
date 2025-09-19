/**
 * Exportações centralizadas dos componentes Prime padronizados
 * Facilita a importação e uso consistente em toda a aplicação
 */

// Componentes de formulário
export {
  PrimeButton,
  IconButton,
  LoadingButton,
  ButtonGroup,
  buttonUtils
} from './PrimeButton';

export {
  TextInput,
  NumberInput,
  Textarea,
  PasswordInput,
  MaskedInput,
  inputUtils
} from './PrimeInput';

export {
  Select,
  MultiSelect,
  AutoComplete,
  TreeSelect,
  selectUtils
} from './PrimeSelect';

export {
  PrimeForm,
  FormField,
  FormSection,
  formUtils
} from './PrimeForm';

// Componentes de exibição de dados
export {
  DataTable,
  dataTableUtils
} from './PrimeDataTable';

// Componentes de layout
export {
  Card,
  MetricCard,
  ExpandableCard,
  cardUtils
} from './PrimeCard';

export {
  PrimeLayout,
  PageHeader,
  Sidebar,
  TopNav,
  MainContent,
  Page,
  layoutUtils
} from './PrimeLayout';

export {
  Dialog,
  SideDialog,
  FormDialog,
  ConfirmDialog,
  useConfirmDialog,
  dialogUtils
} from './PrimeDialog';

// Componentes de navegação
export {
  SidebarMenu,
  ContextMenuWrapper,
  TopNavMenu,
  TabMenuWrapper,
  BreadcrumbWrapper,
  menuUtils
} from './PrimeMenu';

// Componentes de feedback
export {
  ToastProvider,
  useToast,
  useAsyncToast,
  InlineToast,
  toastUtils
} from './PrimeToast';

// Tipos
export type {
  // Button types
  PrimeButtonProps,
  IconButtonProps,
  LoadingButtonProps,
  ButtonGroupProps,
  ButtonAction
} from './PrimeButton';

export type {
  // Input types
  TextInputProps,
  NumberInputProps,
  TextareaProps,
  PasswordInputProps,
  MaskedInputProps
} from './PrimeInput';

export type {
  // Select types
  SelectProps,
  MultiSelectProps,
  AutoCompleteProps,
  TreeSelectProps,
  SelectOption
} from './PrimeSelect';

export type {
  // DataTable types
  DataTableProps,
  DataTableColumn,
  DataTableAction
} from './PrimeDataTable';

export type {
  // Card types
  CardProps,
  MetricCardProps,
  ExpandableCardProps,
  CardAction
} from './PrimeCard';

export type {
  // Dialog types
  DialogProps,
  SideDialogProps,
  FormDialogProps,
  ConfirmDialogProps,
  DialogAction
} from './PrimeDialog';

export type {
  // Menu types
  ExtendedMenuItem,
  SidebarMenuProps,
  ContextMenuWrapperProps,
  TopNavMenuProps,
  TabMenuWrapperProps,
  BreadcrumbWrapperProps
} from './PrimeMenu';

export type {
  // Toast types
  NotificationOptions,
  NotificationAction,
  AsyncToastOptions,
  InlineToastProps
} from './PrimeToast';

export type {
  // Form types
  FormFieldConfig,
  FormSectionConfig,
  FormConfig,
  FormFieldProps,
  FormSectionProps,
  PrimeFormProps
} from './PrimeForm';

export type {
  // Layout types
  LayoutConfig,
  PageHeaderConfig,
  PageHeaderProps,
  SidebarProps,
  TopNavProps,
  MainContentProps,
  PrimeLayoutProps,
  PageProps
} from './PrimeLayout';

// Utilitários combinados
export const primeUtils = {
  button: buttonUtils,
  input: inputUtils,
  select: selectUtils,
  dataTable: dataTableUtils,
  card: cardUtils,
  dialog: dialogUtils,
  menu: menuUtils,
  toast: toastUtils,
  form: formUtils,
  layout: layoutUtils
};

// Configurações padrão para componentes
export const primeDefaults = {
  // Configurações de botão
  button: {
    size: 'normal' as const,
    variant: 'primary' as const,
    loading: false,
    disabled: false
  },
  
  // Configurações de input
  input: {
    size: 'normal' as const,
    variant: 'outlined' as const,
    floatLabel: true,
    showClear: true
  },
  
  // Configurações de select
  select: {
    size: 'normal' as const,
    variant: 'outlined' as const,
    floatLabel: true,
    showClear: true,
    filter: true
  },
  
  // Configurações de DataTable
  dataTable: {
    paginator: true,
    rows: 10,
    rowsPerPageOptions: [5, 10, 25, 50],
    sortMode: 'multiple' as const,
    resizableColumns: true,
    reorderableColumns: true,
    showGridlines: true,
    stripedRows: true
  },
  
  // Configurações de Card
  card: {
    variant: 'default' as const,
    size: 'normal' as const,
    hoverable: false,
    loading: false
  },
  
  // Configurações de Dialog
  dialog: {
    size: 'medium' as const,
    showCloseButton: true,
    closeOnEscape: true,
    closeOnClickOutside: true,
    loading: false
  },
  
  // Configurações de Toast
  toast: {
    position: 'top-right' as const,
    life: 5000,
    closable: true,
    sticky: false
  }
};

// Temas e estilos
export const primeThemes = {
  // Cores do sistema
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a'
    },
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d'
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f'
    },
    danger: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d'
    }
  },
  
  // Espaçamentos
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem'
  },
  
  // Bordas
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    full: '9999px'
  },
  
  // Sombras
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
  }
};

// Validadores comuns
export const primeValidators = {
  required: (value: any) => {
    if (value === null || value === undefined || value === '') {
      return 'Este campo é obrigatório';
    }
    return null;
  },
  
  email: (value: string) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) ? null : 'Email inválido';
  },
  
  minLength: (min: number) => (value: string) => {
    if (!value) return null;
    return value.length >= min ? null : `Mínimo de ${min} caracteres`;
  },
  
  maxLength: (max: number) => (value: string) => {
    if (!value) return null;
    return value.length <= max ? null : `Máximo de ${max} caracteres`;
  },
  
  cpf: (value: string) => {
    if (!value) return null;
    const cpf = value.replace(/\D/g, '');
    if (cpf.length !== 11) return 'CPF deve ter 11 dígitos';
    
    // Validação básica de CPF
    if (/^(\d)\1{10}$/.test(cpf)) return 'CPF inválido';
    
    return null; // Implementar validação completa se necessário
  },
  
  cnpj: (value: string) => {
    if (!value) return null;
    const cnpj = value.replace(/\D/g, '');
    if (cnpj.length !== 14) return 'CNPJ deve ter 14 dígitos';
    
    return null; // Implementar validação completa se necessário
  },
  
  phone: (value: string) => {
    if (!value) return null;
    const phone = value.replace(/\D/g, '');
    if (phone.length < 10 || phone.length > 11) {
      return 'Telefone inválido';
    }
    return null;
  },
  
  currency: (value: any) => {
    if (!value) return null;
    const num = typeof value === 'string' ? parseFloat(value.replace(/[^\d.-]/g, '')) : value;
    return !isNaN(num) && num >= 0 ? null : 'Valor monetário inválido';
  }
};

// Formatadores comuns
export const primeFormatters = {
  currency: (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  },
  
  percentage: (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 2
    }).format(value / 100);
  },
  
  date: (value: Date | string) => {
    const date = typeof value === 'string' ? new Date(value) : value;
    return new Intl.DateTimeFormat('pt-BR').format(date);
  },
  
  datetime: (value: Date | string) => {
    const date = typeof value === 'string' ? new Date(value) : value;
    return new Intl.DateTimeFormat('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  },
  
  cpf: (value: string) => {
    if (!value) return '';
    const cpf = value.replace(/\D/g, '');
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  },
  
  cnpj: (value: string) => {
    if (!value) return '';
    const cnpj = value.replace(/\D/g, '');
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  },
  
  phone: (value: string) => {
    if (!value) return '';
    const phone = value.replace(/\D/g, '');
    if (phone.length === 10) {
      return phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    if (phone.length === 11) {
      return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  },
  
  fileSize: (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};
