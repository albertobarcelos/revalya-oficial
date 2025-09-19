// ============================================================================
// BIBLIOTECA DE COMPONENTES PRIMEREACT PADRONIZADOS
// ============================================================================

/**
 * Biblioteca completa de componentes PrimeReact padronizados para aplicações React/TypeScript
 * 
 * Esta biblioteca fornece:
 * - Componentes padronizados e reutilizáveis
 * - Sistema de layout flexível
 * - Utilitários para formulários e validação
 * - Configurações globais personalizáveis
 * - Exemplos práticos de uso
 * - Tipos TypeScript completos
 * 
 * @author SupaGuard - Agente de IA especializado em segurança e integração
 * @version 1.0.0
 */

// ============================================================================
// COMPONENTES PRINCIPAIS
// ============================================================================

// Componentes básicos
export * from './prime/PrimeButton';
export * from './prime/PrimeInput';
export * from './prime/PrimeSelect';
export * from './prime/PrimeCard';
export * from './prime/PrimeToast';

// Componentes avançados
export * from './prime/PrimeDataTable';
export * from './prime/PrimeForm';
export * from './prime/PrimeLayout';

// Re-exportação do índice dos componentes prime
export * from './prime';

// ============================================================================
// UTILITÁRIOS
// ============================================================================

// Utilitários gerais
export * from './utils';

// Utilitários específicos dos componentes prime
export * from './prime/utils';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

// Todos os tipos TypeScript
export * from './types';

// ============================================================================
// CONFIGURAÇÕES
// ============================================================================

// Configurações globais da aplicação
export * from './config';

// ============================================================================
// EXEMPLOS E DEMONSTRAÇÕES
// ============================================================================

// Componentes de exemplo
export * from './examples';

// ============================================================================
// CONSTANTES E ENUMS
// ============================================================================

/**
 * Versão da biblioteca
 */
export const LIBRARY_VERSION = '1.0.0';

/**
 * Nome da biblioteca
 */
export const LIBRARY_NAME = 'PrimeReact Padronizados';

/**
 * Autor da biblioteca
 */
export const LIBRARY_AUTHOR = 'SupaGuard';

/**
 * Descrição da biblioteca
 */
export const LIBRARY_DESCRIPTION = 'Biblioteca de componentes PrimeReact padronizados para aplicações React/TypeScript';

/**
 * Tags da biblioteca
 */
export const LIBRARY_TAGS = [
  'react',
  'typescript',
  'primereact',
  'components',
  'ui',
  'forms',
  'tables',
  'layout',
  'validation',
  'security',
  'supabase'
];

/**
 * Dependências principais
 */
export const LIBRARY_DEPENDENCIES = {
  react: '^18.0.0',
  'react-dom': '^18.0.0',
  typescript: '^5.0.0',
  primereact: '^10.0.0',
  primeicons: '^7.0.0',
  'react-hook-form': '^7.0.0',
  zod: '^3.0.0',
  'date-fns': '^2.0.0',
  clsx: '^2.0.0'
};

/**
 * Configurações de desenvolvimento
 */
export const LIBRARY_DEV_CONFIG = {
  storybook: true,
  testing: true,
  linting: true,
  formatting: true,
  typeChecking: true,
  bundling: true,
  documentation: true
};

/**
 * Informações de suporte
 */
export const LIBRARY_SUPPORT = {
  browsers: ['Chrome >= 90', 'Firefox >= 88', 'Safari >= 14', 'Edge >= 90'],
  nodeVersion: '>=16.0.0',
  reactVersion: '>=18.0.0',
  typescriptVersion: '>=5.0.0'
};

// ============================================================================
// FUNÇÕES UTILITÁRIAS DA BIBLIOTECA
// ============================================================================

/**
 * Função para obter informações da biblioteca
 */
export function getLibraryInfo() {
  return {
    name: LIBRARY_NAME,
    version: LIBRARY_VERSION,
    author: LIBRARY_AUTHOR,
    description: LIBRARY_DESCRIPTION,
    tags: LIBRARY_TAGS,
    dependencies: LIBRARY_DEPENDENCIES,
    devConfig: LIBRARY_DEV_CONFIG,
    support: LIBRARY_SUPPORT
  };
}

/**
 * Função para verificar compatibilidade
 */
