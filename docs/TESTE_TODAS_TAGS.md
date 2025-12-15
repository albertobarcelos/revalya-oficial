# 🧪 Teste de Envio com Todas as Tags

## 📱 Número de Teste
**+5565 9 9293 4536** (formatado: `+5565992934536`)

## 📝 Mensagem de Teste com TODAS as Tags

Copie e cole esta mensagem no campo de mensagem customizada:

```
🧪 TESTE DE TODAS AS TAGS

👤 CLIENTE:
Nome: {cliente.nome}
Empresa: {cliente.empresa}
Email: {cliente.email}
CPF/CNPJ: {cliente.cpf}
Telefone: {cliente.telefone}

💰 COBRANÇA:
Valor: {cobranca.valor}
Vencimento: {cobranca.vencimento}
Descrição: {cobranca.descricao}
Status: {cobranca.status}
Código de Barras: {cobranca.codigoBarras}
PIX Copia e Cola: {cobranca.pix_copia_cola}
Link Pagamento: {cobranca.link}
Link Boleto: {cobranca.link_boleto}

📅 DIAS:
Dias até Vencimento: {dias.ateVencimento}
Dias após Vencimento: {dias.aposVencimento}

✅ Todas as tags foram processadas corretamente!
```

## 🎯 Tags Incluídas no Teste

### Tags de Cliente (5 tags)
- ✅ `{cliente.nome}` - Nome do Cliente
- ✅ `{cliente.empresa}` - Empresa do Cliente
- ✅ `{cliente.email}` - Email
- ✅ `{cliente.cpf}` - CPF/CNPJ
- ✅ `{cliente.telefone}` - Telefone

### Tags de Cobrança (8 tags)
- ✅ `{cobranca.valor}` - Valor da Cobrança
- ✅ `{cobranca.vencimento}` - Data de Vencimento
- ✅ `{cobranca.descricao}` - Descrição
- ✅ `{cobranca.status}` - Status
- ✅ `{cobranca.codigoBarras}` - Código de Barras
- ✅ `{cobranca.pix_copia_cola}` - PIX Copia e Cola
- ✅ `{cobranca.link}` - Link Pagamento
- ✅ `{cobranca.link_boleto}` - Link Boleto

### Tags de Dias (2 tags)
- ✅ `{dias.ateVencimento}` - Dias até Vencimento
- ✅ `{dias.aposVencimento}` - Dias após Vencimento

**Total: 15 tags testadas**

## 📋 Como Testar

### Opção 1: Via Frontend (Recomendado)

1. Acesse a tela de **Cobranças**
2. Selecione uma cobrança (ou crie uma nova)
3. Clique em **Enviar Mensagem em Massa**
4. Selecione a aba **Mensagem Customizada**
5. Cole a mensagem de teste acima
6. Certifique-se de que o cliente tem o telefone: **+5565 9 9293 4536**
7. Clique em **Enviar**

### Opção 2: Via Script (Avançado)

Execute o script `scripts/test-bulk-messages-all-tags.ts`:

```bash
cd scripts
npx tsx test-bulk-messages-all-tags.ts
```

## ✅ O Que Verificar

Após o envio, verifique no WhatsApp se:

1. ✅ Todas as tags foram substituídas pelos valores reais
2. ✅ Nenhuma tag apareceu sem substituição (ex: `{cliente.nome}` ainda visível)
3. ✅ Valores formatados corretamente:
   - Valor em R$ (ex: R$ 1.500,00)
   - Data em formato brasileiro (ex: 16/12/2025)
   - Links funcionais
4. ✅ Cálculo de dias correto (até/após vencimento)

## 🔍 Logs para Debug

Se algo não funcionar, verifique:

1. **Logs da Edge Function** no Supabase Dashboard
2. **Console do navegador** (F12) para erros no frontend
3. **Tabela `message_history`** para histórico de envios

## 📊 Resultado Esperado

A mensagem recebida no WhatsApp deve ter todos os valores preenchidos, por exemplo:

```
🧪 TESTE DE TODAS AS TAGS

👤 CLIENTE:
Nome: João
Empresa: Empresa Teste LTDA
Email: teste@exemplo.com
CPF/CNPJ: 123.456.789-00
Telefone: +5565992934536

💰 COBRANÇA:
Valor: R$ 1.500,00
Vencimento: 16/12/2025
Descrição: Cobrança de teste...
Status: pending
Código de Barras: 12345678901234567890...
PIX Copia e Cola: 12345678901234567890...
Link Pagamento: https://exemplo.com/pagamento/123
Link Boleto: https://exemplo.com/boleto/123.pdf

📅 DIAS:
Dias até Vencimento: 1
Dias após Vencimento: 0

✅ Todas as tags foram processadas corretamente!
```

