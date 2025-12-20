# 🔧 Troubleshooting - Mensagens em Lote

## 🚨 Erro: "Failed to send a request to the Edge Function"

### Diagnóstico Rápido

Execute o script de diagnóstico:
```bash
npx ts-node scripts/check-edge-function-config.ts
```

### Principais Causas e Soluções

#### 1. **Variáveis de Ambiente Ausentes** (Mais Comum)

**Sintomas:**
- Erro 500 na Edge Function
- Mensagem: "Configuração da Evolution API não encontrada"

**Solução:**
1. Acesse o painel do Supabase
2. Vá em Settings > Edge Functions
3. Configure as variáveis:
   ```
   EVOLUTION_API_URL=https://sua-evolution-api.com
   EVOLUTION_API_KEY=sua-chave-da-api
   ```

#### 2. **Problemas de Autenticação**

**Sintomas:**
- Erro 401: "Token de autenticação inválido ou expirado"
- Usuário é redirecionado para login

**Solução:**
1. Faça logout e login novamente
2. Verifique se o token JWT não expirou
3. Confirme se o usuário tem sessão ativa

#### 3. **Problemas de Autorização**

**Sintomas:**
- Erro 403: "Acesso negado - permissões insuficientes"
- Usuário logado mas sem acesso

**Solução:**
1. Verifique se o usuário tem role adequada:
   - `admin`
   - `manager`
   - `operator`
2. Atualize as permissões no banco de dados

#### 4. **Problemas de Tenant**

**Sintomas:**
- Erro relacionado a tenant_id
- Contexto de tenant inválido

**Solução:**
1. Verifique se o header `x-tenant-id` está sendo enviado
2. Confirme se o tenant está ativo
3. Valide se o usuário pertence ao tenant

#### 5. **Evolution API Indisponível**

**Sintomas:**
- Erro 502/503/504
- Timeout na requisição

**Solução:**
1. Verifique se a Evolution API está online
2. Teste a conectividade manualmente
3. Confirme se as credenciais estão corretas

### Logs Detalhados

Para debugging avançado, verifique os logs:

1. **Console do Browser:**
   ```javascript
   // Procure por logs com prefixo 🚨
   console.error('🚨 Erro na Edge Function:', ...)
   ```

2. **Logs do Supabase:**
   - Acesse Functions > send-bulk-messages > Logs
   - Procure por erros recentes

3. **Logs de Auditoria:**
   ```sql
   SELECT * FROM audit_logs 
   WHERE function_name = 'send-bulk-messages' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

### Retry Automático

O sistema implementa retry automático para:
- ✅ Erros temporários (500, 502, 503, 504)
- ✅ Problemas de rede/timeout
- ❌ Erros de autenticação (401)
- ❌ Erros de autorização (403)
- ❌ Erros de validação (400)

### Configurações Recomendadas

#### Variáveis de Ambiente Obrigatórias:
```env
EVOLUTION_API_URL=https://api.evolution.com
EVOLUTION_API_KEY=your-api-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### Permissões de Usuário:
```sql
-- Verificar role do usuário
SELECT role FROM user_profiles WHERE user_id = 'user-uuid';

-- Atualizar role se necessário
UPDATE user_profiles 
SET role = 'manager' 
WHERE user_id = 'user-uuid';
```

### Monitoramento

#### Métricas Importantes:
- Taxa de sucesso das mensagens
- Tempo de resposta da Edge Function
- Erros por tipo (401, 403, 500, etc.)
- Uso da Evolution API

#### Alertas Recomendados:
- Taxa de erro > 5%
- Tempo de resposta > 10s
- Falhas consecutivas > 3

### Contato para Suporte

Em caso de problemas persistentes:
1. Execute o script de diagnóstico
2. Colete os logs relevantes
3. Documente os passos para reproduzir
4. Entre em contato com a equipe técnica

---

**Última atualização:** $(date)
**Versão:** 1.0.0