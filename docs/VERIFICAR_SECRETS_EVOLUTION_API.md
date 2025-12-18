# 🔍 Como Verificar se os Secrets da Evolution API Estão Corretos

## ⚠️ Limitação do Supabase

O Supabase **não permite visualizar** os valores dos secrets por segurança. Eles aparecem mascarados como `****` no dashboard. Por isso, precisamos verificar indiretamente através dos logs.

## ✅ Método 1: Verificar através dos Logs da Edge Function

### Passo 1: Fazer Redeploy da Edge Function

**IMPORTANTE:** Os secrets são carregados apenas no momento do deploy. Se você atualizou os secrets, **deve fazer redeploy**.

```bash
supabase functions deploy send-bulk-messages
```

Ou via Dashboard: **Edge Functions** > **send-bulk-messages** > **Redeploy**

### Passo 2: Enviar uma Mensagem de Teste

1. Acesse o sistema e tente enviar uma mensagem de teste
2. Não importa se falhar - precisamos apenas dos logs

### Passo 3: Verificar os Logs

1. Acesse **Supabase Dashboard** > **Edge Functions** > **send-bulk-messages** > **Logs**
2. Procure por esta linha (deve aparecer no início da execução):

```
[getEvolutionApiCredentials] Verificando variáveis de ambiente: {
  hasApiUrl: true,
  hasApiKey: true,
  apiUrlLength: <número>,
  apiKeyLength: <número>,
  apiUrlValue: "https://evolution-backend.nexsyn..."
}
```

### Interpretação dos Logs

✅ **Se você ver:**
- `apiUrlValue: "https://evolution-backend.nexsyn..."`
- `hasApiUrl: true`
- `hasApiKey: true`

**→ Os secrets estão CORRETOS!**

❌ **Se você ver:**
- `apiUrlValue: "https://evolution.nexsyn.com.br..."`
- Ou `hasApiUrl: false`
- Ou `hasApiKey: false`

**→ Os secrets estão INCORRETOS ou não foram salvos!**

## ✅ Método 2: Verificar através de Erro Específico

Se a URL antiga ainda estiver configurada, você verá este erro nos logs:

```
❌ ERRO CRÍTICO: URL antiga detectada (https://evolution.nexsyn.com.br). 
Esta URL causa erro de certificado SSL.

URL CORRETA: https://evolution-backend.nexsyn.com.br
```

Se você ver este erro, significa que:
1. O secret ainda está com a URL antiga, OU
2. Você não fez redeploy após atualizar o secret

## 🔧 Solução Passo a Passo

### Se os Secrets Estão Incorretos:

1. **Acesse Supabase Dashboard** > **Edge Functions** > **Secrets**

2. **Edite `EVOLUTION_API_URL`:**
   - Clique no secret `EVOLUTION_API_URL`
   - **Delete o valor atual completamente**
   - **Digite exatamente:** `https://evolution-backend.nexsyn.com.br`
   - **Certifique-se de não ter espaços antes/depois**
   - Clique em **Save**

3. **Verifique `EVOLUTION_API_KEY`:**
   - Confirme que existe e está preenchido
   - Se necessário, atualize também

4. **Faça Redeploy OBRIGATÓRIO:**
   ```bash
   supabase functions deploy send-bulk-messages
   ```

5. **Teste Novamente:**
   - Envie uma mensagem de teste
   - Verifique os logs novamente

### Se o Problema Persistir:

1. **Tente deletar e recriar o secret:**
   - Delete `EVOLUTION_API_URL` completamente
   - Crie um novo secret com o nome `EVOLUTION_API_URL`
   - Valor: `https://evolution-backend.nexsyn.com.br`
   - Faça redeploy

2. **Verifique se há múltiplos projetos:**
   - Certifique-se de estar editando os secrets do projeto correto
   - Verifique se você está fazendo deploy no projeto correto

3. **Verifique se há cache:**
   - Aguarde alguns minutos após o redeploy
   - Tente novamente

## 📝 Checklist de Verificação

- [ ] Secret `EVOLUTION_API_URL` existe no Supabase
- [ ] Valor do secret é `https://evolution-backend.nexsyn.com.br` (sem espaços)
- [ ] Secret `EVOLUTION_API_KEY` existe e está preenchido
- [ ] Fiz redeploy da Edge Function após atualizar os secrets
- [ ] Logs mostram `apiUrlValue: "https://evolution-backend.nexsyn..."`
- [ ] Não há erros sobre "URL antiga detectada" nos logs

## 🆘 Ainda com Problemas?

Se após seguir todos os passos o problema persistir:

1. **Capture os logs completos** da Edge Function
2. **Verifique se há outros lugares** onde a URL pode estar hardcoded
3. **Entre em contato com o suporte** fornecendo:
   - Logs da Edge Function
   - Data/hora do teste
   - Mensagem de erro completa

