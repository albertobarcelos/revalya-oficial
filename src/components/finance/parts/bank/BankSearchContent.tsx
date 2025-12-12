import React, { useMemo, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

export type BankItem = { shortName: string; longName: string; compe: string; ispb: string };

export function BankSearchContent({ banks, onSelect }: { banks: BankItem[]; onSelect: (b: BankItem) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return banks;
    return banks.filter(b =>
      b.shortName.toLowerCase().includes(term) ||
      b.longName.toLowerCase().includes(term) ||
      b.compe.toLowerCase().includes(term) ||
      b.ispb.toLowerCase().includes(term)
    );
  }, [searchTerm, banks]);

  const totalPages = Math.ceil(filtered.length / limit) || 1;
  const start = (page - 1) * limit;
  const slice = filtered.slice(start, start + limit);

  useEffect(() => { setPage(1); }, [searchTerm]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex gap-3 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nome, COMPE ou ISPB" className="pl-10" />
        </div>
      </div>
      <Separator className="my-3" />
      <div className="flex-1 overflow-y-auto">
        {slice.map((b) => (
          <div key={`${b.ispb}-${b.compe}`} onClick={() => onSelect(b)} className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="font-medium truncate">{b.shortName}</div>
                <div className="text-xs text-muted-foreground truncate">{b.longName}</div>
              </div>
              <div className="text-xs text-muted-foreground">
                <span className="mr-3">COMPE: {b.compe || '-'}</span>
                <span>ISPB: {b.ispb || '-'}</span>
              </div>
            </div>
          </div>
        ))}
        {slice.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">Nenhum banco encontrado</div>
        )}
      </div>
      <Separator className="my-3" />
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Mostrando {filtered.length === 0 ? 0 : start + 1} a {Math.min(start + limit, filtered.length)} de {filtered.length}</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="flex items-center gap-1">
            Próximo
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
