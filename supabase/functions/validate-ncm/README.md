# Edge Function: Validação de NCM via FocusNFe

Esta Edge Function consulta a API da FocusNFe para validar códigos NCM.

## Configuração

### Variáveis de Ambiente

Configure as seguintes variáveis de ambiente no Supabase:

```bash
# Token de autenticação da FocusNFe
FOCUSNFE_TOKEN=seu_token_aqui

# URL da API (opcional, padrão: https://api.focusnfe.com.br/v2)
FOCUSNFE_API_URL=https://api.focusnfe.com.br/v2
```

### Como obter o Token FocusNFe

1. Acesse o [Painel da API FocusNFe](https://app.focusnfe.com.br/)
2. Faça login na sua conta
3. Navegue até **Configurações** → **API**
4. Copie o **Token de Acesso**

### Configurar no Supabase

```bash
# Via CLI do Supabase
supabase secrets set FOCUSNFE_TOKEN=seu_token_aqui

# Ou via Dashboard do Supabase
# Settings → Edge Functions → Secrets
```

## Endpoint

**URL:** `/functions/v1/validate-ncm`  
**Método:** `POST`

### Request Body

```json
{
  "code": "2203.00.00"
}
```

### Response

**Sucesso (NCM válido):**
```json
{
  "code": "2203.00.00",
  "description": "Cervejas de malte",
  "valid": true
}
```

**NCM não encontrado:**
```json
{
  "code": "2203.00.00",
  "description": "",
  "valid": false,
  "error": "NCM não encontrado na base da FocusNFe"
}
```

## Documentação da API FocusNFe

- [Consulta de NCM](https://focusnfe.com.br/doc/#consulta-de-ncm)
- [Limite de requisições](https://focusnfe.com.br/doc/#limite-de-requisições): 100 créditos/minuto

## Deploy

```bash
supabase functions deploy validate-ncm
```

