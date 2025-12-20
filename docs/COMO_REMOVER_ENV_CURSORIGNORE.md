# Como Remover `.env` do `.cursorignore`

## 📋 Situação Atual

O arquivo `.cursorignore` não existe na raiz do projeto. Se você precisa criar ou modificar este arquivo, siga as instruções abaixo.

## 🔧 Como Remover `.env` do `.cursorignore`

### Opção 1: Se o arquivo `.cursorignore` já existe

1. Abra o arquivo `.cursorignore` na raiz do projeto
2. Localize a linha que contém `.env`
3. **Remova a linha** ou **comente** com `#`:
   ```
   # .env  (comentado - não será mais ignorado)
   ```
4. Salve o arquivo

### Opção 2: Se o arquivo `.cursorignore` não existe

Se o arquivo não existe, você pode criar um novo arquivo `.cursorignore` na raiz do projeto. Se você **não incluir** `.env` nele, o arquivo `.env` não será ignorado pelo Cursor.

**Exemplo de `.cursorignore` sem `.env`:**
```
node_modules/
dist/
build/
*.log
.DS_Store
```

## ⚠️ Importante: Diferença entre `.gitignore` e `.cursorignore`

- **`.gitignore`**: Controla quais arquivos o Git ignora (não faz commit)
- **`.cursorignore`**: Controla quais arquivos o Cursor AI ignora ao indexar o projeto

Atualmente, o `.env` está no `.gitignore` (linha 12), o que é **correto** para segurança. Você pode querer que o Cursor **veja** o `.env` para ajudar com configurações, mas isso **não significa** que ele deve ser commitado no Git.

## 🛡️ Recomendação de Segurança

**NÃO remova `.env` do `.gitignore** - arquivos `.env` contêm credenciais sensíveis e nunca devem ser commitados no Git.

Se você quer que o Cursor veja o `.env` para ajudar com configurações:
1. Mantenha `.env` no `.gitignore` ✅
2. **Não inclua** `.env` no `.cursorignore` (ou remova se estiver lá)

## 📝 Criar `.cursorignore` (se necessário)

Se você quiser criar um arquivo `.cursorignore` personalizado, pode usar este template:

```
# Dependências
node_modules/
.pnp
.pnp.js

# Build outputs
dist/
build/
out/

# Logs
*.log
logs/

# Cache
.cache/
.parcel-cache/
.vite/

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Supabase local
.supabase/
```

**Note**: `.env` não está na lista acima, então o Cursor poderá ver e indexar o arquivo `.env`.

