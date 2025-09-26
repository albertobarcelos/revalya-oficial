/**
 * Modal de Sucesso da Importação
 * 
 * Componente responsável por exibir feedback visual elegante
 * após uma importação bem-sucedida de clientes.
 * 
 * @module ImportSuccessModal
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Users, AlertTriangle, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface ImportResult {
  success: any[];
  errors: any[];
}

interface ImportSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: ImportResult | null;
}

export function ImportSuccessModal({ open, onOpenChange, result }: ImportSuccessModalProps) {
  if (!result) return null;

  const hasErrors = result.errors.length > 0;
  const successCount = result.success.length;
  const errorCount = result.errors.length;
  const totalCount = successCount + errorCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="mx-auto mb-4"
          >
            {hasErrors ? (
              <div className="relative">
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
                <AlertTriangle className="h-6 w-6 text-amber-500 absolute -bottom-1 -right-1 bg-white rounded-full" />
              </div>
            ) : (
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            )}
          </motion.div>
          
          <DialogTitle className="text-xl">
            {hasErrors ? 'Importação Parcialmente Concluída' : 'Importação Realizada com Sucesso!'}
          </DialogTitle>
          
          <DialogDescription className="text-center">
            {hasErrors 
              ? `${successCount} de ${totalCount} clientes foram importados com sucesso.`
              : `Todos os ${successCount} clientes foram importados com sucesso.`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Estatísticas */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-2xl font-bold text-green-700">{successCount}</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">Importados</p>
                </CardContent>
              </Card>
            </motion.div>

            {hasErrors && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      <span className="text-2xl font-bold text-amber-700">{errorCount}</span>
                    </div>
                    <p className="text-sm text-amber-600 mt-1">Com Erro</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Lista de erros (se houver) */}
          {hasErrors && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border-amber-200">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="font-medium text-amber-700">Erros Encontrados</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {result.errors.slice(0, 3).map((error, index) => (
                      <div key={index} className="text-sm text-amber-700 bg-amber-50 p-2 rounded">
                        <span className="font-medium">Linha {error.row || index + 1}:</span> {error.message || 'Erro desconhecido'}
                      </div>
                    ))}
                    {result.errors.length > 3 && (
                      <div className="text-sm text-amber-600 text-center">
                        ... e mais {result.errors.length - 3} erros
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Ações */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center space-x-3 pt-4"
          >
            <Button
              onClick={() => onOpenChange(false)}
              className="flex items-center space-x-2"
            >
              <Users className="h-4 w-4" />
              <span>Ver Clientes</span>
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}