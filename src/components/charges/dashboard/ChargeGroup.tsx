import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChargeGroupProps {
  group: {
    charges: any[];
    color: string;
    label: string;
  };
  groupKey: string;
  onClick: () => void;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export function ChargeGroup({ group, groupKey, onClick, dateRange }: ChargeGroupProps) {
  const totalValue = group.charges.reduce((sum, charge) => sum + (Number(charge.valor) || 0), 0);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`${group.color} rounded-lg p-3 sm:p-4 cursor-pointer`}
      onClick={onClick}
    >
      <h3 className="text-lg sm:text-xl font-semibold text-white">{group.label}</h3>
      <p className="text-2xl sm:text-3xl font-bold text-white mt-1 sm:mt-2">{group.charges.length}</p>
      <p className="text-xs sm:text-sm text-white/90">
        {group.charges.length === 1 ? 'cliente' : 'clientes'}
      </p>
      <div className="mt-3 sm:mt-4 border-t border-white/20 pt-3 sm:pt-4">
        <p className="text-xl sm:text-2xl font-bold text-white">{formatCurrency(totalValue)}</p>
        <p className="text-xs sm:text-sm text-white/90">Total</p>

        {groupKey === 'paid' && dateRange && (
          <div className="mt-3 border-t border-white/20 pt-3">
            <div className="flex items-center justify-between text-white/90 text-xs">
              <Calendar className="h-4 w-4" />
              <span>{format(dateRange.startDate, 'dd/MM/yyyy', { locale: ptBR })} - {format(dateRange.endDate, 'dd/MM/yyyy', { locale: ptBR })}</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
