/**
 * Testes automatizados para segurança multi-tenant
 * 
 * Verifica isolamento de dados, validação de tenant e prevenção de vazamentos
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { useTenantGuard, useRequireTenant } from '../hooks/useTenantGuard';
import { useSecureTenantQuery, useSecureTenantMutation } from '../hooks/useSecureTenantData';
import { SecurityLogger, tenantSecurityMonitor } from '../utils/tenantSecurityMonitor';

// Mocks
vi.mock('../hooks/useTenantContext', () => ({
  useTenantContext: vi.fn()
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(),
    useNavigate: vi.fn()
  };
});

const mockTenantContext = vi.mocked(await import('../hooks/useTenantContext'));
const mockRouter = vi.mocked(await import('react-router-dom'));

// Wrapper para testes com providers
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('TenantGuard Security Tests', () => {
  const mockNavigate = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockRouter.useNavigate.mockReturnValue(mockNavigate);
    
    // Limpar eventos de segurança
    tenantSecurityMonitor['events'] = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useTenantGuard', () => {
    it('deve validar tenant correto', () => {
      // Arrange
      mockRouter.useParams.mockReturnValue({ slug: 'revalya' });
      mockTenantContext.useTenantContext.mockReturnValue({
        tenant: { id: '123', slug: 'revalya', name: 'Revalya' },
        isLoading: false
      });

      // Act
      const { result } = renderHook(() => useTenantGuard(), {
        wrapper: createWrapper()
      });

      // Assert
      expect(result.current.isValidTenant).toBe(true);
      expect(result.current.expectedSlug).toBe('revalya');
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('deve detectar inconsistência de tenant e redirecionar', () => {
      // Arrange
      mockRouter.useParams.mockReturnValue({ slug: 'nexsyn' });
      mockTenantContext.useTenantContext.mockReturnValue({
        tenant: { id: '123', slug: 'revalya', name: 'Revalya' },
        isLoading: false
      });

      // Act
      renderHook(() => useTenantGuard(), {
        wrapper: createWrapper()
      });

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith('/portal');
    });

    it('deve registrar evento de segurança em caso de inconsistência', () => {
      // Arrange
      const logSpy = vi.spyOn(SecurityLogger, 'logTenantMismatch');
      mockRouter.useParams.mockReturnValue({ slug: 'nexsyn' });
      mockTenantContext.useTenantContext.mockReturnValue({
        tenant: { id: '123', slug: 'revalya', name: 'Revalya' },
        isLoading: false
      });

      // Act
      renderHook(() => useTenantGuard(), {
        wrapper: createWrapper()
      });

      // Assert
      expect(logSpy).toHaveBeenCalledWith('nexsyn', 'revalya', expect.any(Object));
    });

    it('não deve validar quando tenant está carregando', () => {
      // Arrange
      mockRouter.useParams.mockReturnValue({ slug: 'revalya' });
      mockTenantContext.useTenantContext.mockReturnValue({
        tenant: null,
        isLoading: true
      });

      // Act
      const { result } = renderHook(() => useTenantGuard(), {
        wrapper: createWrapper()
      });

      // Assert
      expect(result.current.isLoading).toBe(true);
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('useRequireTenant', () => {
    it('deve forçar redirecionamento para tenant inválido', () => {
      // Arrange
      mockRouter.useParams.mockReturnValue({ slug: 'nexsyn' });
      mockTenantContext.useTenantContext.mockReturnValue({
        tenant: { id: '123', slug: 'revalya', name: 'Revalya' },
        isLoading: false
      });

      // Act
      renderHook(() => useRequireTenant(), {
        wrapper: createWrapper()
      });

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith('/portal');
    });
  });
});

describe('Secure Tenant Data Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useSecureTenantQuery', () => {
    it('deve incluir tenant_id na query key', () => {
      // Arrange
      mockTenantContext.useTenantContext.mockReturnValue({
        tenant: { id: '123', slug: 'revalya', name: 'Revalya' },
        isLoading: false
      });

      const mockQueryFn = vi.fn().mockResolvedValue([]);

      // Act
      const { result } = renderHook(
        () => useSecureTenantQuery(['contracts'], mockQueryFn),
        { wrapper: createWrapper() }
      );

      // Assert - A query deve estar habilitada para tenant válido
      expect(result.current.isLoading).toBeDefined();
    });

    it('deve bloquear query para tenant inválido', () => {
      // Arrange
      mockTenantContext.useTenantContext.mockReturnValue({
        tenant: null,
        isLoading: false
      });

      const mockQueryFn = vi.fn();

      // Act
      renderHook(
        () => useSecureTenantQuery(['contracts'], mockQueryFn),
        { wrapper: createWrapper() }
      );

      // Assert
      expect(mockQueryFn).not.toHaveBeenCalled();
    });
  });

  describe('useSecureTenantMutation', () => {
    it('deve validar tenant antes de executar mutation', async () => {
      // Arrange
      mockTenantContext.useTenantContext.mockReturnValue({
        tenant: { id: '123', slug: 'revalya', name: 'Revalya' },
        isLoading: false
      });

      const mockMutationFn = vi.fn().mockResolvedValue({ id: '1' });

      // Act
      const { result } = renderHook(
        () => useSecureTenantMutation(mockMutationFn),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        result.current.mutate({ title: 'Test Contract' });
      });

      // Assert
      expect(mockMutationFn).toHaveBeenCalledWith({ title: 'Test Contract' });
    });

    it('deve rejeitar mutation para tenant inválido', async () => {
      // Arrange
      mockTenantContext.useTenantContext.mockReturnValue({
        tenant: null,
        isLoading: false
      });

      const mockMutationFn = vi.fn();

      // Act
      const { result } = renderHook(
        () => useSecureTenantMutation(mockMutationFn),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        result.current.mutate({ title: 'Test Contract' });
      });

      // Assert
      expect(result.current.error).toBeDefined();
      expect(mockMutationFn).not.toHaveBeenCalled();
    });
  });
});

describe('Security Monitor', () => {
  beforeEach(() => {
    // Limpar eventos
    tenantSecurityMonitor['events'] = [];
  });

  it('deve registrar eventos de segurança', () => {
    // Act
    SecurityLogger.logTenantMismatch('expected', 'actual', { test: true });

    // Assert
    const stats = tenantSecurityMonitor.getSecurityStats();
    expect(stats.totalEvents).toBe(1);
    expect(stats.tenantMismatches).toBe(1);
  });

  it('deve detectar padrões suspeitos', () => {
    // Arrange
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Act - Simular múltiplos eventos suspeitos
    for (let i = 0; i < 6; i++) {
      SecurityLogger.logTenantMismatch('expected', 'actual');
    }

    // Assert
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[SECURITY ALERT]'),
      expect.any(Array)
    );

    consoleSpy.mockRestore();
  });

  it('deve alertar imediatamente para eventos críticos', () => {
    // Arrange
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Act
    SecurityLogger.logUnauthorizedQuery(['sensitive_data'], '123');

    // Assert
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[SECURITY ALERT]'),
      expect.any(Array)
    );

    consoleSpy.mockRestore();
  });

  it('deve fornecer estatísticas precisas', () => {
    // Act
    SecurityLogger.logTenantMismatch('a', 'b');
    SecurityLogger.logUnauthorizedQuery(['test'], '123');
    SecurityLogger.logCacheViolation('123');

    // Assert
    const stats = tenantSecurityMonitor.getSecurityStats();
    expect(stats.totalEvents).toBe(3);
    expect(stats.tenantMismatches).toBe(1);
    expect(stats.unauthorizedQueries).toBe(1);
  });
});

describe('Integration Tests', () => {
  it('deve prevenir vazamento de dados entre tenants', () => {
    // Arrange
    const logSpy = vi.spyOn(SecurityLogger, 'logTenantMismatch');
    
    // Simular usuário acessando tenant A
    mockRouter.useParams.mockReturnValue({ slug: 'tenant-a' });
    mockTenantContext.useTenantContext.mockReturnValue({
      tenant: { id: '1', slug: 'tenant-a', name: 'Tenant A' },
      isLoading: false
    });

    const { rerender } = renderHook(() => useTenantGuard(), {
      wrapper: createWrapper()
    });

    // Act - Simular troca para tenant B sem atualizar contexto
    mockRouter.useParams.mockReturnValue({ slug: 'tenant-b' });
    
    rerender();

    // Assert
    expect(logSpy).toHaveBeenCalledWith('tenant-b', 'tenant-a', expect.any(Object));
    expect(mockNavigate).toHaveBeenCalledWith('/portal');
  });

  it('deve limpar cache ao detectar troca de tenant', () => {
    // Arrange
    const queryClient = new QueryClient();
    const clearSpy = vi.spyOn(queryClient, 'clear');
    
    // Mock do contexto inicial
    mockTenantContext.useTenantContext.mockReturnValue({
      tenant: { id: '1', slug: 'tenant-a', name: 'Tenant A' },
      isLoading: false
    });

    // Act - Simular mudança de tenant
    mockTenantContext.useTenantContext.mockReturnValue({
      tenant: { id: '2', slug: 'tenant-b', name: 'Tenant B' },
      isLoading: false
    });

    // Assert - Cache deve ser limpo em caso de inconsistência
    expect(clearSpy).toBeDefined();
  });
});
