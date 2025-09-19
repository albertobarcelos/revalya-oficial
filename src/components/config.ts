// Configurações globais para os componentes PrimeReact padronizados

import { ThemeConfig, LayoutConfig, PaginationConfig, ToastOptions } from './types';

// ============================================================================
// CONFIGURAÇÕES DE TEMA
// ============================================================================

/**
 * Tema padrão da aplicação
 */
export const defaultTheme: ThemeConfig = {
  colors: {
    primary: '#3B82F6',
    secondary: '#6B7280',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#06B6D4',
    light: '#F8FAFC',
    dark: '#1E293B',
    muted: '#64748B',
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    border: '#E2E8F0',
    text: {
      primary: '#1E293B',
      secondary: '#475569',
      muted: '#64748B',
      inverse: '#FFFFFF'
    }
  },
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    xxl: '3rem'      // 48px
  },
  borders: {
    radius: {
      none: '0',
      sm: '0.25rem',   // 4px
      md: '0.5rem',    // 8px
      lg: '0.75rem',   // 12px
      xl: '1rem',      // 16px
      full: '9999px'
    },
    width: {
      none: '0',
      thin: '1px',
      medium: '2px',
      thick: '4px'
    }
  },
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: {
      xs: '0.75rem',   // 12px
      sm: '0.875rem',  // 14px
      md: '1rem',      // 16px
      lg: '1.125rem',  // 18px
      xl: '1.25rem',   // 20px
      xxl: '1.5rem'    // 24px
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75
    }
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    xxl: '1536px'
  },
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060,
    toast: 1070
  },
  transitions: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms'
    },
    easing: {
      linear: 'linear',
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out'
    }
  }
};

/**
 * Tema escuro
 */
export const darkTheme: Partial<ThemeConfig> = {
  colors: {
    ...defaultTheme.colors,
    background: '#0F172A',
    surface: '#1E293B',
    border: '#334155',
    text: {
      primary: '#F1F5F9',
      secondary: '#CBD5E1',
      muted: '#94A3B8',
      inverse: '#1E293B'
    }
  }
};

// ============================================================================
// CONFIGURAÇÕES DE LAYOUT
// ============================================================================

/**
 * Layout padrão da aplicação
 */
export const defaultLayout: LayoutConfig = {
  showSidebar: true,
  showTopNav: true,
  showBreadcrumb: true,
  showFooter: false,
  sidebarCollapsed: false,
  sidebarPosition: 'left',
  topNavPosition: 'top',
  contentPadding: true,
  fullHeight: true
};

/**
 * Layout para formulários
 */
export const formLayout: LayoutConfig = {
  ...defaultLayout,
  showSidebar: false,
  contentPadding: true
};

/**
 * Layout para dashboard
 */
export const dashboardLayout: LayoutConfig = {
  ...defaultLayout,
  showSidebar: true,
  sidebarCollapsed: false
};

/**
 * Layout minimalista
 */
export const minimalLayout: LayoutConfig = {
  showSidebar: false,
  showTopNav: false,
  showBreadcrumb: false,
  showFooter: false,
  sidebarCollapsed: false,
  sidebarPosition: 'left',
  topNavPosition: 'top',
  contentPadding: true,
  fullHeight: true
};

// ============================================================================
// CONFIGURAÇÕES DE PAGINAÇÃO
// ============================================================================

/**
 * Configuração padrão de paginação
 */
export const defaultPagination: PaginationConfig = {
  page: 0,
  rows: 10,
  totalRecords: 0,
  rowsPerPageOptions: [5, 10, 25, 50, 100],
  showCurrentPageReport: true,
  currentPageReportTemplate: 'Mostrando {first} a {last} de {totalRecords} registros',
  showJumpToPageDropdown: false,
  showJumpToPageInput: false,
  showPageLinks: true,
  showFirstLastIcon: true,
  alwaysShow: false
};

/**
 * Opções de linhas por página
 */
export const rowsPerPageOptions = [5, 10, 25, 50, 100, 250, 500];

// ============================================================================
// CONFIGURAÇÕES DE TOAST
// ============================================================================

/**
 * Configurações padrão para toast
 */
export const defaultToastOptions: ToastOptions = {
  life: 5000,
  sticky: false,
  closable: true
};

/**
 * Configurações específicas por tipo de toast
 */
export const toastConfigs = {
  success: {
    ...defaultToastOptions,
    life: 3000,
    icon: 'pi pi-check-circle'
  },
  error: {
    ...defaultToastOptions,
    life: 8000,
    sticky: true,
    icon: 'pi pi-times-circle'
  },
  warn: {
    ...defaultToastOptions,
    life: 6000,
    icon: 'pi pi-exclamation-triangle'
  },
  info: {
    ...defaultToastOptions,
    life: 4000,
    icon: 'pi pi-info-circle'
  }
};

