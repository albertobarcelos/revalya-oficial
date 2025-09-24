// =====================================================
// ASAAS DETAILS MODAL
// Descrição: Modal de detalhes específico para movimentações ASAAS
// Tecnologias: Shadcn/UI + Tailwind + Motion.dev
// =====================================================

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  X,
  Copy,
  ExternalLink,
  CreditCard,
  QrCode,
  FileText,
  Calendar,
  DollarSign,
  User,
  Hash,
  Banknote
} from 'lucide-react';
import { ImportedMovement, ReconciliationStatus, PaymentStatus } from '@/types/reconciliation';

// AIDEV-NOTE: Interface para props do modal de detalhes ASAAS
interface AsaasDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  movement: ImportedMovement | null;
}

// AIDEV-NOTE: Função para extrair dados específicos do ASAAS da descrição
const extractAsaasData = (movement: ImportedMovement) => {
  const description = movement.description || '';
  
  return {
    nossoNumero: movement.externalReference || 'N/A',
    linhaDigitavel: description.includes('linha:') ? 
      description.split('linha:')[1]?.trim() || 'N/A' : 'N/A',
    tipoCobranca: description.includes('PIX') ? 'PIX' : 
                  description.includes('BOLETO') ? 'BOLETO' : 
                  description.includes('CARTAO') ? 'CARTÃO' : 'OUTROS',
    codigoBarras: description.includes('codigo:') ? 
      description.split('codigo:')[1]?.trim() || 'N/A' : 'N/A',
    valorOriginal: movement.chargeAmount || movement.paidAmount,
    valorPago: movement.paidAmount,
    diferenca: movement.difference || 0
  };
};

// AIDEV-NOTE: Função para formatar moeda
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

// AIDEV-NOTE: Função para formatar data
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// AIDEV-NOTE: Função para copiar texto para clipboard
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('Erro ao copiar:', err);
  }
};

// AIDEV-NOTE: Componente principal do modal
export default function AsaasDetailsModal({ isOpen, onClose, movement }: AsaasDetailsModalProps) {
  if (!movement) return null;

  const asaasData = extractAsaasData(movement);

  // AIDEV-NOTE: Animações do modal seguindo padrão do ReconciliationModal
  const modalVariants = {
    hidden: { 
      opacity: 0,
      scale: 0.95,
      y: 20
    },
    visible: { 
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 300,
        duration: 0.3
      }
    },
    exit: { 
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: {
        duration: 0.2
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative"
            >
              {/* Header */}
              <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <motion.div
                      className="p-2 bg-blue-100 rounded-lg"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <img src="/logos/Integrações/asaas.png" alt="Asaas" className="w-6 h-6" />
                    </motion.div>
                    <div>
                      <DialogTitle className="text-xl font-semibold text-blue-900">
                        Detalhes ASAAS
                      </DialogTitle>
                      <DialogDescription className="text-sm text-blue-700">
                        Movimentação ID: {movement.externalId}
                      </DialogDescription>
                    </div>
                  </div>
                  
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClose}
                      className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </div>
              </DialogHeader>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <motion.div
                    className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Status Pagamento</span>
                    </div>
                    <Badge 
                      variant={movement.paymentStatus === PaymentStatus.PAID ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {movement.paymentStatus === PaymentStatus.PAID ? 'Pago' : 
                       movement.paymentStatus === PaymentStatus.PENDING ? 'Pendente' : 'Vencido'}
                    </Badge>
                  </motion.div>

                  <motion.div
                    className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Conciliação</span>
                    </div>
                    <Badge 
                      variant={movement.reconciliationStatus === ReconciliationStatus.RECONCILED ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {movement.reconciliationStatus === ReconciliationStatus.RECONCILED ? 'Conciliado' : 
                       movement.reconciliationStatus === ReconciliationStatus.PENDING ? 'Pendente' : 'Divergente'}
                    </Badge>
                  </motion.div>

                  <motion.div
                    className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg border border-purple-200"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-800">Tipo</span>
                    </div>
                    <Badge variant="outline" className="text-xs border-purple-300 text-purple-700">
                      {asaasData.tipoCobranca}
                    </Badge>
                  </motion.div>
                </div>

                <Separator />

                {/* Dados Financeiros */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    Dados Financeiros
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Valor Original</span>
                      <p className="text-lg font-semibold text-slate-900">
                        {formatCurrency(asaasData.valorOriginal)}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Valor Pago</span>
                      <p className="text-lg font-semibold text-green-700">
                        {formatCurrency(asaasData.valorPago)}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Diferença</span>
                      <p className={`text-lg font-semibold ${
                        asaasData.diferenca > 0 ? 'text-green-700' : 
                        asaasData.diferenca < 0 ? 'text-red-700' : 'text-slate-700'
                      }`}>
                        {formatCurrency(asaasData.diferenca)}
                      </p>
                    </div>
                  </div>
                </motion.div>

                <Separator />

                {/* Dados ASAAS */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Hash className="h-5 w-5 text-blue-600" />
                    Dados ASAAS
                  </h3>
                  <div className="space-y-4">
                    {/* Nosso Número */}
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div>
                        <span className="text-sm font-medium text-blue-800">Nosso Número</span>
                        <p className="font-mono text-blue-900">{asaasData.nossoNumero}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(asaasData.nossoNumero)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Linha Digitável */}
                    {asaasData.linhaDigitavel !== 'N/A' && (
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex-1">
                          <span className="text-sm font-medium text-green-800">Linha Digitável</span>
                          <p className="font-mono text-xs text-green-900 break-all">
                            {asaasData.linhaDigitavel}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(asaasData.linhaDigitavel)}
                          className="text-green-600 hover:text-green-800 ml-2"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {/* Código de Barras */}
                    {asaasData.codigoBarras !== 'N/A' && (
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex-1">
                          <span className="text-sm font-medium text-purple-800">Código de Barras</span>
                          <p className="font-mono text-xs text-purple-900 break-all">
                            {asaasData.codigoBarras}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(asaasData.codigoBarras)}
                          className="text-purple-600 hover:text-purple-800 ml-2"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>

                <Separator />

                {/* Dados do Cliente */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User className="h-5 w-5 text-slate-600" />
                    Dados do Cliente
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Nome</span>
                      <p className="text-slate-900">{movement.customerName || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Documento</span>
                      <p className="font-mono text-slate-900">{movement.customerDocument || 'N/A'}</p>
                    </div>
                  </div>
                </motion.div>

                <Separator />

                {/* Datas */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-slate-600" />
                    Datas
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {movement.dueDate && (
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm font-medium text-slate-600">Vencimento</span>
                        <p className="text-slate-900">{formatDate(movement.dueDate)}</p>
                      </div>
                    )}
                    {movement.paymentDate && (
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm font-medium text-slate-600">Pagamento</span>
                        <p className="text-slate-900">{formatDate(movement.paymentDate)}</p>
                      </div>
                    )}
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-600">Importação</span>
                      <p className="text-slate-900">{formatDate(movement.importedAt)}</p>
                    </div>
                  </div>
                </motion.div>

                {/* Observações */}
                {movement.observations && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <h3 className="text-lg font-semibold mb-4">Observações</h3>
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm text-yellow-800">{movement.observations}</p>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 pt-0 flex justify-end gap-3">
                <Button variant="outline" onClick={onClose}>
                  Fechar
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver no ASAAS
                </Button>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}