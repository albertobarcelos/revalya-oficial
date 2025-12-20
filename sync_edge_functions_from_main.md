# Sincronizar Edge Functions do Main (Produção) para Local

## 📋 Objetivo

Extrair todas as Edge Functions do ambiente **main** (produção) e sincronizar com o ambiente local, garantindo que estejam 100% idênticas.

## 🚀 Método Recomendado: Supabase CLI

### Passo 1: Conectar ao projeto Main (Produção)

```bash
# Conectar ao projeto de produção
supabase link --project-ref <project-ref-main>

# OU se já estiver conectado, trocar para main
supabase projects list
supabase link --project-ref <project-ref-main>
```

### Passo 2: Fazer Pull das Edge Functions

```bash
# Fazer pull de todas as Edge Functions
supabase functions list

# Para cada function, fazer pull (se o CLI suportar)
# OU fazer download manual via Dashboard
```

## 🔄 Método Alternativo: Download Manual via Dashboard

1. Acesse: https://supabase.com/dashboard/project/<project-ref-main>/functions
2. Para cada Edge Function:
   - Clique na function
   - Copie o código
   - Salve no local: `supabase/functions/<nome-da-function>/index.ts`

## 📥 Script Automatizado (via Supabase API)

Criando script para fazer download automático...

