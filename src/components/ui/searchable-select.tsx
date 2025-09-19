"use client"

import React, { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Check, ChevronDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverContentModal,
  PopoverTrigger,
} from "@/components/ui/popover"
import { clientsService } from "@/services/clientsService"
import { useDebounce } from "@/hooks/useDebounce"
import { useTenantAccessGuard } from "@/hooks/templates/useSecureTenantQuery"

interface Option {
  value: string
  label: string
}

interface SearchableSelectProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  initialOptions?: Option[]
  inModal?: boolean
}

export function SearchableSelect({ 
  value, 
  onChange, 
  placeholder = "Selecione uma opção...", 
  initialOptions = [],
  inModal = false
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebounce(searchQuery, 300)
  const [options, setOptions] = useState<Option[]>(initialOptions)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // 🛡️ VALIDAÇÃO DE ACESSO MULTI-TENANT OBRIGATÓRIA
  const { hasAccess, accessError, currentTenant } = useTenantAccessGuard()
  
  // 🚨 GUARD CLAUSE: Bloquear componente se tenant inválido
  if (!hasAccess) {
    console.error(`🚨 [SearchableSelect] Acesso negado: ${accessError}`)
    return (
      <Button variant="outline" disabled className="w-full justify-between">
        Acesso negado
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-70" />
      </Button>
    )
  }
  
  // Buscar o item selecionado
  const selectedOption = options.find(option => option.value === value)
  
  // Carregar clientes quando o usuário abrir o popover
  useEffect(() => {
    if (open && options.length === 0) {
      loadClients(1);
    }
  }, [open]);
  
  // Carregar clientes quando o usuário pesquisar
  useEffect(() => {
    if (open) {
      setOptions([]);
      setPage(1);
      setHasMore(true);
      loadClients(1, debouncedSearch);
    }
  }, [debouncedSearch, open]);
  
  // Função para carregar mais clientes
  const loadClients = async (pageNum: number, search = '') => {
    if (loading) return;
    
    // 🛡️ VALIDAÇÃO DE SEGURANÇA: tenant_id é obrigatório
    if (!currentTenant?.id) {
      console.error('🚨 [SearchableSelect] Erro: tenant_id é obrigatório para buscar clientes');
      return;
    }
    
    // 🔍 LOG DE AUDITORIA: Busca de clientes
    console.log(`🔍 [AUDIT] Buscando clientes - Tenant: ${currentTenant.name} (${currentTenant.id}) - Página: ${pageNum} - Busca: "${search}"`);
    
    try {
      setLoading(true);
      const { data, hasMore: moreAvailable } = await clientsService.getClientsPaginated({
        page: pageNum,
        limit: 20,
        search,
        tenantId: currentTenant.id // AIDEV-NOTE: Incluir tenant_id para isolamento de dados
      });
      
      const newOptions = data.map(client => ({
        value: client.id,
        label: client.name || 'Cliente sem nome'
      }));
      
      if (pageNum === 1) {
        setOptions(newOptions);
      } else {
        setOptions(prev => [...prev, ...newOptions]);
      }
      
      setPage(pageNum);
      setHasMore(moreAvailable);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Detectar quando o usuário rola até o final da lista
  const handleScroll = () => {
    if (!containerRef.current || loading || !hasMore) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      loadClients(page + 1, debouncedSearch);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between"
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-70" />
        </Button>
      </PopoverTrigger>
      {inModal ? (
        <PopoverContentModal className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
        <div className="p-2">
          <Input
            placeholder="Pesquisar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-2"
            autoFocus
          />
          <div 
            className="max-h-60 overflow-y-auto"
            ref={containerRef}
            onScroll={handleScroll}
          >
            {options.length === 0 && !loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {debouncedSearch ? 'Nenhum resultado encontrado.' : 'Carregando clientes...'}
              </div>
            ) : (
              <div className="space-y-1">
                {options.map((option) => (
                  <div
                    key={option.value}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      onChange(option.value)
                      setOpen(false)
                    }}
                    className={`
                      flex items-center cursor-pointer rounded-md px-2 py-1.5 text-sm
                      ${value === option.value ? 'bg-primary/10' : 'hover:bg-muted'}
                    `}
                  >
                    <Check 
                      className={`mr-2 h-4 w-4 ${value === option.value ? 'opacity-100' : 'opacity-0'}`} 
                    />
                    {option.label}
                  </div>
                ))}
                
                {loading && (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        </PopoverContentModal>
      ) : (
        <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
        <div className="p-2">
          <Input
            placeholder="Pesquisar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-2"
            autoFocus
          />
          <div 
            className="max-h-60 overflow-y-auto"
            ref={containerRef}
            onScroll={handleScroll}
          >
            {options.length === 0 && !loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {debouncedSearch ? 'Nenhum resultado encontrado.' : 'Carregando clientes...'}
              </div>
            ) : (
              <div className="space-y-1">
                {options.map((option) => (
                  <div
                    key={option.value}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      onChange(option.value)
                      setOpen(false)
                    }}
                    className={`
                      flex items-center cursor-pointer rounded-md px-2 py-1.5 text-sm
                      ${value === option.value ? 'bg-primary/10' : 'hover:bg-muted'}
                    `}
                  >
                    <Check 
                      className={`mr-2 h-4 w-4 ${value === option.value ? 'opacity-100' : 'opacity-0'}`} 
                    />
                    {option.label}
                  </div>
                ))}
                
                {loading && (
                  <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        </PopoverContent>
      )}
    </Popover>
  )
}
