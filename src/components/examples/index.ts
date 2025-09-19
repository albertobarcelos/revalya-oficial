// Exportações dos componentes de exemplo
export { ContractFormExample } from './ContractFormExample';
export { DashboardExample } from './DashboardExample';
export { ContractListExample } from './ContractListExample';
export { SettingsExample } from './SettingsExample';

// Exportação padrão com todos os exemplos
export const Examples = {
  ContractFormExample: () => import('./ContractFormExample').then(m => m.ContractFormExample),
  DashboardExample: () => import('./DashboardExample').then(m => m.DashboardExample),
  ContractListExample: () => import('./ContractListExample').then(m => m.ContractListExample),
  SettingsExample: () => import('./SettingsExample').then(m => m.SettingsExample)
};

// Metadados dos exemplos para documentação
export const ExampleMetadata = {
  ContractFormExample: {
    title: 'Formulário de Contrato',
    description: 'Exemplo completo de formulário para cadastro de contratos com validação avançada',
    features: [
      'Formulário dinâmico baseado no tipo de cliente',
      'Validação com Zod',
      'Campos condicionais',
      'Auto-save',
      'Feedback visual',
      'Integração com PrimeReact'
    ],
    components: ['PrimeForm', 'Page', 'PrimeButton', 'PrimeCard', 'useToast'],
    category: 'Forms'
  },
  DashboardExample: {
    title: 'Dashboard Executivo',
    description: 'Dashboard completo com métricas, gráficos e tabelas de dados',
    features: [
      'Cards de métricas com tendências',
      'Tabelas de dados interativas',
      'Ações rápidas',
      'Filtros de período',
      'Notificações em tempo real',
      'Layout responsivo'
    ],
    components: ['Page', 'MetricCard', 'PrimeDataTable', 'PrimeCard', 'PrimeButton'],
    category: 'Dashboard'
  },
  ContractListExample: {
    title: 'Lista de Contratos',
    description: 'Página de listagem com filtros avançados, busca e ações em lote',
    features: [
      'Filtros avançados',
      'Busca em tempo real',
      'Seleção múltipla',
      'Ações em lote',
      'Exportação de dados',
      'Paginação',
      'Ordenação',
      'Dialogs de confirmação'
    ],
    components: ['Page', 'PrimeDataTable', 'PrimeCard', 'MultiSelect', 'useConfirmDialog'],
    category: 'Data Management'
  },
  SettingsExample: {
    title: 'Configurações do Sistema',
    description: 'Página de configurações com navegação por abas e formulários especializados',
    features: [
      'Navegação por abas',
      'Formulários especializados',
      'Validação por seção',
      'Campos condicionais',
      'Configurações de segurança',
      'Integrações de terceiros'
    ],
    components: ['Page', 'PrimeForm', 'TabMenuWrapper', 'PrimeCard'],
    category: 'Settings'
  }
};

// Utilitários para trabalhar com os exemplos
export const ExampleUtils = {
  /**
   * Obtém todos os exemplos por categoria
   */
  getByCategory: (category: string) => {
    return Object.entries(ExampleMetadata)
      .filter(([, metadata]) => metadata.category === category)
      .map(([key, metadata]) => ({ key, ...metadata }));
  },

  /**
   * Obtém exemplos que usam um componente específico
   */
  getByComponent: (component: string) => {
    return Object.entries(ExampleMetadata)
      .filter(([, metadata]) => metadata.components.includes(component))
      .map(([key, metadata]) => ({ key, ...metadata }));
  },

  /**
   * Obtém exemplos que possuem uma feature específica
   */
  getByFeature: (feature: string) => {
    return Object.entries(ExampleMetadata)
      .filter(([, metadata]) => 
        metadata.features.some(f => f.toLowerCase().includes(feature.toLowerCase()))
      )
      .map(([key, metadata]) => ({ key, ...metadata }));
  },

  /**
   * Obtém todas as categorias disponíveis
   */
  getCategories: () => {
    const categories = Object.values(ExampleMetadata).map(metadata => metadata.category);
    return [...new Set(categories)];
  },

  /**
   * Obtém todos os componentes usados nos exemplos
   */
  getComponents: () => {
    const components = Object.values(ExampleMetadata)
      .flatMap(metadata => metadata.components);
    return [...new Set(components)];
  },

  /**
   * Obtém todas as features disponíveis
   */
  getFeatures: () => {
    const features = Object.values(ExampleMetadata)
      .flatMap(metadata => metadata.features);
    return [...new Set(features)];
  }
};

// Tipos para TypeScript
export type ExampleKey = keyof typeof ExampleMetadata;
export type ExampleCategory = 'Forms' | 'Dashboard' | 'Data Management' | 'Settings';
export type ExampleComponent = 
  | 'PrimeForm'
  | 'Page'
  | 'PrimeButton'
  | 'PrimeCard'
  | 'useToast'
  | 'MetricCard'
  | 'PrimeDataTable'
  | 'MultiSelect'
  | 'useConfirmDialog'
  | 'TabMenuWrapper';

export interface ExampleInfo {
  key: string;
  title: string;
  description: string;
  features: string[];
  components: ExampleComponent[];
  category: ExampleCategory;
}

// Configurações para demonstração
export const DemoConfig = {
  // URLs de exemplo para navegação
  routes: {
    dashboard: '/examples/dashboard',
    contractForm: '/examples/contract-form',
    contractList: '/examples/contract-list',
    settings: '/examples/settings'
  },

  // Dados mockados compartilhados
  mockData: {
    user: {
      name: 'João Silva',
      email: 'joao.silva@revalya.com',
      avatar: 'https://via.placeholder.com/40x40',
      role: 'Administrador'
    },
    company: {
      name: 'Revalya Sistemas',
      logo: 'https://via.placeholder.com/120x40'
    }
  },

  // Configurações de tema para demonstração
  theme: {
    primaryColor: '#3B82F6',
    secondaryColor: '#6B7280',
    successColor: '#10B981',
    warningColor: '#F59E0B',
    errorColor: '#EF4444',
    infoColor: '#06B6D4'
  }
};

// Documentação dos exemplos
export const ExampleDocs = {
  /**
   * Gera documentação markdown para um exemplo específico
   */
  generateMarkdown: (exampleKey: ExampleKey): string => {
    const metadata = ExampleMetadata[exampleKey];
    return `
# ${metadata.title}

${metadata.description}

## Features

${metadata.features.map(feature => `- ${feature}`).join('\n')}

## Componentes Utilizados

${metadata.components.map(component => `- \`${component}\``).join('\n')}

## Categoria

${metadata.category}

## Como Usar

\`\`\`tsx
import { ${exampleKey} } from '@/components/examples';

function App() {
  return <${exampleKey} />;
}
\`\`\`
    `.trim();
  },

  /**
   * Gera documentação completa de todos os exemplos
   */
  generateFullDocs: (): string => {
    const categories = ExampleUtils.getCategories();
    
    let docs = '# Exemplos de Componentes\n\n';
    docs += 'Esta biblioteca contém exemplos práticos de como usar os componentes PrimeReact padronizados.\n\n';
    
    categories.forEach(category => {
      docs += `## ${category}\n\n`;
      const examples = ExampleUtils.getByCategory(category);
      
      examples.forEach(example => {
        docs += `### ${example.title}\n\n`;
        docs += `${example.description}\n\n`;
        docs += `**Features:** ${example.features.join(', ')}\n\n`;
        docs += `**Componentes:** ${example.components.map(c => `\`${c}\``).join(', ')}\n\n`;
      });
    });
    
    return docs;
  }
};
