/**
 * Constantes para rotas da aplicação
 * 
 * Centraliza todas as rotas para facilitar a manutenção e evitar erros de digitação.
 * Use estas constantes em vez de strings hardcoded para rotas.
 */

export const ROUTES = {
  // Rotas públicas (não requerem autenticação)
  PUBLIC: {
    LOGIN: '/login',
    REGISTER: '/register',
    RESET_PASSWORD: '/reset-password',
    REQUEST_UPDATE: '/solicitar',
    INVALID_LINK: '/invalid-link',
  },
  
  // Rotas que requerem autenticação
  PROTECTED: {
    PORTAL_SELECTION: '/meus-aplicativos',
    ROOT: '/',
  },
  
  // Rotas administrativas
  ADMIN: {
    ROOT: '/admin',
    USERS: '/admin/users',
    SETTINGS: '/admin/settings',
  },
  
  // Funções para gerar rotas de tenant dinâmicas
  TENANT: {
    ROOT: (slug: string) => `/${slug}`,
    DASHBOARD: (slug: string) => `/${slug}/dashboard`,
    SETTINGS: (slug: string) => `/${slug}/configuracoes`,
    USERS: (slug: string) => `/${slug}/users`,
  }
};