// ============================================================================
// CONFIGURAÇÕES DE FORMULÁRIO
// ============================================================================

/**
 * Configurações padrão para formulários
 */
export const defaultFormConfig = {
  mode: 'onChange' as const,
  reValidateMode: 'onChange' as const,
  shouldFocusError: true,
  shouldUnregister: false,
  shouldUseNativeValidation: false,
  criteriaMode: 'firstError' as const,
  delayError: 300
};

/**
 * Mensagens de validação padrão
 */
export const validationMessages = {
  required: 'Este campo é obrigatório',
  email: 'Email inválido',
  minLength: (min: number) => `Mínimo de ${min} caracteres`,
  maxLength: (max: number) => `Máximo de ${max} caracteres`,
  min: (min: number) => `Valor mínimo: ${min}`,
  max: (max: number) => `Valor máximo: ${max}`,
  pattern: 'Formato inválido',
  cpf: 'CPF inválido',
  cnpj: 'CNPJ inválido',
  phone: 'Telefone inválido',
  cep: 'CEP inválido',
  url: 'URL inválida',
  date: 'Data inválida',
  time: 'Hora inválida',
  number: 'Número inválido',
  integer: 'Deve ser um número inteiro',
  positive: 'Deve ser um número positivo',
  negative: 'Deve ser um número negativo',
  currency: 'Valor monetário inválido',
  percentage: 'Porcentagem inválida'
};

// ============================================================================
// CONFIGURAÇÕES DE TABELA
// ============================================================================

/**
 * Configurações padrão para tabelas
 */
export const defaultTableConfig = {
  paginator: true,
  rows: 10,
  rowsPerPageOptions: [5, 10, 25, 50],
  sortMode: 'single' as const,
  filterMode: 'lenient' as const,
  selectionMode: 'multiple' as const,
  dataKey: 'id',
  lazy: false,
  loading: false,
  emptyMessage: 'Nenhum registro encontrado',
  currentPageReportTemplate: 'Mostrando {first} a {last} de {totalRecords} registros',
  paginatorTemplate: 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown',
  responsiveLayout: 'scroll' as const,
  breakpoint: '960px',
  stripedRows: false,
  showGridlines: true,
  size: 'normal' as const,
  tableStyle: { minWidth: '50rem' },
  scrollable: true,
  scrollHeight: '400px'
};

/**
 * Configurações de exportação
 */
export const exportConfig = {
  csv: {
    separator: ',',
    encoding: 'utf-8',
    filename: 'export.csv'
  },
  excel: {
    filename: 'export.xlsx',
    sheetName: 'Dados'
  },
  pdf: {
    filename: 'export.pdf',
    title: 'Relatório',
    orientation: 'landscape' as const,
    pageSize: 'A4' as const
  }
};

// ============================================================================
// CONFIGURAÇÕES DE MENU
// ============================================================================

/**
 * Configurações padrão para menus
 */
export const defaultMenuConfig = {
  model: [],
  popup: false,
  appendTo: 'body' as const,
  autoZIndex: true,
  baseZIndex: 0,
  showTransitionOptions: '.12s cubic-bezier(0, 0, 0.2, 1)',
  hideTransitionOptions: '.1s linear'
};

/**
 * Configurações para sidebar
 */
export const sidebarConfig = {
  position: 'left' as const,
  fullScreen: false,
  blockScroll: false,
  baseZIndex: 0,
  autoZIndex: true,
  dismissible: true,
  showCloseIcon: true,
  closeOnEscape: true,
  modal: true,
  ariaCloseLabel: 'Fechar'
};

// ============================================================================
// CONFIGURAÇÕES DE DIALOG
// ============================================================================

/**
 * Configurações padrão para dialogs
 */
export const defaultDialogConfig = {
  modal: true,
  resizable: true,
  draggable: true,
  closable: true,
  dismissableMask: false,
  closeOnEscape: true,
  showHeader: true,
  appendTo: 'body' as const,
  baseZIndex: 0,
  autoZIndex: true,
  position: 'center' as const,
  maximizable: false,
  maximized: false,
  breakpoints: {
    '960px': '75vw',
    '640px': '90vw'
  },
  transitionOptions: '.3s cubic-bezier(0, 0, 0.2, 1)'
};

/**
 * Configurações para dialog de confirmação
 */
