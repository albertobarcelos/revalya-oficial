import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { motion } from 'framer-motion';
import type { Cobranca } from '@/types/database';

// AIDEV-NOTE: Interface para grupo de cobranças
interface ChargeGroup {
  charges: Cobranca[];
  color: string;
  label: string;
  daysUntilDue: number;
}

interface ChargeGroupCardProps {
  groupKey: string;
  group: ChargeGroup;
  selectedCharges: string[];
  onGroupClick: (groupKey: string) => void;
  onChargeSelect: (chargeId: string) => void;
}

// AIDEV-NOTE: Componente para exibir cartão de grupo de cobranças
export function ChargeGroupCard({ 
  groupKey, 
  group, 
  selectedCharges, 
  onGroupClick, 
  onChargeSelect 
}: ChargeGroupCardProps) {
  const totalValue = group.charges.reduce((sum, charge) => sum + (charge.valor || 0), 0);
  const selectedCount = group.charges.filter(charge => 
    selectedCharges.includes(charge.id)
  ).length;
  const isAllSelected = selectedCount === group.charges.length && group.charges.length > 0;
  const isPartiallySelected = selectedCount > 0 && selectedCount < group.charges.length;

  // AIDEV-NOTE: Função para obter ícone baseado no status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return '✓';
      case 'overdue':
        return '⚠';
      case 'today':
        return '📅';
      case 'pending':
        return '⏳';
      default:
        return '📄';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader 
          className="pb-3"
          onClick={() => onGroupClick(groupKey)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: group.color }}
              />
              <CardTitle className="text-lg flex items-center gap-2">
                <span>{getStatusIcon(groupKey)}</span>
                {group.label}
              </CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isPartiallySelected;
                }}
                onCheckedChange={() => onGroupClick(groupKey)}
                onClick={(e) => e.stopPropagation()}
              />
              <Badge variant="secondary">
                {group.charges.length}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            {/* Valor Total */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Valor Total:</span>
              <span className="font-semibold text-lg">{formatCurrency(totalValue)}</span>
            </div>
            
            {/* Informações adicionais */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Selecionadas:</span>
                <span className="ml-1 font-medium">{selectedCount}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Dias p/ venc.:</span>
                <span className="ml-1 font-medium">
                  {group.daysUntilDue > 0 ? `+${group.daysUntilDue}` : group.daysUntilDue}
                </span>
              </div>
            </div>
            
            {/* Barra de progresso de seleção */}
            {selectedCount > 0 && (
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <motion.div 
                    className="bg-blue-500 h-1.5 rounded-full" 
                    initial={{ width: 0 }}
                    animate={{ width: `${(selectedCount / group.charges.length) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedCount} de {group.charges.length} selecionadas
                </p>
              </div>
            )}
            
            {/* Lista de cobranças (primeiras 3) */}
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {group.charges.slice(0, 3).map((charge) => (
                <motion.div
                  key={charge.id}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                  whileHover={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
                >
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedCharges.includes(charge.id)}
                      onCheckedChange={() => onChargeSelect(charge.id)}
                    />
                    <span className="truncate max-w-[120px]">
                      {charge.customer?.nome || 'Cliente não informado'}
                    </span>
                  </div>
                  <span className="font-medium">
                    {formatCurrency(charge.valor || 0)}
                  </span>
                </motion.div>
              ))}
              
              {group.charges.length > 3 && (
                <div className="text-center text-xs text-muted-foreground py-1">
                  +{group.charges.length - 3} cobranças
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}