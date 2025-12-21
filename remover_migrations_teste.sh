#!/bin/bash
# Script para remover migrations de teste antes de merge para main
# Execute: bash remover_migrations_teste.sh

echo "🔍 Verificando migrations de teste..."

# Verificar se estamos na branch develop
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "develop" ]; then
    echo "⚠️  ATENÇÃO: Você não está na branch develop!"
    echo "   Branch atual: $CURRENT_BRANCH"
    read -p "Deseja continuar mesmo assim? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 1
    fi
fi

# Migrations de teste para remover
MIGRATIONS_TO_REMOVE=(
    "supabase/migrations/20251220202812_test_fluxo_develop_main.sql"
    "supabase/migrations/20251220224743_rollback_test_fluxo_develop_main.sql"
)

# Migration duplicada (opcional)
MIGRATION_DUPLICATE="supabase/migrations/20251221024436_create_invites_table.sql"

echo ""
echo "📋 Migrations que serão removidas:"
for migration in "${MIGRATIONS_TO_REMOVE[@]}"; do
    if [ -f "$migration" ]; then
        echo "  ❌ $migration"
    else
        echo "  ⚠️  $migration (não encontrada)"
    fi
done

echo ""
read -p "Deseja remover as migrations de teste? (s/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "❌ Operação cancelada."
    exit 0
fi

# Remover migrations de teste
echo ""
echo "🗑️  Removendo migrations de teste..."
for migration in "${MIGRATIONS_TO_REMOVE[@]}"; do
    if [ -f "$migration" ]; then
        git rm "$migration"
        echo "  ✅ Removida: $migration"
    else
        echo "  ⚠️  Não encontrada: $migration"
    fi
done

# Perguntar sobre migration duplicada
echo ""
read -p "Deseja remover a migration duplicada (20251221024436_create_invites_table.sql)? (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    if [ -f "$MIGRATION_DUPLICATE" ]; then
        git rm "$MIGRATION_DUPLICATE"
        echo "  ✅ Removida: $MIGRATION_DUPLICATE"
    else
        echo "  ⚠️  Não encontrada: $MIGRATION_DUPLICATE"
    fi
fi

echo ""
echo "✅ Migrations removidas com sucesso!"
echo ""
echo "📝 Próximos passos:"
echo "   1. git commit -m 'chore: remover migrations de teste antes de merge para main'"
echo "   2. git push origin develop"
echo "   3. Fazer merge para main"
echo ""

