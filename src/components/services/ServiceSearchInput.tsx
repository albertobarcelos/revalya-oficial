/**
 * Componente de busca de serviços com autocomplete
 *
 * AIDEV-NOTE: Replica o UX do ProductSearchInput para serviços,
 * usando Popover + lista com busca e descrição.
 */

import * as React from 'react';
import { Check, ChevronsUpDown, Search, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { useServices, type Service } from '@/hooks/useServices';

interface ServiceSearchInputProps {
  value?: string; // service_id
  onValueChange: (serviceId: string | null, service: Service | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  height?: 'default' | 'small';
}

export function ServiceSearchInput({
  value,
  onValueChange,
  placeholder = 'Buscar serviço...',
  disabled = false,
  className,
  height = 'small'
}: ServiceSearchInputProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedServiceCache, setSelectedServiceCache] = React.useState<Service | null>(null);

  const { services: servicesData, isLoading } = useServices({ searchTerm, useCache: true });
  const services: Service[] = servicesData?.data || servicesData || [];

  React.useEffect(() => {
    if (value && services.length > 0) {
      const found = services.find(s => s.id === value);
      if (found) setSelectedServiceCache(found);
    } else if (!value) {
      setSelectedServiceCache(null);
    }
  }, [value, services]);

  const selectedService = React.useMemo(() => {
    if (!value) return null;
    const found = services.find(s => s.id === value);
    if (found) return found;
    if (selectedServiceCache && selectedServiceCache.id === value) return selectedServiceCache;
    return null;
  }, [value, services, selectedServiceCache]);

  const displayValue = React.useMemo(() => {
    if (!selectedService) return placeholder;
    const code = selectedService.code || '';
    const name = selectedService.name || '';
    return code && name ? `${code} - ${name}` : (name || code || placeholder);
  }, [selectedService, placeholder]);

  const handleSelect = React.useCallback((serviceId: string) => {
    const service = services.find(s => s.id === serviceId) || null;
    if (service) {
      setSelectedServiceCache(service);
      onValueChange(serviceId, service);
      setOpen(false);
      setSearchTerm('');
    }
  }, [services, onValueChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between bg-background text-foreground border border-input focus:ring-2 focus:ring-primary focus:border-primary rounded-lg',
            height === 'default' ? 'h-10 px-3 py-2' : 'h-[25px] px-2 py-0',
            !selectedService && 'text-foreground',
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Package className="h-3 w-3 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm text-foreground">{displayValue}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="border-b px-3 py-2">
          <input
            type="text"
            placeholder="Buscar por código ou nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : services.length > 0 ? (
            <div className="p-1">
              {services.map((service) => {
                const code = service.code || '';
                const name = service.name || '';
                const display = code && name ? `${code} - ${name}` : (name || code);
                return (
                  <div
                    key={service.id}
                    onClick={() => handleSelect(service.id)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(service.id);
                    }}
                    className={cn(
                      'flex items-center gap-2 cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                      value === service.id && 'bg-accent text-accent-foreground'
                    )}
                  >
                    <Check className={cn('mr-2 h-4 w-4', value === service.id ? 'opacity-100' : 'opacity-0')} />
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="truncate">{display}</span>
                      {service.description && (
                        <span className="text-small text-muted-foreground truncate">{service.description}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {searchTerm ? 'Nenhum serviço encontrado.' : 'Digite para buscar serviços...'}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}