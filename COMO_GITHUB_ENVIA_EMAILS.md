# 📧 Como o GitHub Actions Envia E-mails

## 🔄 Fluxo Completo

### 1. **Trigger (Gatilho)**
```
Evento no GitHub → Dispara o Workflow
```

**Exemplos:**
- Pull Request criado/atualizado
- Deploy de produção falhou
- Workflow configurado para monitorar

### 2. **GitHub Actions Executa o Workflow**

O GitHub cria um **runner virtual** (máquina Linux temporária) que:
- Faz checkout do código
- Executa os steps do workflow
- Tem acesso aos Secrets configurados

### 3. **Action de E-mail Usa SMTP**

O workflow usa a action `dawidd6/action-send-mail@v3` que:

```yaml
uses: dawidd6/action-send-mail@v3
with:
  server_address: smtp.gmail.com    # Servidor SMTP do Gmail
  server_port: 465                   # Porta SSL
  username: ${{ secrets.EMAIL_USERNAME }}  # Seu e-mail
  password: ${{ secrets.EMAIL_PASSWORD }} # Senha de app
  to: ${{ secrets.NOTIFICATION_EMAIL }}    # Destinatário
  subject: "❌ Falha no Supabase..."
  body: "<html>...</html>"
```

### 4. **Conexão SMTP (Protocolo de E-mail)**

```
GitHub Runner → Conecta via SMTP → Servidor Gmail → Envia E-mail
```

**O que acontece:**
1. GitHub Runner se conecta ao `smtp.gmail.com:465` (SSL)
2. Autentica usando `EMAIL_USERNAME` e `EMAIL_PASSWORD`
3. Envia o e-mail usando protocolo SMTP
4. Gmail processa e entrega ao destinatário

## 🔐 Segurança

### Secrets são Criptografados

```
GitHub Secrets → Criptografados → Descriptografados apenas durante execução
```

- ✅ Secrets **nunca** aparecem nos logs
- ✅ Apenas workflows autorizados têm acesso
- ✅ Secrets são descriptografados apenas no momento da execução

### Por que Senha de Aplicativo?

Para Gmail, você precisa de uma **Senha de Aplicativo** (não a senha normal):

```
Senha Normal → ❌ Não funciona (2FA bloqueia)
Senha de App → ✅ Funciona (token específico para apps)
```

## 📊 Diagrama do Fluxo

```
┌─────────────────┐
│  Evento GitHub  │  (PR criado, deploy falhou)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  GitHub Actions │  (Cria runner virtual)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Workflow YAML  │  (Executa steps)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ action-send-mail│  (Action de terceiros)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  SMTP Protocol  │  (Conecta ao servidor)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  smtp.gmail.com │  (Servidor Gmail)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Seu E-mail 📧  │  (Recebe notificação)
└─────────────────┘
```

## 🛠️ Como Funciona Tecnicamente

### 1. **Action `dawidd6/action-send-mail`**

Esta é uma action de **terceiros** (open source) que:
- Implementa cliente SMTP em Node.js
- Suporta múltiplos provedores (Gmail, Outlook, SendGrid, etc.)
- Formata HTML/texto
- Lida com autenticação SSL/TLS

**Código interno (simplificado):**
```javascript
// A action internamente faz algo como:
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  }
});

await transporter.sendMail({
  from: 'seu-email@gmail.com',
  to: 'destinatario@exemplo.com',
  subject: 'Assunto',
  html: '<h1>Corpo do e-mail</h1>'
});
```

### 2. **SMTP (Simple Mail Transfer Protocol)**

É o protocolo padrão para envio de e-mails na internet:

```
SMTP → Protocolo de envio (como HTTP para web)
POP3/IMAP → Protocolo de recebimento
```

**Portas comuns:**
- `25` - SMTP padrão (não seguro)
- `587` - SMTP com TLS (recomendado)
- `465` - SMTP com SSL (Gmail usa esta)

### 3. **Autenticação**

O GitHub Runner precisa provar que tem permissão para enviar:

```
1. Conecta ao servidor SMTP
2. Envia: USERNAME + PASSWORD
3. Servidor valida
4. Se válido → Permite enviar e-mail
```

## 🔍 Onde Ver os Logs?

### 1. **GitHub Actions**

```
https://github.com/albertobarcelos/revalya-oficial/actions
→ Clique no workflow "Notificar Falhas Supabase"
→ Veja os logs do step "Enviar notificação por e-mail"
```

**Logs mostram:**
- ✅ "Email sent successfully" (sucesso)
- ❌ "Authentication failed" (erro de senha)
- ❌ "Connection timeout" (problema de rede)

### 2. **E-mail Enviado**

O e-mail chega normalmente na sua caixa de entrada (ou spam).

## ⚙️ Alternativas ao Gmail

### Outlook/Office 365

```yaml
server_address: smtp.office365.com
server_port: 587
username: seu-email@outlook.com
password: sua-senha
```

### SendGrid (Serviço Profissional)

```yaml
server_address: smtp.sendgrid.net
server_port: 587
username: apikey
password: ${{ secrets.SENDGRID_API_KEY }}
```

### Amazon SES

```yaml
server_address: email-smtp.us-east-1.amazonaws.com
server_port: 587
username: ${{ secrets.AWS_SES_USERNAME }}
password: ${{ secrets.AWS_SES_PASSWORD }}
```

## 🎯 Resumo

1. **GitHub não envia e-mails diretamente**
   - Usa uma action de terceiros (`dawidd6/action-send-mail`)
   
2. **A action usa SMTP**
   - Conecta ao servidor de e-mail (Gmail, Outlook, etc.)
   - Autentica com username/password
   - Envia o e-mail via protocolo SMTP

3. **Secrets são seguros**
   - Criptografados no GitHub
   - Descriptografados apenas durante execução
   - Nunca aparecem nos logs

4. **É como enviar e-mail de qualquer app**
   - Mesmo protocolo que seu cliente de e-mail usa
   - Mesma autenticação
   - Mesma segurança

## 🔗 Referências

- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [action-send-mail](https://github.com/dawidd6/action-send-mail)
- [SMTP Protocol](https://en.wikipedia.org/wiki/Simple_Mail_Transfer_Protocol)
- [Gmail SMTP Settings](https://support.google.com/mail/answer/7126229)

