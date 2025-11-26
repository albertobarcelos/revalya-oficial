import React, { useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Banknote, FileText, Settings, Landmark } from 'lucide-react';
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import { ExpenseCategoriesSection } from '@/components/finance/parts/ExpenseCategoriesSection';
import { DocumentTypesSection } from '@/components/finance/parts/DocumentTypesSection';
import { LaunchTypesSection } from '@/components/finance/parts/LaunchTypesSection';
import { BankAccountsSection } from '@/components/finance/parts/BankAccountsSection';

/**
 * Página de Configurações Financeiras com três abas:
 * 1) Categoria de Despesas, 2) Tipo de Documentos, 3) Tipo de Lançamento.
 * Comentário de nível de função: estrutura inicial apenas em memória;
 * integração com Supabase pode ser adicionada depois mantendo o mesmo layout.
 */
type FinanceSettingsProps = { tenantId?: string };

function FinanceSettingsContent(props?: FinanceSettingsProps) {
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  const effectiveTenantId = props?.tenantId || currentTenant?.id;
  const effectiveHasAccess = props?.tenantId ? true : hasAccess;

  if (!effectiveHasAccess) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="text-center py-8">
            <h1 className="text-2xl font-bold text-destructive mb-4">Acesso Negado</h1>
            <p className="text-muted-foreground">{accessError}</p>
          </div>
        </div>
      </Layout>
    );
  }

  const tabs = useMemo(() => ([
    { key: 'categorias', label: 'Categoria de Despesas' },
    { key: 'documentos', label: 'Tipo de Documentos' },
    { key: 'lancamentos', label: 'Tipo de Lançamento' },
    { key: 'contas', label: 'Contas Bancárias' },
  ]), []);
  const [activeTab, setActiveTab] = useState<string>(tabs[0].key);

  const embedded = !!props?.tenantId;
  const wrapperClass = embedded ? "space-y-4 mt-2 h-[calc(100vh-240px)] overflow-auto pr-2" : "container mx-auto p-6 space-y-6";
  return (
    <div className={wrapperClass}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="justify-start">
          <TabsTrigger value="categorias" className="flex items-center gap-2">
            <Banknote className="h-4 w-4" />
            Categoria de Despesas
          </TabsTrigger>
          <TabsTrigger value="documentos" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Tipo de Documentos
          </TabsTrigger>
          <TabsTrigger value="lancamentos" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Tipo de Lançamento
          </TabsTrigger>
          <TabsTrigger value="contas" className="flex items-center gap-2">
            <Landmark className="h-4 w-4" />
            Contas Bancárias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categorias" className="space-y-4 mt-2">
          <ExpenseCategoriesSection tenantId={effectiveTenantId} />
        </TabsContent>

        <TabsContent value="documentos" className="space-y-4 mt-2">
          <DocumentTypesSection tenantId={effectiveTenantId} />
        </TabsContent>

        <TabsContent value="lancamentos" className="space-y-4 mt-2">
          <LaunchTypesSection tenantId={effectiveTenantId} />
        </TabsContent>

        <TabsContent value="contas" className="space-y-4 mt-2">
          <BankAccountsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function FinanceSettings() {
  return (
    <Layout>
      <FinanceSettingsContent />
    </Layout>
  );
}

export function FinanceSettingsEmbedded({ tenantId }: { tenantId: string }) {
  return <FinanceSettingsContent tenantId={tenantId} />;
}