export const confirmDialogConfig = {
  acceptLabel: 'Sim',
  rejectLabel: 'Não',
  acceptIcon: 'pi pi-check',
  rejectIcon: 'pi pi-times',
  acceptClassName: 'p-button-success',
  rejectClassName: 'p-button-secondary',
  dismissableMask: false,
  closeOnEscape: true,
  blockScroll: true,
  baseZIndex: 0,
  autoZIndex: true,
  position: 'center' as const,
  breakpoints: {
    '960px': '75vw',
    '640px': '90vw'
  },
  transitionOptions: '.3s cubic-bezier(0, 0, 0.2, 1)'
};

// ============================================================================
// CONFIGURAÇÕES DE ARQUIVO
// ============================================================================

/**
 * Configurações para upload de arquivos
 */
export const fileUploadConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 10,
  accept: '*',
  auto: false,
  chooseLabel: 'Escolher',
  uploadLabel: 'Enviar',
  cancelLabel: 'Cancelar',
  invalidFileSizeMessageSummary: 'Arquivo inválido',
  invalidFileSizeMessageDetail: 'Tamanho máximo permitido: {0}',
  invalidFileTypeMessageSummary: 'Tipo de arquivo inválido',
  invalidFileTypeMessageDetail: 'Tipos permitidos: {0}',
  invalidFileLimitMessageDetail: 'Máximo de arquivos permitidos: {0}',
  invalidFileLimitMessageSummary: 'Limite de arquivos excedido'
};

/**
 * Tipos de arquivo aceitos
 */
export const acceptedFileTypes = {
  images: 'image/*',
  documents: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf',
  videos: 'video/*',
  audio: 'audio/*',
  archives: '.zip,.rar,.7z,.tar,.gz',
  all: '*'
};

// ============================================================================
// CONFIGURAÇÕES DE FORMATAÇÃO
// ============================================================================

/**
 * Configurações de formatação de moeda
 */
export const currencyConfig = {
  locale: 'pt-BR',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
};

/**
 * Configurações de formatação de data
 */
export const dateConfig = {
  locale: 'pt-BR',
  dateFormat: 'dd/MM/yyyy',
  timeFormat: 'HH:mm',
  dateTimeFormat: 'dd/MM/yyyy HH:mm',
  monthYearFormat: 'MM/yyyy',
  yearFormat: 'yyyy',
  firstDayOfWeek: 0, // Domingo
  dayNames: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  dayNamesMin: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
  monthNames: [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ],
  monthNamesShort: [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ],
  today: 'Hoje',
  clear: 'Limpar',
  weekHeader: 'Sem'
};

/**
 * Configurações de formatação de número
 */
export const numberConfig = {
  locale: 'pt-BR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
  useGrouping: true
};

// ============================================================================
// CONFIGURAÇÕES DE VALIDAÇÃO
// ============================================================================

/**
 * Expressões regulares para validação
 */
export const validationPatterns = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/,
  cpf: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
  cnpj: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
  cep: /^\d{5}-?\d{3}$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  onlyNumbers: /^\d+$/,
  onlyLetters: /^[a-zA-ZÀ-ÿ\s]+$/,
  alphanumeric: /^[a-zA-Z0-9À-ÿ\s]+$/,
  noSpecialChars: /^[a-zA-Z0-9À-ÿ\s.-]+$/
};

/**
 * Máscaras de formatação
 */
export const inputMasks = {
  cpf: '999.999.999-99',
  cnpj: '99.999.999/9999-99',
  phone: '(99) 9999-9999',
  mobile: '(99) 99999-9999',
  cep: '99999-999',
  date: '99/99/9999',
  time: '99:99',
  datetime: '99/99/9999 99:99',
  currency: '#.##0,00',
  percentage: '##0,00%',
  creditCard: '9999 9999 9999 9999',
  bankAccount: '99999-9',
  agency: '9999'
};

// ============================================================================
// CONFIGURAÇÕES DE AMBIENTE
// ============================================================================

/**
 * Configurações baseadas no ambiente
 */
export const environmentConfig = {
  development: {
    debug: true,
    logLevel: 'debug',
    showDevTools: true,
    enableHotReload: true,
    apiTimeout: 30000,
    retryAttempts: 3
  },
  staging: {
    debug: true,
    logLevel: 'info',
    showDevTools: false,
    enableHotReload: false,
    apiTimeout: 20000,
    retryAttempts: 2
  },
  production: {
    debug: false,
    logLevel: 'error',
    showDevTools: false,
    enableHotReload: false,
    apiTimeout: 15000,
    retryAttempts: 1
  }
};

