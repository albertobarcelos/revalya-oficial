# 📋 Como Verificar Logs Detalhados da Edge Function

## 🔍 Acessar Logs no Dashboard

1. Acesse: https://supabase.com/dashboard/project/wyehpiutzvwplllumgdk/functions/asaas-webhook-charges/logs
2. Os logs detalhados (com `console.log`) aparecem na interface do Dashboard
3. Procure pelos logs que começam com:
   - `📌 URL completa:`
   - `📌 Pathname:`
   - `📌 Path parts:`
   - `📌 Tenant extraído:`
   - `📌 Headers recebidos:`
   - `📦 Body recebido (raw):`
   - `❌ Tenant ID inválido:` ou `❌ Erro ao fazer parse do JSON:`

## 🔎 O que procurar nos logs

### Se aparecer "Tenant ID inválido":
- Verifique o valor em `received:` na mensagem de erro
- Verifique o `pathname:` para ver como o path está sendo parseado

### Se aparecer "Payload JSON inválido":
- Verifique o `Body recebido (raw):` para ver o que o ASAAS está enviando
- Pode ser que o ASAAS esteja enviando uma requisição de teste vazia

### Se aparecer "Não autorizado":
- Verifique os `Headers recebidos:` para ver qual token está sendo enviado
- Compare com o `Token esperado:` nos logs

## 🛠️ Próximos Passos

Com base nos logs detalhados, podemos:
1. Ajustar a validação do tenant ID se necessário
2. Tratar requisições de teste do ASAAS (que podem vir sem payload)
3. Ajustar a validação do token se necessário

