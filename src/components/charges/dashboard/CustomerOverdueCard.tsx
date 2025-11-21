import { format, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertTriangle } from 'lucide-react';
import type { CustomerOverdueGroup } from '@/utils/chargeGrouping';
import type { Cobranca } from '@/types/database';

// AIDEV-NOTE: Interface para props do componente de card de cobranças vencidas por cliente
interface CustomerOverdueCardProps {
  group: CustomerOverdueGroup;
  isSelected: boolean;
  onToggle: (checked: boolean) => void;
  onViewCharge: (charge: Cobranca) => void;
}

// AIDEV-NOTE: Componente de card para exibir cobranças vencidas relacionadas de um cliente
export function CustomerOverdueCard({
  group,
  isSelected,
  onToggle,
  onViewCharge
}: CustomerOverdueCardProps) {
  return (
    <Card className={`border-2 transition-all ${
      isSelected 
        ? 'border-red-500 bg-red-50 shadow-md' 
        : 'border-red-200 hover:border-red-300 bg-white'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggle}
              className="mt-1"
            />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <h4 className="font-semibold text-sm text-gray-900">
                  {group.customerName}
                </h4>
                {group.customerCompany && (
                  <Badge variant="outline" className="text-xs">
                    {group.customerCompany}
                  </Badge>
                )}
              </div>
              
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="font-medium">{group.overdueCharges.length}</span>
                    <span>cobrança(s) vencida(s)</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="font-medium">{group.daysSinceOldest}</span>
                    <span>dias desde a mais antiga</span>
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-red-600">
                    R$ {group.totalOverdueValue.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                  <Badge variant="destructive" className="text-xs">
                    Total Vencido
                  </Badge>
                </div>
              </div>
              
              {/* Lista compacta das cobranças */}
              <div className="mt-3 space-y-1">
                {group.overdueCharges.slice(0, 3).map((charge) => (
                  <div 
                    key={charge.id}
                    className="flex items-center justify-between text-xs p-2 bg-white rounded border border-red-100 cursor-pointer hover:bg-red-50 transition-colors"
                    onClick={() => onViewCharge(charge)}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-red-500 flex-shrink-0" />
                      <span className="text-gray-700">
                        {format(parseISO(charge.data_vencimento), 'dd/MM/yyyy')}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">
                      R$ {(charge.valor || 0).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </span>
                  </div>
                ))}
                {group.overdueCharges.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{group.overdueCharges.length - 3} cobrança(s) adicional(is)
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}



