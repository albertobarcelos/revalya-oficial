# 🔧 Troubleshooting: Cadastro Automático de Empresa Focus NFe

**Data:** 2025-01-29  
**Problema:** Empresa não está sendo criada automaticamente no Focus NFe

---

## 🔍 Diagnóstico

### Possíveis Causas

1. **Permissões da conta**
   - A API de empresas pode não estar habilitada para sua conta
   - Algumas contas podem não ter permissão para criar empresas via API
   - Consulte a documentação: https://focusnfe.com.br/doc/#empresas

2. **Token incorreto ou inválido**
   - O token `FOCUSNFE_API_KEY` pode estar incorreto ou expirado
   - Verifique se o token está configurado corretamente nos secrets do Supabase

3. **Dados incompletos ou inválidos**
   - Alguns campos podem ser obrigatórios e não estão sendo enviados
   - Formato dos dados pode estar incorreto
   - Consulte: https://focusnfe.com.br/doc/#empresas_criacao-de-empresa

4. **Endpoint não disponível**
   - A funcionalidade pode não estar disponível para todos os tipos de conta
   - Entre em contato com o suporte para verificar disponibilidade

---

## ✅ Solução Implementada

### 1. Uso do Token Normal da API

O sistema usa o mesmo token da API (`FOCUSNFE_API_KEY`) para criar empresas:

```typescript
// Usa o token normal da API
const credentials = getFocusNFeCredentials(environment);
const token = credentials.token;
```

**Configuração:**
- Verificar se `FOCUSNFE_API_KEY` está configurado nos secrets do Supabase
- O token deve ter permissão para criar empresas (pode variar por tipo de conta)

### 2. Logs Detalhados

O sistema agora registra:
- Dados sendo enviados (sem informações sensíveis)
- URL da requisição
- Status da resposta
- Erros detalhados da API

**Como verificar:**
1. Acesse **Supabase Dashboard** > **Edge Functions** > **Logs**
2. Filtre por função `focusnfe`
3. Procure por `[handleCreateCompany]` nos logs

### 3. Tratamento de Erros Melhorado

O sistema agora mostra mensagens de erro específicas:
- **403**: Token de revenda necessário
- **401**: Token inválido
- **404**: Endpoint não encontrado
- **422**: Dados inválidos

---

## 🚀 Como Resolver

### Passo 1: Verificar Logs

1. Ative a integração novamente
2. Acesse os logs da Edge Function
3. Procure por mensagens de erro

### Passo 2: Verificar Permissões da Conta

Se o erro for **401 (Não Autorizado)** ou **403 (Acesso Negado)**:

1. Verifique se o token está correto:
   - Acesse **Supabase Dashboard** > **Edge Functions** > **Secrets**
   - Verifique se `FOCUSNFE_API_KEY` está configurado corretamente
   - O token deve ser o mesmo usado para emitir notas

2. Entre em contato com o suporte Focus NFe:
   - Email: suporte@focusnfe.com.br
   - Solicite: "Habilitar acesso à API de Empresas"
   - Informe que precisa criar empresas via API (endpoint POST /v2/empresas)

### Passo 3: Verificar Dados da Empresa

Certifique-se de que os seguintes dados estão preenchidos:
- ✅ CNPJ
- ✅ Razão Social
- ✅ Endereço completo (logradouro, número, bairro, cidade, UF, CEP)
- ✅ Telefone ou Email

### Passo 4: Testar Novamente

1. Ative a integração novamente
2. Verifique os logs
3. Se ainda falhar, verifique a mensagem de erro específica

---

## 📋 Checklist de Verificação

- [ ] `FOCUSNFE_API_KEY` configurado nos secrets
- [ ] Token verificado e válido
- [ ] Dados da empresa preenchidos (CNPJ, Razão Social, Endereço)
- [ ] Integração Focus NFe ativada no sistema
- [ ] Logs da Edge Function verificados
- [ ] Permissão para API de Empresas confirmada com suporte Focus NFe (se erro 401/403)

---

## 🔗 Referências

- [Documentação Focus NFe - Empresas](https://focusnfe.com.br/doc/#empresas)
- [Criação de Empresa - Documentação](https://focusnfe.com.br/doc/#empresas_criacao-de-empresa)
- [Suporte Focus NFe](mailto:suporte@focusnfe.com.br)

---

## 💡 Alternativa: Cadastro Manual

Se o cadastro automático não funcionar, você pode:

1. Acessar o painel do Focus NFe: https://app.focusnfe.com.br/empresas
2. Cadastrar a empresa manualmente
3. Fazer upload do certificado digital
4. Continuar usando o sistema normalmente

O sistema continuará funcionando mesmo sem cadastro automático.

---

**Última atualização:** 2025-01-29

