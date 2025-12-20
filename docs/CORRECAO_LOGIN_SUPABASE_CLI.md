# 🔧 Correção: Comando de Login do Supabase CLI

## 🐛 Problema

O workflow estava falhando com o erro:
```
unknown flag: --token-stdin
```

## ✅ Solução

A flag `--token-stdin` não existe na versão atual do Supabase CLI. O comando correto é usar `--token` diretamente.

### Antes (Incorreto):
```yaml
- name: Autenticar no Supabase
  run: |
    echo "$SUPABASE_ACCESS_TOKEN" | supabase login --token-stdin
```

### Depois (Correto):
```yaml
- name: Autenticar no Supabase
  run: |
    supabase login --token "$SUPABASE_ACCESS_TOKEN"
```

## 📝 Arquivos Corrigidos

1. ✅ `.github/workflows/supabase-development.yml`
2. ✅ `.github/workflows/supabase-production.yml`

## 🔍 Verificação

O comando `supabase login --help` mostra:
```
--token string   Use provided token instead of automatic login flow
```

Portanto, a sintaxe correta é `--token <valor>` e não `--token-stdin`.

---

**Última atualização:** 2025-01-19

