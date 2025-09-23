/**
 * AIDEV-NOTE: Componente para exibir lista de itens cobrados extraídos da descrição
 * Utiliza design moderno com Shadcn/UI + Tailwind e microinterações com Motion
 */

import { motion } from 'framer-motion';
import { Package, Hash, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { parseChargeDescription, type ChargeItem } from '@/utils/chargeUtils';

interface ChargeItemsListProps {
  description: string;
  className?: string;
}

/**
 * AIDEV-NOTE: Componente principal que exibe os itens cobrados
 * Extrai automaticamente os itens da descrição e os apresenta de forma organizada
 */
export function ChargeItemsList({ description, className = '' }: ChargeItemsListProps) {
  const items = parseChargeDescription(description);

  if (items.length === 0) {
    return (
      <Card className={`border-dashed border-gray-300 ${className}`}>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Package className="h-12 w-12 text-gray-400 mb-3" />
          <p className="text-sm text-gray-500">
            Nenhum item específico identificado na descrição
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {description}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card className="border-blue-200 shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <Package className="h-5 w-5 text-blue-600" />
            Itens Cobrados
            <Badge variant="secondary" className="ml-auto">
              {items.length} {items.length === 1 ? 'item' : 'itens'}
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {items.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.1 }}
              className="group"
            >
              <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-200">
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-200">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {item.name}
                    </h4>
                    {item.description && item.description !== item.name && (
                      <p className="text-sm text-gray-500 truncate">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 group-hover:bg-white transition-colors duration-200">
                    <Hash className="h-3 w-3 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">
                      {item.quantity}x
                    </span>
                  </div>
                </div>
              </div>
              
              {index < items.length - 1 && (
                <Separator className="my-2 opacity-50" />
              )}
            </motion.div>
          ))}
          
          {/* AIDEV-NOTE: Rodapé com informações adicionais */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="mt-4 pt-3 border-t border-gray-100"
          >
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Total de itens: {items.reduce((sum, item) => sum + item.quantity, 0)}</span>
              <span>Extraído automaticamente da descrição</span>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default ChargeItemsList;