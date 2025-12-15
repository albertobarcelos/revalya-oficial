# 🔧 Correção: URL Antiga da Evolution API

## 🚨 Problema Identificado

O sistema está usando a URL antiga `https://evolution.nexsyn.com.br` ao invés da URL configurada nos secrets do Supabase. Isso causa erros de certificado SSL (`invalid peer certificate: NotValidForName`).

## 🔍 Causa Raiz

A Edge Function `send-bulk-messages` está lendo a URL da variável de ambiente `EVOLUTION_API_URL` configurada nos **Secrets do Supabase**. Se essa variável estiver configurada com a URL antiga ou não estiver configurada, o sistema usará valores incorretos.

## ✅ Solução

### Passo 1: Verificar Secrets Atuais

1. Acesse o **Supabase Dashboard**
2. Vá em **Edge Functions** > **Secrets**
3. Verifique se existem as seguintes variáveis:
   - `EVOLUTION_API_URL`
   - `EVOLUTION_API_KEY`

### Passo 2: Atualizar EVOLUTION_API_URL

**URL CORRETA:** `https://evolution-backend.nexsyn.com.br`

1. Se a variável `EVOLUTION_API_URL` existir e estiver com `https://evolution.nexsyn.com.br`, **atualize** com a URL correta:
   ```
   https://evolution-backend.nexsyn.com.br
   ```
2. Se a variável não existir, **crie** uma nova com a URL correta acima
3. **IMPORTANTE:** O Supabase não permite visualizar os secrets por segurança (eles aparecem mascarados como `****`), mas você pode editá-los

### Passo 3: Verificar EVOLUTION_API_KEY

1. Confirme que `EVOLUTION_API_KEY` está configurada corretamente
2. Se necessário, atualize com a chave correta

### Passo 4: Verificar Logs

Após atualizar os secrets, os logs da Edge Function mostrarão:

```
[getEvolutionApiCredentials] Verificando variáveis de ambiente: {
  hasApiUrl: true,
  hasApiKey: true,
  apiUrlLength: <número>,
  apiKeyLength: <número>,
  apiUrlValue: "<primeiros 30 caracteres da URL>..."
}
```

**IMPORTANTE:** A URL antiga `evolution.nexsyn.com.br` agora é **BLOQUEADA** pela Edge Function. Se essa URL estiver configurada, você receberá um erro:

```
❌ ERRO CRÍTICO: URL antiga detectada (https://evolution.nexsyn.com.br). 
Esta URL causa erro de certificado SSL.

SOLUÇÃO:
1. Acesse Supabase Dashboard > Edge Functions > Secrets
2. Atualize EVOLUTION_API_URL com a URL correta da Evolution API
3. Faça redeploy da Edge Function send-bulk-messages
```

A Edge Function **não funcionará** até que a URL seja atualizada nos secrets.

## 📝 Como Verificar se a Correção Funcionou

1. **Envie uma mensagem de teste** pelo sistema
2. **Verifique os logs** da Edge Function no Supabase Dashboard
3. Procure por:
   ```
   [EvolutionApi.sendText] URL que será chamada: <URL>
   [EvolutionApi.sendText] baseUrl recebido: <URL>
   ```
4. Confirme que a URL não contém `evolution.nexsyn.com.br`

## 🔐 Segurança

- **NUNCA** exponha as credenciais da Evolution API no código
- **SEMPRE** use os Secrets do Supabase para armazenar credenciais
- **NUNCA** faça commit de arquivos `.env` com credenciais

## 📚 Referências

- [Documentação Supabase - Edge Functions Secrets](https://supabase.com/docs/guides/functions/secrets)
- [Troubleshooting - Mensagens em Lote](./TROUBLESHOOTING_BULK_MESSAGES.md)

## ⚠️ Importante

### Redeploy Obrigatório

Após atualizar os secrets, **você DEVE fazer redeploy da Edge Function** para que as mudanças tenham efeito. Os secrets são carregados apenas no momento do deploy.

**Opção 1: Via CLI do Supabase**
```bash
supabase functions deploy send-bulk-messages
```

**Opção 2: Via Dashboard**
1. Acesse **Edge Functions** > **send-bulk-messages**
2. Clique em **Redeploy** ou **Deploy**

### Como Verificar se os Secrets Foram Salvos Corretamente

Como o Supabase não permite visualizar os secrets (por segurança), você pode verificar se foram salvos corretamente através dos **logs da Edge Function**:

1. Após fazer o redeploy, envie uma mensagem de teste
2. Acesse **Edge Functions** > **send-bulk-messages** > **Logs**
3. Procure por esta linha nos logs:
   ```
   [getEvolutionApiCredentials] Verificando variáveis de ambiente: {
     hasApiUrl: true,
     hasApiKey: true,
     apiUrlValue: "https://evolution-backend.nexsyn..."
   }
   ```
4. Se você ver `apiUrlValue` começando com `https://evolution-backend.nexsyn`, os secrets estão corretos
5. Se você ver `evolution.nexsyn.com.br` (sem `-backend`), o secret ainda está com a URL antiga

### Se o Problema Persistir

Se mesmo após atualizar e fazer redeploy o problema continuar:

1. **Verifique se você salvou o secret corretamente:**
   - Certifique-se de clicar em "Save" após editar
   - Verifique se não há espaços extras antes/depois da URL

2. **Tente deletar e recriar o secret:**
   - Delete `EVOLUTION_API_URL`
   - Crie novamente com o valor: `https://evolution-backend.nexsyn.com.br`
   - Faça redeploy novamente

3. **Verifique os logs da Edge Function** para ver qual URL está sendo usada