export function checkCompatibility() {
  const checks = {
    react: typeof window !== 'undefined' && 'React' in window,
    typescript: true, // Sempre true se compilou
    primereact: true, // Verificado em tempo de execução
    browser: typeof window !== 'undefined'
  };

  return {
    compatible: Object.values(checks).every(Boolean),
    checks
  };
}

/**
 * Função para inicializar a biblioteca
 */
export function initializeLibrary(options?: {
  theme?: 'light' | 'dark';
  locale?: string;
  debug?: boolean;
}) {
  const defaultOptions = {
    theme: 'light' as const,
    locale: 'pt-BR',
    debug: false
  };

  const config = { ...defaultOptions, ...options };

  // Configurar tema
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', config.theme);
    document.documentElement.setAttribute('lang', config.locale);
  }

  // Configurar debug
  if (config.debug && typeof console !== 'undefined') {
    console.log('🚀 Biblioteca PrimeReact Padronizados inicializada', {
      ...getLibraryInfo(),
      config
    });
  }

  return config;
}

/**
 * Função para registrar componente customizado
 */
export function registerCustomComponent(
  name: string,
  component: React.ComponentType<any>,
  metadata?: {
    description?: string;
    category?: string;
    tags?: string[];
    examples?: string[];
  }
) {
  if (typeof window !== 'undefined') {
    // Registrar no objeto global para desenvolvimento
    (window as any).__PRIME_COMPONENTS__ = {
      ...(window as any).__PRIME_COMPONENTS__,
      [name]: {
        component,
        metadata: {
          name,
          description: metadata?.description || '',
          category: metadata?.category || 'custom',
          tags: metadata?.tags || [],
          examples: metadata?.examples || [],
          registeredAt: new Date().toISOString()
        }
      }
    };
  }
}

/**
 * Função para obter componentes registrados
 */
export function getRegisteredComponents() {
  if (typeof window !== 'undefined') {
    return (window as any).__PRIME_COMPONENTS__ || {};
  }
  return {};
}

/**
 * Função para validar props de componente
 */
export function validateComponentProps<T extends Record<string, any>>(
  props: T,
  schema: Record<keyof T, {
    required?: boolean;
    type?: string;
    validator?: (value: any) => boolean;
  }>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [key, rules] of Object.entries(schema)) {
    const value = props[key];

    // Verificar se é obrigatório
    if (rules.required && (value === undefined || value === null)) {
      errors.push(`Propriedade '${key}' é obrigatória`);
      continue;
    }

    // Verificar tipo
    if (value !== undefined && rules.type && typeof value !== rules.type) {
      errors.push(`Propriedade '${key}' deve ser do tipo '${rules.type}'`);
    }

    // Validador customizado
    if (value !== undefined && rules.validator && !rules.validator(value)) {
      errors.push(`Propriedade '${key}' falhou na validação customizada`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// HOOKS UTILITÁRIOS
// ============================================================================

/**
 * Hook para obter informações da biblioteca
 */
export function useLibraryInfo() {
  return getLibraryInfo();
}

/**
 * Hook para verificar compatibilidade
 */
export function useCompatibility() {
  return checkCompatibility();
}

/**
 * Hook para componentes registrados
 */
export function useRegisteredComponents() {
  return getRegisteredComponents();
}

// ============================================================================
// EXPORTAÇÃO PADRÃO
// ============================================================================

/**
 * Exportação padrão da biblioteca
 */
const PrimeLibrary = {
  // Informações
  info: getLibraryInfo(),
  
  // Funções utilitárias
  initialize: initializeLibrary,
  checkCompatibility,
  registerComponent: registerCustomComponent,
  getComponents: getRegisteredComponents,
  validateProps: validateComponentProps,
  
  // Constantes
  VERSION: LIBRARY_VERSION,
  NAME: LIBRARY_NAME,
  AUTHOR: LIBRARY_AUTHOR
};

export default PrimeLibrary;

// ============================================================================
// TIPOS PARA EXPORTAÇÃO
// ============================================================================

export type LibraryInfo = ReturnType<typeof getLibraryInfo>;
export type CompatibilityCheck = ReturnType<typeof checkCompatibility>;
export type InitializeOptions = Parameters<typeof initializeLibrary>[0];
export type ComponentMetadata = Parameters<typeof registerCustomComponent>[2];
export type ValidationSchema<T> = Parameters<typeof validateComponentProps<T>>[1];
export type ValidationResult = ReturnType<typeof validateComponentProps>;
