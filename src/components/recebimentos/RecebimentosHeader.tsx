import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Filter, Download, FileText, Plus } from 'lucide-react';
import type { RecebimentosFilters } from './types';

interface RecebimentosHeaderProps {
  filters: RecebimentosFilters;
  setFilters: React.Dispatch<React.SetStateAction<RecebimentosFilters>>;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
  onNewRecebimento: () => void;
  viewMode: 'recebimentos' | 'clientes';
  setViewMode: (mode: 'recebimentos' | 'clientes') => void;
}

export function RecebimentosHeader({
  filters,
  setFilters,
  showFilters,
  setShowFilters,
  onExportCSV,
  onExportPDF,
  onNewRecebimento,
  viewMode,
  setViewMode
}: RecebimentosHeaderProps) {
  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col sm:flex-row items-end justify-between gap-4">
        <div className="flex items-end gap-2 flex-1 w-full">
          <div className="space-y-2 w-full sm:w-[35%]">
            <Label htmlFor="search">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Busque por detalhes..."
                value={filters.search}
                onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                className="pl-8 w-full h-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="opacity-0 hidden sm:block">Filtros</Label>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={`gap-2 h-10 ${showFilters ? 'bg-secondary' : ''}`}
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
            </Button>
          </div>
          <div className="space-y-2">
            <Label className="opacity-0 hidden sm:block">Visualização</Label>
            <div className="flex items-center gap-2 h-10">
              <Button
                variant={viewMode === 'recebimentos' ? 'default' : 'outline'}
                onClick={() => setViewMode('recebimentos')}
                className={`h-10 ${viewMode === 'recebimentos' ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
                size="sm"
              >
                Recebimentos
              </Button>
              <Button
                variant={viewMode === 'clientes' ? 'default' : 'outline'}
                onClick={() => setViewMode('clientes')}
                className={`h-10 ${viewMode === 'clientes' ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
                size="sm"
              >
                Clientes
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end pt-2 sm:pt-0">
          <div className="space-y-2">
            <Label className="opacity-0 hidden sm:block">Exportar</Label>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={onExportCSV} title="Exportar CSV">
                <FileText className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={onExportPDF} title="Exportar PDF">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="opacity-0 hidden sm:block">Novo</Label>
            <Button onClick={onNewRecebimento} className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo Recebimento</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
