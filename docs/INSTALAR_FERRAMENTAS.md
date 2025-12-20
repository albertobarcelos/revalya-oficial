# 🛠️ Instalar Ferramentas Necessárias

Antes de copiar o banco de produção, você precisa instalar estas ferramentas:

## ✅ 1. Supabase CLI (Obrigatório) ⭐

**Você NÃO precisa instalar PostgreSQL!** O Supabase CLI faz tudo sozinho.

## ✅ 1. Supabase CLI (Obrigatório) ⭐

### Opção A: Via Scoop (Mais Fácil)

1. **Instalar Scoop (se não tiver):**
   ```powershell
   # Execute no PowerShell (como Administrador)
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
   ```

2. **Instalar Supabase CLI:**
   ```powershell
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   ```

3. **Verificar:**
   ```powershell
   supabase --version
   ```

### Opção B: Download Manual

1. **Baixar:**
   - Acesse: https://github.com/supabase/cli/releases
   - Baixe: `supabase_windows_amd64.zip` (versão mais recente)

2. **Extrair:**
   - Extraia o ZIP
   - Copie `supabase.exe` para uma pasta no PATH
   - Exemplo: `C:\Users\[seu-usuario]\bin` ou `C:\Program Files\Supabase`

3. **Adicionar ao PATH:**
   - Adicione a pasta ao PATH do Windows
   - Reinicie o terminal

4. **Verificar:**
   ```powershell
   supabase --version
   ```

### Opção C: Usar via npx (Temporário)

Se você só precisa fazer isso uma vez:

```powershell
# Não precisa instalar, mas precisa npm
npx supabase --version
```

**⚠️ Nota:** Com npx, use `npx supabase` ao invés de apenas `supabase` nos comandos.

---

## ✅ 2. Docker Desktop (Já Instalado ✅)

Você já tem Docker instalado! Certifique-se apenas de que está rodando:
- Abra o Docker Desktop
- Aguarde até aparecer "Docker Desktop is running"

---

## 🧪 Testar Todas as Instalações

Execute estes comandos em um **novo terminal PowerShell**:

```powershell
# Testar Supabase CLI
supabase --version

# Testar Docker
docker --version
```

**✅ Não precisa testar PostgreSQL!** O Supabase CLI faz tudo.

Se todos os comandos funcionarem, você está pronto! 🎉

---

## 🚀 Próximo Passo

Depois de instalar o Supabase CLI:

1. **Fazer login:**
   ```powershell
   supabase login
   ```

2. **Linkar ao projeto:**
   ```powershell
   supabase link --project-ref wyehpiutzvwplllumgdk
   ```

3. **Executar o script:**
   ```powershell
   cd D:\DESENVOLVIMENTO\revalya-oficial
   .\scripts\executar-copia-producao.ps1 -Login -Link
   ```

   Ou se já fez login e linkou:
   ```powershell
   .\scripts\executar-copia-producao.ps1
   ```

---

## ❓ Problemas Comuns

### "Supabase CLI não encontrado"

**Solução:**
- Se instalou via Scoop: reinicie o terminal
- Se instalou manualmente: verifique se adicionou ao PATH
- Use `npx supabase` como alternativa temporária

### Docker não está rodando

**Solução:**
- Abra o Docker Desktop
- Aguarde até aparecer "Docker Desktop is running"
- Verifique: `docker ps`

---

## 📚 Links Úteis

- PostgreSQL: https://www.postgresql.org/download/windows/
- Supabase CLI: https://github.com/supabase/cli/releases
- Scoop: https://scoop.sh/
- Docker Desktop: https://www.docker.com/products/docker-desktop
