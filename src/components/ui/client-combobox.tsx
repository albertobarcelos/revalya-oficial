"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ClientComboboxProps {
  clients: Array<{ id: string; name: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ClientCombobox({ clients, value, onChange, placeholder = "Selecione um cliente..." }: ClientComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [visibleClients, setVisibleClients] = React.useState<Array<{ id: string; name: string }>>(clients.slice(0, 5))
  const [page, setPage] = React.useState(1)
  const [loading, setLoading] = React.useState(false)
  const listRef = React.useRef<HTMLDivElement>(null)
  
  // Referência para o cliente selecionado
  const selectedClient = React.useMemo(() => {
    return clients.find((client) => client.id === value)
  }, [clients, value])

  // Filtrar clientes com base na pesquisa
  const filteredClients = React.useMemo(() => {
    if (!searchQuery) return clients;
    
    return clients.filter(client =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [clients, searchQuery]);

  // Inicializar com os primeiros 5 clientes
  React.useEffect(() => {
    setVisibleClients(filteredClients.slice(0, 5));
    setPage(1);
  }, [filteredClients]);

  // Função para carregar mais clientes
  const loadMoreClients = React.useCallback(() => {
    if (loading || visibleClients.length >= filteredClients.length) return;
    
    setLoading(true);
    
    // Simular carregamento assíncrono
    setTimeout(() => {
      const nextPage = page + 1;
      const newVisibleClients = filteredClients.slice(0, nextPage * 5);
      
      setVisibleClients(newVisibleClients);
      setPage(nextPage);
      setLoading(false);
    }, 300);
  }, [loading, visibleClients, filteredClients, page]);

  // Detectar quando o usuário rola até o final da lista
  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      loadMoreClients();
    }
  }, [loadMoreClients]);

  // Log de debug
  React.useEffect(() => {
    console.log("Total de clientes recebidos:", clients.length);
    console.log("Clientes filtrados:", filteredClients.length);
    console.log("Clientes visíveis:", visibleClients.length);
  }, [clients, filteredClients, visibleClients]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value && selectedClient ? selectedClient.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput 
            placeholder="Buscar cliente..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList 
            className="max-h-60 overflow-y-auto"
            ref={listRef}
            onScroll={handleScroll}
          >
            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
            <CommandGroup>
              {visibleClients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.id}
                  onSelect={() => {
                    onChange(client.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === client.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {client.name}
                </CommandItem>
              ))}
              {loading && (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 
