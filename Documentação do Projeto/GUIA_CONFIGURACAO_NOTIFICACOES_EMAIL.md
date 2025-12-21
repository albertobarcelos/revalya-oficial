# 📧 Guia de Configuração - Notificações por E-mail

Este guia explica como configurar notificações por e-mail para monitorar falhas no Supabase.

## 🎯 Objetivo

Receber notificações automáticas por e-mail quando:
- ❌ Supabase Preview falhar em um Pull Request
- 🚨 Deploy de produção falhar

## 📋 Pré-requisitos

1. Conta de e-mail do Hostinger
2. Acesso às configurações de Secrets do GitHub

## 🔧 Configuração

### Passo 1: Configurar Secrets no GitHub

1. Acesse: `https://github.com/albertobarcelos/revalya-oficial/settings/secrets/actions`
2. Clique em **"New repository secret"**
3. Adicione os seguintes secrets:

#### `EMAIL_USERNAME`
- **Valor:** Seu e-mail completo do Hostinger (ex: `seu-email@seudominio.com`)
- **Descrição:** E-mail usado para enviar notificações

#### `EMAIL_PASSWORD`
- **Valor:** Senha do seu e-mail do Hostinger
- **Descrição:** Senha para autenticação SMTP

> **ℹ️ Configurações SMTP do Hostinger:**
> - **Servidor:** `smtp.hostinger.com`
> - **Porta:** `465` (SSL) ou `587` (TLS)
> - **Criptografia:** SSL/TLS
> - Use a senha normal da sua conta de e-mail (não precisa de senha de aplicativo)

#### `NOTIFICATION_EMAIL`
- **Valor:** E-mail que receberá as notificações (pode ser o mesmo de `EMAIL_USERNAME`)
- **Descrição:** Destinatário das notificações

### Passo 2: Verificar Workflow

O arquivo `.github/workflows/notify-supabase-failure.yaml` já está configurado para usar **Hostinger** e irá:
- ✅ Monitorar Pull Requests para `main` e `develop`
- ✅ Aguardar o check "Supabase Preview"
- ✅ Enviar e-mail via `smtp.hostinger.com:465` se falhar
- ✅ Monitorar falhas no deploy de produção

### Passo 3: Testar (Opcional)

Para testar se está funcionando:

1. Crie um Pull Request com uma migration inválida
2. Aguarde o Supabase Preview falhar
3. Verifique se recebeu o e-mail

## 📧 Formato das Notificações

### Notificação de PR Falhado
```
Assunto: ❌ Falha no Supabase Preview - PR #73
Conteúdo:
- Número do PR
- Título do PR
- Branch origem → destino
- Autor
- Link para o PR
```

### Notificação de Deploy Produção Falhado
```
Assunto: 🚨 FALHA CRÍTICA: Deploy Produção Supabase - main
Conteúdo:
- Branch
- Commit
- Autor
- Link para logs
- Link para Dashboard Supabase
```

## 🔒 Segurança

- ✅ Secrets são criptografados no GitHub
- ✅ Senhas nunca aparecem nos logs
- ✅ Use senhas de aplicativo (não senhas principais)

## 🛠️ Personalização

### Alterar Servidor SMTP

O workflow está configurado para **Hostinger**. Se precisar alterar, edite `.github/workflows/notify-supabase-failure.yaml`:

```yaml
# Hostinger (atual)
server_address: smtp.hostinger.com
server_port: 465
secure: true

# Gmail (alternativa)
server_address: smtp.gmail.com
server_port: 465

# Outlook (alternativa)
server_address: smtp.office365.com
server_port: 587
```

### Adicionar Mais Destinatários

Edite o campo `to` no workflow:

```yaml
to: ${{ secrets.NOTIFICATION_EMAIL }}, outro-email@exemplo.com
```

### Alterar Timeout

O workflow aguarda até 10 minutos pelo check. Para alterar:

```yaml
timeoutSeconds: 1200  # 20 minutos
```

## 📊 Monitoramento

### Verificar Status

1. Acesse: `https://github.com/albertobarcelos/revalya-oficial/actions`
2. Procure por "Notificar Falhas Supabase"
3. Veja os logs se necessário

### Logs de E-mail

Os logs do workflow mostram:
- ✅ Se o e-mail foi enviado com sucesso
- ❌ Erros de autenticação SMTP
- ⏱️ Tempo de espera do check

## 🐛 Troubleshooting

### E-mail não está chegando

1. **Verifique os Secrets:**
   - `EMAIL_USERNAME` está correto? (formato: `seu-email@seudominio.com`)
   - `EMAIL_PASSWORD` é a senha correta do e-mail Hostinger?
   - `NOTIFICATION_EMAIL` está correto?

2. **Verifique os Logs:**
   - Acesse a aba "Actions" no GitHub
   - Veja os logs do workflow "Notificar Falhas Supabase"
   - Procure por erros de SMTP

3. **Teste SMTP Manualmente:**
   ```bash
   # Use um cliente SMTP para testar
   # Exemplo com telnet (não recomendado para produção)
   ```

### Check não está sendo encontrado

- O nome do check deve ser exatamente **"Supabase Preview"**
- Verifique se o Supabase está configurado corretamente
- Aguarde alguns minutos após criar o PR

### Timeout muito curto

- Aumente `timeoutSeconds` no workflow
- Verifique se o Supabase está processando normalmente

## ✅ Checklist de Configuração

- [ ] Secrets configurados no GitHub:
  - [ ] `EMAIL_USERNAME` (e-mail completo do Hostinger)
  - [ ] `EMAIL_PASSWORD` (senha do e-mail Hostinger)
  - [ ] `NOTIFICATION_EMAIL` (destinatário)
- [ ] Workflow `.github/workflows/notify-supabase-failure.yaml` existe
- [ ] Teste realizado (opcional)
- [ ] E-mail de teste recebido (opcional)

## 📚 Referências

- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Hostinger Email Configuration](https://support.hostinger.com/en/articles/1575756-how-to-get-email-account-configuration-details-for-hostinger-email)
- [action-send-mail](https://github.com/dawidd6/action-send-mail)
- [action-wait-for-check](https://github.com/fountainhead/action-wait-for-check)

