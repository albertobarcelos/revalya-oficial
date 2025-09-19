/**
 * Configuração de tema personalizado para PrimeReact
 * Centraliza todas as configurações de estilo e tema da aplicação
 */

import { PrimeReactPTOptions } from 'primereact/api';

// Cores do tema baseadas no design system atual
export const themeColors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe', 
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6', // Cor principal
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554'
  },
  surface: {
    0: '#ffffff',
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617'
  },
  success: {
    500: '#10b981',
    600: '#059669'
  },
  warning: {
    500: '#f59e0b',
    600: '#d97706'
  },
  danger: {
    500: '#ef4444',
    600: '#dc2626'
  },
  info: {
    500: '#06b6d4',
    600: '#0891b2'
  }
};

// Configuração de tema para modo claro
export const lightTheme = {
  primitive: {
    borderRadius: {
      none: '0',
      xs: '0.125rem',
      sm: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '0.75rem'
    },
    emerald: themeColors.primary,
    green: themeColors.success,
    lime: themeColors.success,
    red: themeColors.danger,
    orange: themeColors.warning,
    amber: themeColors.warning,
    yellow: themeColors.warning,
    teal: themeColors.info,
    cyan: themeColors.info,
    sky: themeColors.info,
    blue: themeColors.primary,
    indigo: themeColors.primary,
    violet: themeColors.primary,
    purple: themeColors.primary,
    fuchsia: themeColors.primary,
    pink: themeColors.primary,
    rose: themeColors.danger,
    slate: themeColors.surface,
    gray: themeColors.surface,
    zinc: themeColors.surface,
    neutral: themeColors.surface,
    stone: themeColors.surface
  },
  semantic: {
    transitionDuration: '0.2s',
    focusRing: {
      width: '2px',
      style: 'solid',
      color: themeColors.primary[500],
      offset: '2px'
    },
    disabledOpacity: '0.6',
    iconSize: '1rem',
    anchorGutter: '2px',
    primary: themeColors.primary,
    colorScheme: {
      light: {
        primary: themeColors.primary,
        surface: themeColors.surface,
        success: themeColors.success,
        info: themeColors.info,
        warn: themeColors.warning,
        error: themeColors.danger
      }
    }
  }
};

// Configuração de tema para modo escuro harmonizado
export const darkTheme = {
  primitive: {
    borderRadius: {
      none: '0',
      xs: '2px',
      sm: '4px',
      md: '6px',
      lg: '8px',
      xl: '12px'
    },
    emerald: themeColors.success,
    green: themeColors.success,
    lime: themeColors.success,
    red: themeColors.danger,
    orange: themeColors.warning,
    amber: themeColors.warning,
    yellow: themeColors.warning,
    teal: themeColors.info,
    cyan: themeColors.info,
    sky: themeColors.info,
    blue: themeColors.primary,
    indigo: themeColors.primary,
    violet: themeColors.primary,
    purple: themeColors.primary,
    fuchsia: themeColors.primary,
    pink: themeColors.primary,
    rose: themeColors.danger,
    slate: themeColors.surface,
    gray: themeColors.surface,
    zinc: themeColors.surface,
    neutral: themeColors.surface,
    stone: themeColors.surface
  },
  semantic: {
    transitionDuration: '0.2s',
    focusRing: {
      width: '2px',
      style: 'solid',
      color: '#3B82F6',
      offset: '2px',
      shadow: 'none'
    },
    disabledOpacity: '0.6',
    iconSize: '1rem',
    anchorGutter: '2px',
    primary: {
      50: '#0A0E1A',
      100: '#1A202C',
      200: '#2D3748',
      300: '#4A5568',
      400: '#718096',
      500: '#3B82F6',
      600: '#60A5FA',
      700: '#93C5FD',
      800: '#DBEAFE',
      900: '#EFF6FF',
      950: '#F8FAFC'
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617'
        },
        primary: themeColors.primary,
        success: themeColors.success,
        info: themeColors.info,
        warn: themeColors.warning,
        error: themeColors.danger
      },
      dark: {
        surface: {
          0: '#0A0E1A',
          50: '#1A202C',
          100: '#2D3748',
          200: '#4A5568',
          300: '#718096',
          400: '#A0AEC0',
          500: '#CBD5E1',
          600: '#E2E8F0',
          700: '#F1F5F9',
          800: '#F8FAFC',
          900: '#FFFFFF',
          950: '#FFFFFF'
        },
        primary: {
          50: '#0A0E1A',
          100: '#1A202C',
          200: '#2D3748',
          300: '#4A5568',
          400: '#718096',
          500: '#3B82F6',
          600: '#60A5FA',
          700: '#93C5FD',
          800: '#DBEAFE',
          900: '#EFF6FF',
          950: '#F8FAFC'
        },
        success: {
          50: '#0A1F0A',
          100: '#1A3A1A',
          200: '#22543D',
          300: '#2F855A',
          400: '#48BB78',
          500: '#22C55E',
          600: '#4ADE80',
          700: '#86EFAC',
          800: '#BBF7D0',
          900: '#DCFCE7',
          950: '#F0FDF4'
        },
        info: themeColors.info,
        warn: {
          50: '#1A0F0A',
          100: '#3A1F0A',
          200: '#7C2D12',
          300: '#C2410C',
          400: '#EA580C',
          500: '#F97316',
          600: '#FB923C',
          700: '#FDBA74',
          800: '#FED7AA',
          900: '#FFEDD5',
          950: '#FFF7ED'
        },
        error: {
          50: '#1A0A0A',
          100: '#3A1A1A',
          200: '#7F1D1D',
          300: '#B91C1C',
          400: '#DC2626',
          500: '#EF4444',
          600: '#F87171',
          700: '#FCA5A5',
          800: '#FECACA',
          900: '#FEE2E2',
          950: '#FEF2F2'
        }
      }
    }
  }
};

