# 🔧 Configuração de Tags no Supabase

## ✅ Status Atual

A edge function `send-bulk-messages` **já está configurada corretamente** e processa todas as tags disponíveis. **Não é necessário fazer nenhuma alteração no Supabase** neste momento.

## 📋 Verificação das Tags na Edge Function

A edge function processa as seguintes tags (localizadas em `supabase/functions/send-bulk-messages/index.ts`):

### ✅ Tags Processadas

#### Cliente (5 tags)
- ✅ `{cliente.nome}`
- ✅ `{cliente.empresa}`
- ✅ `{cliente.cpf}` (compatibilidade)
- ✅ `{cliente.cpf_cnpj}`
- ✅ `{cliente.telefone}`
- ✅ `{cliente.email}`

#### Cobrança (7 tags)
- ✅ `{cobranca.valor}`
- ✅ `{cobranca.vencimento}`
- ✅ `{cobranca.descricao}`
- ✅ `{cobranca.status}`
- ✅ `{cobranca.codigoBarras}`
- ✅ `{cobranca.pix_copia_cola}` (e `{cobranca.pix}` para compatibilidade)
- ✅ `{cobranca.link}` (e `{cobranca.link_pix}` para compatibilidade)
- ✅ `{cobranca.link_boleto}`

#### Dias (2 tags)
- ✅ `{dias.ateVencimento}`
- ✅ `{dias.aposVencimento}`

#### Empresa (1 tag)
- ✅ `{empresa.nome}` (usa dados do tenant)

#### Tags Legadas (compatibilidade)
- ✅ `{{nome}}`
- ✅ `{{valor}}`
- ✅ `{{vencimento}}`
- ✅ `{{telefone}}`
- ✅ `{{email}}`

## 🔄 Sincronização

A edge function está **sincronizada** com o arquivo centralizado `src/utils/messageTags.ts`. 

### Como Manter Sincronizado

Quando adicionar uma nova tag:

1. **Frontend** (`src/utils/messageTags.ts`):
   - Adicione a tag em `TAG_DEFINITIONS`

2. **Frontend** (`src/utils/messageUtils.ts`):
   - Adicione o processamento da tag na função `processMessageTags`

3. **Edge Function** (`supabase/functions/send-bulk-messages/index.ts`):
   - Adicione o `.replace()` correspondente na função `renderMessage`

4. **Deploy**:
   - Faça deploy da edge function atualizada:
   ```bash
   supabase functions deploy send-bulk-messages
   ```

## 🚀 Deploy da Edge Function

Se você fez alterações na edge function, faça o deploy:

```bash
# No diretório raiz do projeto
supabase functions deploy send-bulk-messages
```

Ou usando o Supabase CLI:

```bash
supabase functions deploy send-bulk-messages --project-ref seu-project-ref
```

## ✅ Checklist de Verificação

- [x] Edge function processa todas as tags do arquivo centralizado
- [x] Tags de cliente funcionando
- [x] Tags de cobrança funcionando
- [x] Tags de dias funcionando
- [x] Tag de empresa funcionando
- [x] Busca de dados do tenant implementada
- [x] Compatibilidade com tags legadas mantida

## 📝 Notas Importantes

1. **A edge function não importa o arquivo centralizado** - ela processa as tags diretamente usando regex
2. **Mantenha a sincronização manual** - sempre que adicionar uma tag, atualize ambos os lugares
3. **Teste após adicionar tags** - verifique se a tag funciona tanto no frontend quanto na edge function

## 🔍 Como Testar

1. Crie uma mensagem com todas as tags
2. Envie via frontend
3. Verifique os logs da edge function no Supabase Dashboard
4. Confirme que todas as tags foram substituídas corretamente no WhatsApp

## 🐛 Troubleshooting

Se uma tag não estiver funcionando:

1. Verifique se a tag está em `TAG_DEFINITIONS`
2. Verifique se está processada em `messageUtils.ts`
3. Verifique se está processada em `renderMessage()` da edge function
4. Verifique os logs da edge function no Supabase Dashboard
5. Teste com uma mensagem simples contendo apenas a tag problemática

## 📚 Referências

- Arquivo centralizado: `src/utils/messageTags.ts`
- Processamento frontend: `src/utils/messageUtils.ts`
- Processamento backend: `supabase/functions/send-bulk-messages/index.ts`

