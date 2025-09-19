import type { Preview } from '@storybook/react';
import { themes } from '@storybook/theming';

// Importar estilos do PrimeReact
import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

// Importar configurações da biblioteca
import { defaultTheme, darkTheme } from '../config';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
      expanded: true,
      sort: 'requiredFirst'
    },
    docs: {
      theme: themes.light,
      source: {
        state: 'open'
      },
      canvas: {
        sourceState: 'shown'
      }
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: defaultTheme.colors.background
        },
        {
          name: 'dark',
          value: darkTheme.colors?.background || '#0F172A'
        },
        {
          name: 'surface',
          value: defaultTheme.colors.surface
        }
      ]
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: {
            width: '375px',
            height: '667px'
          }
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px'
          }
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1024px',
            height: '768px'
          }
        },
        wide: {
          name: 'Wide Screen',
          styles: {
            width: '1440px',
            height: '900px'
          }
        }
      }
    },
    layout: 'centered',
    options: {
      storySort: {
        order: [
          'Introdução',
          'Instalação',
          'Configuração',
          'Componentes',
          [
            'Básicos',
            [
              'PrimeButton',
              'PrimeInput',
              'PrimeSelect',
              'PrimeCard'
            ],
            'Avançados',
            [
              'PrimeDataTable',
              'PrimeForm',
              'PrimeLayout'
            ],
            'Feedback',
            [
              'PrimeToast'
            ]
          ],
          'Utilitários',
          [
            'formUtils',
            'layoutUtils',
            'primeUtils'
          ],
          'Exemplos',
          [
            'ContractFormExample',
            'DashboardExample',
            'ContractListExample',
            'SettingsExample'
          ],
          'Temas',
          'Configurações'
        ]
      }
    }
  },
  globalTypes: {
    theme: {
      description: 'Tema global',
      defaultValue: 'light',
      toolbar: {
        title: 'Tema',
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Claro', icon: 'sun' },
          { value: 'dark', title: 'Escuro', icon: 'moon' }
        ],
        dynamicTitle: true
      }
    },
    locale: {
      description: 'Idioma',
      defaultValue: 'pt-BR',
      toolbar: {
        title: 'Idioma',
        icon: 'globe',
        items: [
          { value: 'pt-BR', title: 'Português (Brasil)', icon: 'flag' },
          { value: 'en-US', title: 'English (US)', icon: 'flag' }
        ],
        dynamicTitle: true
      }
    },
    density: {
      description: 'Densidade da interface',
      defaultValue: 'normal',
      toolbar: {
        title: 'Densidade',
        icon: 'component',
        items: [
          { value: 'compact', title: 'Compacta', icon: 'compress' },
          { value: 'normal', title: 'Normal', icon: 'component' },
          { value: 'comfortable', title: 'Confortável', icon: 'expand' }
        ],
        dynamicTitle: true
      }
    }
  },
  decorators: [
    (Story, context) => {
      const { theme, locale, density } = context.globals;
      
      // Aplicar tema
      const themeClass = theme === 'dark' ? 'p-dark' : 'p-light';
      
      // Aplicar densidade
      const densityClass = {
        compact: 'p-density-compact',
        normal: 'p-density-normal',
        comfortable: 'p-density-comfortable'
      }[density] || 'p-density-normal';
      
      return (
        <div 
          className={`${themeClass} ${densityClass}`}
          style={{
            padding: '1rem',
            minHeight: '100vh',
            backgroundColor: theme === 'dark' 
              ? darkTheme.colors?.background || '#0F172A'
              : defaultTheme.colors.background,
            color: theme === 'dark'
              ? darkTheme.colors?.text?.primary || '#F1F5F9'
              : defaultTheme.colors.text.primary
          }}
          lang={locale}
        >
          <Story />
        </div>
      );
    }
  ],
  tags: ['autodocs']
};

export default preview;
