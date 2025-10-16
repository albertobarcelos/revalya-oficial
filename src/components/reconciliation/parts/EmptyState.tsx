// =====================================================
// EMPTY STATE COMPONENT
// Descrição: Estado vazio para a tabela de conciliação
// =====================================================

import React from 'react';
import { FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// AIDEV-NOTE: Componente de estado vazio com mensagem informativa
export const EmptyState: React.FC = () => {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-12 text-center">
        <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-600 mb-2">
          Nenhuma movimentação encontrada
        </h3>
        <p className="text-slate-500">
          Não há movimentações que correspondam aos filtros selecionados.
        </p>
      </CardContent>
    </Card>
  );
};