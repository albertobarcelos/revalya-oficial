import React from 'react';
import { Search, Filter, X, Calendar, DollarSign, User, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// AIDEV-NOTE: Interface para os filtros do Kanban
export interface KanbanFilters {
  search: string;
  status: string;
  minValue: string;
  maxValue: string;
  dateRange: string;
  client: string;
}

interface KanbanFiltersProps {
  filters: KanbanFilters;
  onFilterChange: (filters: KanbanFilters) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

/**
 * AIDEV-NOTE: Componente de filtros para o Kanban de Faturamento
 * Permite filtrar por cliente, valor, período e status
 * Inclui busca textual e filtros avançados
 */
export function KanbanFilters({
  filters,
  onFilterChange,
  onClearFilters,
  hasActiveFilters
}: KanbanFiltersProps) {
  
  // AIDEV-NOTE: Estado local para controlar expansão dos filtros
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  // AIDEV-NOTE: Função para alternar expansão
  const toggleExpanded = () => setIsExpanded(!isExpanded);

  // AIDEV-NOTE: Verificar quantidade de filtros ativos
  // Considera 'all' como valor inativo para status e dateRange
  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'status' || key === 'dateRange') {
      return value !== '' && value !== 'all';
    }
    return value !== '';
  }).length;

  return (
    <Card className="mb-6 border-2 border-blue-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/30 shadow-lg">
      <CardContent className="p-4">
        {/* AIDEV-NOTE: Barra superior com busca e toggle de filtros - Responsiva */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por cliente, contrato ou valor..."
              value={filters.search}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
              className="pl-10 border-2 border-blue-200 focus:border-blue-400 bg-white/80 backdrop-blur-sm"
            />
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={toggleExpanded}
              className={cn(
                "flex items-center space-x-2 border-2 transition-all duration-200 flex-1 sm:flex-none justify-center",
                isExpanded 
                  ? "border-blue-300 bg-blue-100 text-blue-700" 
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              )}
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
              <span className="sm:hidden">Filtrar</span>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 bg-blue-600 text-white">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="text-gray-500 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
              >
                <X className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Limpar</span>
              </Button>
            )}
          </div>
        </div>

        {/* AIDEV-NOTE: Indicador de filtros ativos - Responsivo */}
        {hasActiveFilters && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
            <span className="text-xs text-gray-500 flex-shrink-0">Filtros ativos:</span>
            <div className="flex flex-wrap gap-1">
              {filters.search && (
                <Badge variant="outline" className="text-xs">
                  Busca: {filters.search.length > 8 ? filters.search.substring(0, 8) + '...' : filters.search}
                </Badge>
              )}
              {filters.status && (
                <Badge variant="outline" className="text-xs">
                  Status: {filters.status}
                </Badge>
              )}
              {(filters.minValue || filters.maxValue) && (
                <Badge variant="outline" className="text-xs">
                  Valor: R$ {filters.minValue || '0'} - R$ {filters.maxValue || '∞'}
                </Badge>
              )}
              {filters.dateRange && (
                <Badge variant="outline" className="text-xs">
                  Período: {filters.dateRange}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* AIDEV-NOTE: Filtros avançados (expansível) */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-4 border-t border-blue-200">
                {/* AIDEV-NOTE: Filtro por status */}
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <FileText className="h-4 w-4 mr-1" />
                    Status
                  </label>
                  <Select
                  value={filters.status}
                  onValueChange={(value) => onFilterChange({ ...filters, status: value })}
                >
                  <SelectTrigger className="border-2 border-gray-200 focus:border-blue-400">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="faturar-hoje">Faturar Hoje</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="faturados">Faturados</SelectItem>
                    <SelectItem value="renovar">Renovar</SelectItem>
                  </SelectContent>
                </Select>
                </div>

                {/* AIDEV-NOTE: Filtro por valor mínimo */}
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <DollarSign className="h-4 w-4 mr-1" />
                    Valor Mínimo
                  </label>
                  <Input
                    type="number"
                    placeholder="Valor mínimo"
                    value={filters.minValue || ''}
                    onChange={(e) => onFilterChange({ ...filters, minValue: e.target.value })}
                    className="border-2 border-gray-200 focus:border-blue-400 bg-white/80"
                  />
                </div>

                {/* AIDEV-NOTE: Filtro por valor máximo */}
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <DollarSign className="h-4 w-4 mr-1" />
                    Valor Máximo
                  </label>
                  <Input
                    type="number"
                    placeholder="Valor máximo"
                    value={filters.maxValue || ''}
                    onChange={(e) => onFilterChange({ ...filters, maxValue: e.target.value })}
                    className="border-2 border-gray-200 focus:border-blue-400 bg-white/80"
                  />
                </div>

                {/* AIDEV-NOTE: Filtro por período */}
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <Calendar className="h-4 w-4 mr-1" />
                    Período
                  </label>
                  <Select
                    value={filters.dateRange}
                    onValueChange={(value) => onFilterChange({ ...filters, dateRange: value })}
                  >
                    <SelectTrigger className="border-2 border-gray-200 bg-white/80">
                      <SelectValue placeholder="Todos os períodos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os períodos</SelectItem>
                      <SelectItem value="hoje">Hoje</SelectItem>
                      <SelectItem value="esta-semana">Esta Semana</SelectItem>
                      <SelectItem value="este-mes">Este Mês</SelectItem>
                      <SelectItem value="proximo-mes">Próximo Mês</SelectItem>
                      <SelectItem value="vencidos">Vencidos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}