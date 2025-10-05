// =====================================================
// ASAAS DETAILS MODAL COMPONENT
// Descrição: Modal para exibir detalhes de movimentações ASAAS
// =====================================================

import React from 'react';
import { X, ExternalLink, Calendar, CreditCard, FileText, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ImportedMovement } from '@/types/reconciliation';
import { formatDate } from '../utils/reconciliationHelpers.tsx';

interface AsaasDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  movement: ImportedMovement | null;
}

// AIDEV-NOTE: Modal completo para detalhes ASAAS com informações estruturadas
export const AsaasDetailsModal: React.FC<AsaasDetailsModalProps> = ({
  isOpen,
  onClose,
  movement
}) => {
  if (!movement) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src="/logos/Integrações/asaas.png" alt="Asaas" className="w-5 h-5" />
            Detalhes da Movimentação ASAAS
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute right-4 top-4"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-6">
          {/* AIDEV-NOTE: Informações básicas da movimentação */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Informações Básicas
              </h3>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="font-medium">Valor:</span>
                  <span className="ml-2 font-mono">
                    R$ {movement.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Data:</span>
                  <span className="ml-2">{formatDate(movement.date)}</span>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <Badge 
                    variant={movement.status === 'reconciled' ? 'default' : 'secondary'}
                    className="ml-2"
                  >
                    {movement.status === 'reconciled' ? 'Conciliado' : 'Pendente'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                <User className="h-4 w-4" />
                Cliente
              </h3>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="font-medium">Nome:</span>
                  <span className="ml-2">{movement.customerName || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium">Documento:</span>
                  <span className="ml-2 font-mono">{movement.customerDocument || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* AIDEV-NOTE: Detalhes específicos ASAAS */}
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Detalhes ASAAS
            </h3>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium text-slate-600">Nosso Número:</span>
                  <p className="font-mono mt-1">{movement.externalReference || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Tipo de Cobrança:</span>
                  <p className="mt-1">
                    {movement.description?.includes('PIX') ? 'PIX' : 
                     movement.description?.includes('BOLETO') ? 'BOLETO' : 
                     movement.description?.includes('CARTAO') ? 'CARTÃO' : 'OUTROS'}
                  </p>
                </div>
                {movement.description?.includes('linha:') && (
                  <div className="md:col-span-2">
                    <span className="font-medium text-slate-600">Linha Digitável:</span>
                    <p className="font-mono text-xs mt-1 break-all bg-white p-2 rounded border">
                      {movement.description.split('linha:')[1]?.trim()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AIDEV-NOTE: Histórico de importação */}
          {movement.charge_id && (
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Histórico de Importação
              </h3>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-medium text-slate-600">ID da Cobrança:</span>
                    <p className="font-mono mt-1 text-green-700">{movement.charge_id}</p>
                  </div>
                  <div>
                    <span className="font-medium text-slate-600">Importado em:</span>
                    <p className="mt-1 text-green-700">
                      {movement.imported_at ? formatDate(movement.imported_at) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AIDEV-NOTE: Descrição completa */}
          {movement.description && (
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-700">Descrição Completa</h3>
              <div className="bg-slate-50 p-4 rounded-lg border">
                <p className="text-sm whitespace-pre-wrap">{movement.description}</p>
              </div>
            </div>
          )}

          {/* AIDEV-NOTE: Observações */}
          {movement.observations && (
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-700">Observações</h3>
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-sm">{movement.observations}</p>
              </div>
            </div>
          )}

          {/* AIDEV-NOTE: Ações do modal */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            {movement.externalReference && (
              <Button variant="default" className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Ver no ASAAS
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};