/**
 * Configuração atual baseada no ambiente
 */
export const currentEnvironment = process.env.NODE_ENV || 'development';
export const config = environmentConfig[currentEnvironment as keyof typeof environmentConfig] || environmentConfig.development;

// ============================================================================
// CONFIGURAÇÕES DE PERFORMANCE
// ============================================================================

/**
 * Configurações de performance
 */
export const performanceConfig = {
  debounceDelay: 300,
  throttleDelay: 100,
  virtualScrollThreshold: 100,
  lazyLoadThreshold: 50,
  cacheTimeout: 5 * 60 * 1000, // 5 minutos
  maxCacheSize: 100,
  imageOptimization: {
    quality: 80,
    format: 'webp',
    sizes: [320, 640, 768, 1024, 1280, 1920]
  },
  bundleAnalysis: {
    enabled: config.debug,
    threshold: 250 * 1024, // 250KB
    gzipThreshold: 100 * 1024 // 100KB
  }
};

// ============================================================================
// CONFIGURAÇÕES DE ACESSIBILIDADE
// ============================================================================

/**
 * Configurações de acessibilidade
 */
export const accessibilityConfig = {
  focusVisible: true,
  highContrast: false,
  reducedMotion: false,
  screenReader: true,
  keyboardNavigation: true,
  ariaLabels: {
    close: 'Fechar',
    open: 'Abrir',
    next: 'Próximo',
    previous: 'Anterior',
    first: 'Primeiro',
    last: 'Último',
    loading: 'Carregando',
    search: 'Pesquisar',
    filter: 'Filtrar',
    sort: 'Ordenar',
    select: 'Selecionar',
    deselect: 'Desmarcar',
    expand: 'Expandir',
    collapse: 'Recolher',
    menu: 'Menu',
    submenu: 'Submenu',
    required: 'Obrigatório',
    optional: 'Opcional',
    invalid: 'Inválido',
    valid: 'Válido'
  }
};

// ============================================================================
// CONFIGURAÇÕES DE SEGURANÇA
// ============================================================================

/**
 * Configurações de segurança
 */
export const securityConfig = {
  sanitizeInput: true,
  validateOutput: true,
  csrfProtection: true,
  xssProtection: true,
  sqlInjectionProtection: true,
  rateLimiting: {
    enabled: true,
    maxRequests: 100,
    windowMs: 15 * 60 * 1000 // 15 minutos
  },
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90 * 24 * 60 * 60 * 1000, // 90 dias
    preventReuse: 5
  },
  sessionConfig: {
    timeout: 30 * 60 * 1000, // 30 minutos
    renewThreshold: 5 * 60 * 1000, // 5 minutos
    maxConcurrentSessions: 3
  }
};

// ============================================================================
// EXPORTAÇÕES
// ============================================================================

/**
 * Configuração completa da aplicação
 */
export const appConfig = {
  theme: defaultTheme,
  layout: defaultLayout,
  pagination: defaultPagination,
  toast: defaultToastOptions,
  form: defaultFormConfig,
  table: defaultTableConfig,
  menu: defaultMenuConfig,
  dialog: defaultDialogConfig,
  fileUpload: fileUploadConfig,
  currency: currencyConfig,
  date: dateConfig,
  number: numberConfig,
  validation: validationPatterns,
  masks: inputMasks,
  environment: config,
  performance: performanceConfig,
  accessibility: accessibilityConfig,
  security: securityConfig
};

/**
 * Função para obter configuração por chave
 */
export function getConfig<T extends keyof typeof appConfig>(key: T): typeof appConfig[T] {
  return appConfig[key];
}

/**
 * Função para atualizar configuração
 */
export function updateConfig<T extends keyof typeof appConfig>(
  key: T, 
  value: Partial<typeof appConfig[T]>
): void {
  appConfig[key] = { ...appConfig[key], ...value } as typeof appConfig[T];
}

/**
 * Função para resetar configuração para o padrão
 */
export function resetConfig(): void {
  Object.assign(appConfig, {
    theme: defaultTheme,
    layout: defaultLayout,
    pagination: defaultPagination,
    toast: defaultToastOptions,
    form: defaultFormConfig,
    table: defaultTableConfig,
    menu: defaultMenuConfig,
    dialog: defaultDialogConfig,
    fileUpload: fileUploadConfig,
    currency: currencyConfig,
    date: dateConfig,
    number: numberConfig,
    validation: validationPatterns,
    masks: inputMasks,
    environment: config,
    performance: performanceConfig,
    accessibility: accessibilityConfig,
    security: securityConfig
  });
}
