// =====================================================
// LOADING STATE COMPONENT
// Descrição: Estado de carregamento para a tabela de conciliação
// =====================================================

import React from 'react';
import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// AIDEV-NOTE: Componente de loading com skeleton consistente
export const LoadingState: React.FC = () => {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Movimentações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((index) => (
            <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <div className="flex gap-2 ml-auto">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};