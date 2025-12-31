import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { PaginationFooter } from '@/components/layout/PaginationFooter';
import { RecebimentosAdvancedFilters } from '@/components/recebimentos/RecebimentosAdvancedFilters';
import { RecebimentosTable } from '@/components/recebimentos/RecebimentosTable';
import { RecebimentosByCustomer } from '@/components/recebimentos/RecebimentosByCustomer';
import { RecebimentosTotalsRow } from '@/components/recebimentos/RecebimentosTotalsRow';
import { EditRecebimentoModal } from '@/components/recebimentos/edit-modal/EditRecebimentoModal';
import { RecebimentosHeader } from '@/components/recebimentos/RecebimentosHeader';
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';
import type { FinanceEntry } from '@/services/financeEntriesService';
import type { RecebimentosFilters } from '@/components/recebimentos/types';

import { useRecebimentosFilters } from './recebimentos/hooks/useRecebimentosFilters';
import { useRecebimentosData } from './recebimentos/hooks/useRecebimentosData';
import { useRecebimentosExport } from './recebimentos/hooks/useRecebimentosExport';
import { useFinanceIcon } from './recebimentos/hooks/useFinanceIcon';

const Recebimentos: React.FC = () => {
  // 🛡️ VALIDAÇÃO DE ACESSO OBRIGATÓRIA (CAMADA 1)
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard();
  
  // 🔍 AUDIT LOG OBRIGATÓRIO - Acesso à página
  useEffect(() => {
    if (hasAccess && currentTenant) {
      console.log(`🔍 [AUDIT] Página Recebimentos acessada - Tenant: ${currentTenant.name} (${currentTenant.id})`);
    }
  }, [hasAccess, currentTenant]);
  
  // Hooks customizados
  const { 
    filters, setFilters, 
    pagination, setPagination, 
    showFilters, setShowFilters, 
    handlePageChange,
    resetFilters
  } = useRecebimentosFilters();

  const {
    recebimentos,
    recebimentosData,
    totals,
    isLoading,
    refetch,
    bankAccountsQuery,
    bankLabelById,
    markAsPaid,
    associateBankAccount,
    selectingEntryId,
    setSelectingEntryId
  } = useRecebimentosData(filters, hasAccess, currentTenant);

  const tableRef = useRef<HTMLDivElement | null>(null);
  const { handleExportCSV, handleExportPDF } = useRecebimentosExport(recebimentos, bankLabelById, tableRef);
  const iconHtml = useFinanceIcon();

  // Estado local para modal de edição
  const [editOpen, setEditOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<FinanceEntry | null>(null);
  const [viewMode, setViewMode] = useState<'recebimentos' | 'clientes'>('recebimentos');

  const handleEdit = (entry: FinanceEntry) => {
    setEditEntry(entry);
    setEditOpen(true);
  };

  // Atualizar paginação quando dados mudam
  useEffect(() => {
    if (recebimentosData) {
      setPagination({
        total: recebimentosData.total,
        page: recebimentosData.page,
        limit: recebimentosData.limit,
        totalPages: recebimentosData.totalPages
      });
    }
  }, [recebimentosData, setPagination]);

  // Formatação de moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleApplyFilters = (newFilters: RecebimentosFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  };

  // 🚨 GUARD CLAUSE OBRIGATÓRIA
  if (!hasAccess) {
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

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col h-full p-4 md:p-6 pt-4 pb-0">
        <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <CardHeader>
            <RecebimentosHeader
              filters={filters}
              setFilters={setFilters}
              showFilters={showFilters}
              setShowFilters={setShowFilters}
              onExportCSV={handleExportCSV}
              onExportPDF={handleExportPDF}
              onNewRecebimento={() => {
                setEditEntry(null); // Assuming new entry starts empty
                setEditOpen(true);
              }}
              viewMode={viewMode}
              setViewMode={setViewMode}
            />

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <RecebimentosAdvancedFilters
                    filters={filters}
                    onApplyFilters={handleApplyFilters}
                    onReset={resetFilters}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </CardHeader>
          
          <CardContent className="pt-0 p-0 flex flex-col flex-1 min-h-0">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div ref={tableRef} className="rounded-md border flex-1 flex flex-col min-h-0">
                {recebimentos.length === 0 ? (
                  <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-12 px-4 empty-icon">
                    {iconHtml ? (
                      <div dangerouslySetInnerHTML={{ __html: iconHtml }} className="mb-4 w-[260px] md:w-[320px] mx-auto" />
                    ) : null}
                    <div className="text-center text-muted-foreground">
                      <p className="text-body font-medium">Nenhum {filters.type === 'RECEIVABLE' ? 'recebimento' : 'despesa'} encontrado</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 overflow-auto min-h-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
                      {viewMode === 'recebimentos' ? (
                        <RecebimentosTable
                          recebimentos={recebimentos}
                          bankLabelById={bankLabelById}
                          selectingEntryId={selectingEntryId}
                          setSelectingEntryId={setSelectingEntryId}
                          bankAccounts={(bankAccountsQuery.data || []) as any}
                          bankAccountsLoading={bankAccountsQuery.isLoading}
                          onAssociateBankAccount={associateBankAccount}
                          onMarkAsPaid={markAsPaid}
                          onEdit={handleEdit}
                          formatCurrency={formatCurrency}
                        />
                      ) : (
                        <div className="p-4">
                          <RecebimentosByCustomer
                            recebimentos={recebimentos}
                            formatCurrency={formatCurrency}
                            onEdit={handleEdit}
                          />
                        </div>
                      )}
                    </div>
                    {viewMode === 'recebimentos' && <RecebimentosTotalsRow totals={totals} />}
                  </>
                )}
              </div>
            )}
          </CardContent>

          {!isLoading && pagination.total > 0 && (
            <div className="flex-shrink-0 border-t">
              <PaginationFooter
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
                itemsPerPage={pagination.limit}
                onPageChange={handlePageChange}
                onItemsPerPageChange={(perPage) => setFilters((prev) => ({ ...prev, limit: perPage, page: 1 }))}
              />
            </div>
          )}
        </Card>
      </motion.div>

      <EditRecebimentoModal
        open={editOpen}
        onOpenChange={setEditOpen}
        entry={editEntry}
        onSave={() => refetch()}
      />
    </Layout>
  );
};

export default Recebimentos;
