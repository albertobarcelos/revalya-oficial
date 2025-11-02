# PROTOCOLOS DE TESTE E VALIDAÇÃO - DESENVOLVIMENTO IA REVALYA

## 📋 VISÃO GERAL

Este documento estabelece protocolos obrigatórios de teste e validação para todo código gerado por IA no sistema Revalya, garantindo qualidade, segurança e conformidade com a arquitetura multi-tenant.

## 🔍 VALIDAÇÕES PRÉ-IMPLEMENTAÇÃO

### 1. Validação de Contexto Multi-Tenant

```typescript
// ✅ OBRIGATÓRIO: Verificar contexto de tenant antes de qualquer operação
const validateTenantContext = () => {
  const { activeTenant } = useTenant();
  if (!activeTenant?.id) {
    throw new Error('Contexto de tenant inválido');
  }
  return activeTenant;
};

// ✅ TESTE: Verificar isolamento de dados
describe('Tenant Isolation', () => {
  it('should not access data from other tenants', async () => {
    const tenant1Data = await fetchData(tenant1Id);
    const tenant2Data = await fetchData(tenant2Id);
    expect(tenant1Data).not.toContain(tenant2Data);
  });
});
```

### 2. Validação de Permissões RBAC

```typescript
// ✅ OBRIGATÓRIO: Verificar permissões antes de renderizar/executar
const validatePermissions = (requiredPermission: string) => {
  const { permissions } = useAuth();
  if (!permissions.includes(requiredPermission)) {
    throw new Error(`Permissão ${requiredPermission} não encontrada`);
  }
};

// ✅ TESTE: Verificar controle de acesso
describe('RBAC Validation', () => {
  it('should deny access without proper permissions', () => {
    const user = { permissions: ['read'] };
    expect(() => validateAccess(user, 'write')).toThrow();
  });
});
```

### 3. Validação de Tipos TypeScript

```typescript
// ✅ OBRIGATÓRIO: Usar tipos estritamente tipados
interface StrictTenantData {
  tenantId: string;
  userId: string;
  data: Record<string, unknown>;
}

// ✅ TESTE: Verificar tipagem
describe('TypeScript Validation', () => {
  it('should enforce strict typing', () => {
    const data: StrictTenantData = {
      tenantId: 'tenant-123',
      userId: 'user-456',
      data: { value: 'test' }
    };
    expect(typeof data.tenantId).toBe('string');
  });
});
```

## 🧪 TESTES OBRIGATÓRIOS POR MÓDULO

### 1. Componentes React

```typescript
// ✅ TEMPLATE DE TESTE PARA COMPONENTES
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup tenant context
    mockTenantContext({ id: 'test-tenant' });
  });

  it('should render with proper tenant context', () => {
    render(<ComponentName />);
    expect(screen.getByTestId('component')).toBeInTheDocument();
  });

  it('should handle permissions correctly', () => {
    mockUserPermissions(['read']);
    render(<ComponentName />);
    expect(screen.queryByTestId('admin-action')).not.toBeInTheDocument();
  });

  it('should validate data isolation', async () => {
    const { result } = renderHook(() => useComponentData());
    await waitFor(() => {
      expect(result.current.data).toMatchTenantScope('test-tenant');
    });
  });
});
```

### 2. Hooks Customizados

```typescript
// ✅ TEMPLATE DE TESTE PARA HOOKS
describe('useCustomHook', () => {
  it('should validate tenant context', () => {
    const { result } = renderHook(() => useCustomHook());
    expect(result.current.tenantId).toBeDefined();
  });

  it('should handle errors gracefully', async () => {
    mockApiError();
    const { result } = renderHook(() => useCustomHook());
    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });

  it('should respect RLS policies', async () => {
    const { result } = renderHook(() => useCustomHook());
    await waitFor(() => {
      expect(result.current.data).toMatchRLSPolicy();
    });
  });
});
```

### 3. Serviços e APIs

```typescript
// ✅ TEMPLATE DE TESTE PARA SERVIÇOS
describe('ApiService', () => {
  it('should include tenant headers', async () => {
    const spy = jest.spyOn(supabase, 'from');
    await ApiService.getData();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-tenant-id': 'test-tenant'
        })
      })
    );
  });

  it('should validate response data', async () => {
    const response = await ApiService.getData();
    expect(response).toMatchSchema(DataSchema);
  });

  it('should handle rate limiting', async () => {
    mockRateLimit();
    await expect(ApiService.getData()).rejects.toThrow('Rate limit exceeded');
  });
});
```

## 🔒 TESTES DE SEGURANÇA OBRIGATÓRIOS

### 1. Teste de Isolamento de Tenant

```typescript
describe('Tenant Isolation Security', () => {
  it('should prevent cross-tenant data access', async () => {
    // Setup dois tenants
    const tenant1 = 'tenant-1';
    const tenant2 = 'tenant-2';
    
    // Criar dados para tenant1
    await createTestData(tenant1, { secret: 'tenant1-secret' });
    
    // Tentar acessar com contexto tenant2
    switchTenantContext(tenant2);
    const data = await fetchData();
    
    expect(data).not.toContain('tenant1-secret');
  });

  it('should validate RLS policies', async () => {
    const unauthorizedQuery = supabase
      .from('contracts')
      .select('*')
      .eq('tenant_id', 'other-tenant');
    
    await expect(unauthorizedQuery).rejects.toThrow();
  });
});
```

### 2. Teste de Injeção SQL

