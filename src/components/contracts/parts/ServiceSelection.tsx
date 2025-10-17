import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogTitle,
  DialogDescription, 
  DialogHeader,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Plus, Check, ArrowLeft, Package, CheckCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { Service, ServiceSelectionItem } from "@/types/services";

interface ServiceSelectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onServiceSelect: (services: ServiceSelectionItem[] | ServiceSelectionItem) => void;
  onCreateService: () => void;
  services?: Array<Service | ServiceSelectionItem>;
  isLoading?: boolean;
  selectedServiceIds?: string[];
  singleSelect?: boolean;
}

export function ServiceSelection({ 
  open, 
  onOpenChange, 
  services = [], 
  onServiceSelect,
  onCreateService,
  isLoading = false,
  selectedServiceIds: externalSelectedIds = [],
  singleSelect = false
}: ServiceSelectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  
  // Sincroniza com as seleções externas quando o diálogo é aberto
  React.useEffect(() => {
    if (open) {
      console.log('Dialog opened, setting selectedServices to:', externalSelectedIds);
      setSelectedServices([...externalSelectedIds]);
    }
  }, [open, externalSelectedIds.join(',')]); // Use join para evitar re-renders desnecessários
  
  const filteredServices = (services || []).filter(service => 
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (service.description && service.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleServiceSelection = (serviceId: string) => {
    console.log('toggleServiceSelection chamado para:', serviceId);
    console.log('selectedServices antes:', selectedServices);
    
    setSelectedServices(prev => {
      const newSelection = prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId];
      console.log('selectedServices depois:', newSelection);
      return newSelection;
    });
  };

  const handleSelectServices = () => {
    const selected = services
      .filter(service => selectedServices.includes(service.id))
      .map(service => ({
        id: service.id,
        name: service.name,
        description: service.description || null,
        default_price: service.default_price,
        tax_rate: service.tax_rate || 0,
        is_active: service.is_active ?? true,
        created_at: 'created_at' in service ? service.created_at : new Date().toISOString(),
        tenant_id: 'tenant_id' in service ? service.tenant_id : '',
        quantity: 1,
        unit_price: service.default_price,
        discount_percentage: 0,
        discount_amount: 0,
      }));
    
    onServiceSelect(selected);
  };
  
  const handleRowClick = (serviceId: string, e: React.MouseEvent) => {
    // Evita que o clique no checkbox propague para a linha
    if ((e.target as HTMLElement).closest('button, [role="button"], [role="checkbox"]')) {
      return;
    }
    
    if (singleSelect) {
      // Modo seleção única: chama o callback imediatamente
      const service = services.find(s => s.id === serviceId);
      if (service) {
        const serviceItem = {
          id: service.id,
          name: service.name,
          description: service.description || null,
          default_price: service.default_price,
          tax_rate: service.tax_rate || 0,
          is_active: service.is_active ?? true,
          created_at: 'created_at' in service ? service.created_at : new Date().toISOString(),
          tenant_id: 'tenant_id' in service ? service.tenant_id : '',
          quantity: 1,
          unit_price: service.default_price,
          discount_percentage: 0,
          discount_amount: 0,
        };
        onServiceSelect(serviceItem);
      }
    } else {
      // Modo seleção múltipla: apenas toggle a seleção
      toggleServiceSelection(serviceId);
    }
  };

  const handleCheckboxChange = (serviceId: string, checked: boolean) => {
    console.log('handleCheckboxChange chamado:', serviceId, checked);
    if (checked) {
      setSelectedServices(prev => prev.includes(serviceId) ? prev : [...prev, serviceId]);
    } else {
      setSelectedServices(prev => prev.filter(id => id !== serviceId));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogContent 
        className="max-w-full h-screen px-0 m-0 bg-transparent border-0 shadow-none" 
        style={{ 
          width: '100vw',
          paddingTop: '139px',
          paddingBottom: '139px',
          backdropFilter: 'none'
        }}
      >
        <DialogHeader className="hidden">
          <VisuallyHidden>
            <DialogTitle>Seleção de Serviço</DialogTitle>
            <DialogDescription>
              Selecione um serviço para adicionar ao contrato ou cadastre um novo.
            </DialogDescription>
          </VisuallyHidden>
        </DialogHeader>
        <div className="bg-background/95 backdrop-blur-sm border border-border/50 shadow-xl w-full rounded-3xl overflow-hidden" style={{ maxHeight: 'calc(100vh - 278px)' }}>
          {/* Cabeçalho com seta de voltar */}
          <div className="flex items-center justify-between px-6 py-4 bg-primary text-primary-foreground sticky top-0 z-10">
            <Button
              variant="ghost"
              size="icon"
              className="mr-2 hover:bg-primary-foreground/10 text-primary-foreground rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex-1 flex items-center">
              <Package className="h-5 w-5 mr-2" />
              <h2 className="text-lg font-medium">Seleção de Serviço</h2>
            </div>
            
            <Button 
              variant="ghost" 
              className="gap-2 hover:bg-primary-foreground/10 text-primary-foreground rounded-xl px-4 py-2"
              onClick={onCreateService}
            >
              <Plus className="h-4 w-4" />
              <span>Novo Serviço</span>
            </Button>
          </div>

          {/* Conteúdo principal */}
          <div className="p-6 overflow-auto" style={{ maxHeight: 'calc(100vh - 350px)' }}>
            {/* Barra de pesquisa */}
            <div className="flex items-center gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar serviços..."
                  className="w-full appearance-none bg-background pl-10 pr-4 py-3 rounded-2xl border-2 border-border/50 focus:border-primary/50 shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={isLoading}
                />
                {isLoading && (
                  <div className="absolute right-3 top-3 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                )}
              </div>
              <Button className="bg-primary hover:bg-primary/90 py-3 px-6 rounded-2xl shadow-sm">
                <Search className="h-4 w-4 mr-2" />
                Pesquisar
              </Button>
            </div>

            {/* Tabela de serviços */}
            <div className="border-2 border-border/50 rounded-3xl bg-card/50 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-b-2 border-border/30">
                    {!singleSelect && <TableHead className="w-12 py-4"></TableHead>}
                    <TableHead className="py-4 font-semibold">Nome</TableHead>
                    <TableHead className="py-4 font-semibold">Descrição</TableHead>
                    <TableHead className="text-right py-4 font-semibold">Preço Unitário</TableHead>
                    <TableHead className="py-4 font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={singleSelect ? 4 : 5} className="h-24 text-center">
                        Nenhum serviço encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredServices.map((service) => {
                      const isSelected = selectedServices.includes(service.id);
                      return (
                        <TableRow 
                          key={service.id}
                          className={`hover:bg-muted/20 cursor-pointer transition-colors duration-200 ${isSelected ? 'bg-primary/8 border-l-4 border-l-primary' : ''}`}
                          onClick={(e) => handleRowClick(service.id, e)}
                        >
                          {!singleSelect && (
                            <TableCell className="py-4">
                              <div className="flex items-center justify-center">
                                <Checkbox 
                                  checked={isSelected}
                                  onCheckedChange={(checked) => handleCheckboxChange(service.id, checked === true)}
                                  className="h-5 w-5 rounded-lg"
                                />
                              </div>
                            </TableCell>
                          )}
                          <TableCell className="font-medium py-4">
                            <div className="flex items-center gap-3">
                              <span className="text-foreground">{service.name}</span>
                              {isSelected && (
                                <Badge variant="outline" className="h-6 rounded-xl border-primary/30 bg-primary/10 text-primary">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Selecionado
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground py-4">
                            {service.description || "Sem descrição"}
                          </TableCell>
                          <TableCell className="text-right font-mono py-4 font-semibold">
                            {formatCurrency(service.default_price)}
                          </TableCell>
                          <TableCell className="py-4">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-2xl text-xs font-medium ${
                              service.is_active 
                                ? 'bg-success/15 text-success border border-success/20' 
                                : 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}>
                              {service.is_active ? 'Ativo' : 'Inativo'}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {!singleSelect && (
                <>
                  <div className="flex items-center justify-between px-6 py-4 border-t-2 border-border/30 bg-muted/20">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium text-foreground">
                        {selectedServices.length} selecionado(s)
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {filteredServices.length} de {services.length} registros
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSelectedServices([])}
                        disabled={selectedServices.length === 0}
                        className="rounded-xl"
                      >
                        Limpar seleção
                      </Button>
                      <Button variant="outline" size="sm" disabled className="rounded-xl">
                        Anterior
                      </Button>
                      <Button variant="outline" size="sm" className="bg-primary/15 border-primary/50 text-primary rounded-xl">
                        1
                      </Button>
                      <Button variant="outline" size="sm" disabled className="rounded-xl">
                        Próximo
                      </Button>
                    </div>
                  </div>
                  
                  <DialogFooter className="border-t-2 border-border/30 px-6 py-4 bg-background/50">
                    <Button 
                      variant="outline" 
                      onClick={() => onOpenChange(false)}
                      className="rounded-2xl px-6 py-2"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleSelectServices}
                      disabled={selectedServices.length === 0}
                      className="rounded-2xl px-6 py-2 shadow-sm"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Adicionar {selectedServices.length} serviço(s)
                    </Button>
                  </DialogFooter>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