// Configurações PT (PassThrough) para componentes PrimeReact
export const primeReactPTConfig: PrimeReactPTOptions = {
  button: {
    root: {
      className: 'transition-all duration-200 focus:ring-2 focus:ring-offset-2'
    }
  },
  inputtext: {
    root: {
      className: 'transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
    }
  },
  dropdown: {
    root: {
      className: 'transition-all duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
    }
  },
  datatable: {
    root: {
      className: 'border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden'
    },
    header: {
      className: 'bg-surface-50 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700'
    }
  },
  card: {
    root: {
      className: 'bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-sm'
    },
    header: {
      className: 'border-b border-surface-200 dark:border-surface-700'
    }
  },
  dialog: {
    root: {
      className: 'bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg shadow-lg'
    },
    header: {
      className: 'border-b border-surface-200 dark:border-surface-700'
    }
  },
  panel: {
    root: {
      className: 'bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg'
    },
    header: {
      className: 'border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-700'
    }
  },
  tabview: {
    root: {
      className: 'bg-white dark:bg-surface-800'
    },
    nav: {
      className: 'border-b border-surface-200 dark:border-surface-700'
    }
  }
};

// Configuração global do PrimeReact
export const primeReactConfig = {
  ripple: true,
  inputStyle: 'outlined',
  locale: 'pt-BR',
  appendTo: 'self',
  cssTransition: true,
  autoZIndex: true,
  hideOverlaysOnDocumentScrolling: false,
  nonce: undefined,
  nullSortOrder: 1,
  zIndex: {
    modal: 1100,
    overlay: 1000,
    menu: 1000,
    tooltip: 1100,
    toast: 1200
  },
  pt: primeReactPTConfig,
  ptOptions: {
    mergeSections: true,
    mergeProps: false
  }
};

// Utilitários para tema
export const getThemeColor = (color: keyof typeof themeColors, shade: number = 500) => {
  return themeColors[color]?.[shade as keyof typeof themeColors[typeof color]] || themeColors.primary[500];
};

export const isDarkMode = () => {
  return document.documentElement.classList.contains('dark');
};

export const getCurrentTheme = () => {
  return isDarkMode() ? darkTheme : lightTheme;
};

// Estilos CSS customizados para PrimeReact
export const customPrimeReactStyles = `
  /* Variáveis CSS para tema */
  :root {
    --primary-50: ${themeColors.primary[50]};
    --primary-100: ${themeColors.primary[100]};
    --primary-200: ${themeColors.primary[200]};
    --primary-300: ${themeColors.primary[300]};
    --primary-400: ${themeColors.primary[400]};
    --primary-500: ${themeColors.primary[500]};
    --primary-600: ${themeColors.primary[600]};
    --primary-700: ${themeColors.primary[700]};
    --primary-800: ${themeColors.primary[800]};
    --primary-900: ${themeColors.primary[900]};
    --primary-950: ${themeColors.primary[950]};
  }
  
  /* Customizações globais do PrimeReact */
  .p-component {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  .p-button {
    font-weight: 500;
    transition: all 0.2s ease-in-out;
  }
  
  .p-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .p-datatable .p-datatable-thead > tr > th {
    font-weight: 600;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .p-card {
    transition: all 0.2s ease-in-out;
  }
  
  .p-card:hover {
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  }
  
  .p-dialog {
    backdrop-filter: blur(8px);
  }
  
  .p-overlay-mask {
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
  }
  
  /* Animações customizadas */
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .fade-in-up {
    animation: fadeInUp 0.3s ease-out;
  }
  
  /* Responsividade melhorada */
  @media (max-width: 768px) {
    .p-datatable .p-datatable-tbody > tr > td {
      padding: 0.5rem;
      font-size: 0.875rem;
    }
    
    .p-dialog {
      width: 95vw !important;
      margin: 1rem;
    }
  }
`;