```typescript
describe('SQL Injection Prevention', () => {
  it('should sanitize user inputs', async () => {
    const maliciousInput = "'; DROP TABLE contracts; --";
    
    await expect(
      searchContracts(maliciousInput)
    ).not.toThrow();
    
    // Verificar que a tabela ainda existe
    const tableExists = await checkTableExists('contracts');
    expect(tableExists).toBe(true);
  });
});
```

### 3. Teste de XSS

```typescript
describe('XSS Prevention', () => {
  it('should sanitize HTML content', () => {
    const maliciousScript = '<script>alert("xss")</script>';
    render(<DisplayContent content={maliciousScript} />);
    
    expect(screen.queryByText('alert("xss")')).not.toBeInTheDocument();
  });
});
```

## 📊 TESTES DE PERFORMANCE

### 1. Teste de Carregamento

```typescript
describe('Performance Tests', () => {
  it('should load dashboard within 2 seconds', async () => {
    const startTime = Date.now();
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
    });
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000);
  });

  it('should handle large datasets efficiently', async () => {
    const largeDataset = generateTestData(10000);
    const startTime = Date.now();
    
    render(<DataTable data={largeDataset} />);
    
    const renderTime = Date.now() - startTime;
    expect(renderTime).toBeLessThan(1000);
  });
});
```

### 2. Teste de Memória

```typescript
describe('Memory Usage', () => {
  it('should not cause memory leaks', async () => {
    const initialMemory = performance.memory?.usedJSHeapSize || 0;
    
    // Renderizar e destruir componente múltiplas vezes
    for (let i = 0; i < 100; i++) {
      const { unmount } = render(<TestComponent />);
      unmount();
    }
    
    // Forçar garbage collection
    if (global.gc) global.gc();
    
    const finalMemory = performance.memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;
    
    expect(memoryIncrease).toBeLessThan(1024 * 1024); // < 1MB
  });
});
```

## 🔄 TESTES DE INTEGRAÇÃO

### 1. Fluxo Completo de Autenticação

```typescript
describe('Authentication Flow', () => {
  it('should complete full auth flow', async () => {
    // 1. Login
    await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));
    
    // 2. Verificar redirecionamento
    await waitFor(() => {
      expect(window.location.pathname).toBe('/dashboard');
    });
    
    // 3. Verificar contexto de tenant
    expect(screen.getByTestId('tenant-selector')).toBeInTheDocument();
    
    // 4. Verificar permissões
    expect(screen.getByTestId('user-menu')).toBeInTheDocument();
  });
});
```

### 2. Fluxo de Reconciliação ASAAS

```typescript
describe('ASAAS Reconciliation Flow', () => {
  it('should process webhook correctly', async () => {
    const webhookPayload = {
      event: 'PAYMENT_RECEIVED',
      payment: { id: 'pay_123', value: 100.00 }
    };
    
    // Simular webhook
    const response = await fetch('/api/asaas-webhook', {
      method: 'POST',
      body: JSON.stringify(webhookPayload)
    });
    
    expect(response.status).toBe(200);
    
    // Verificar processamento
    await waitFor(async () => {
      const payment = await getPaymentById('pay_123');
      expect(payment.status).toBe('RECEIVED');
    });
  });
});
```

## ✅ CHECKLIST DE VALIDAÇÃO PRÉ-DEPLOY

### Segurança
- [ ] Contexto de tenant validado em todas as operações
- [ ] Permissões RBAC verificadas
- [ ] RLS policies testadas
- [ ] Inputs sanitizados
- [ ] Tokens JWT validados

### Performance
- [ ] Tempo de carregamento < 2s
- [ ] Sem vazamentos de memória
- [ ] Queries otimizadas
- [ ] Cache implementado corretamente

### Funcionalidade
- [ ] Todos os casos de uso testados
- [ ] Tratamento de erros implementado
- [ ] Logs de auditoria funcionando
- [ ] Integração com APIs externas testada

### Qualidade de Código
- [ ] Cobertura de testes > 80%
- [ ] TypeScript sem erros
- [ ] ESLint sem warnings
- [ ] Documentação atualizada

## 🚨 ALERTAS AUTOMÁTICOS

### Configuração de Monitoramento

```typescript
// ✅ Configurar alertas para métricas críticas
const securityAlerts = {
  crossTenantAccess: 'CRITICAL',
  authenticationFailure: 'HIGH',
  permissionDenied: 'MEDIUM',
  suspiciousActivity: 'HIGH'
};

const performanceAlerts = {
  responseTime: { threshold: 2000, level: 'HIGH' },
  errorRate: { threshold: 0.05, level: 'CRITICAL' },
  memoryUsage: { threshold: 0.8, level: 'MEDIUM' }
};
```

## 📈 MÉTRICAS DE QUALIDADE

### KPIs Obrigatórios
- **Cobertura de Testes**: > 80%
- **Tempo de Resposta**: < 2s
- **Taxa de Erro**: < 5%
- **Isolamento de Tenant**: 100%
- **Conformidade de Segurança**: 100%

### Relatórios Automáticos
- Relatório diário de testes
- Análise semanal de performance
- Auditoria mensal de segurança
- Review trimestral de arquitetura

---

## 🎯 CONCLUSÃO

Estes protocolos são **OBRIGATÓRIOS** para todo código gerado por IA no sistema Revalya. O não cumprimento pode resultar em:

- Vulnerabilidades de segurança
- Vazamento de dados entre tenants
- Degradação de performance
- Falhas de conformidade

**LEMBRE-SE**: No sistema Revalya, a segurança multi-tenant não é negociável!