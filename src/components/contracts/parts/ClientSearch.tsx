import React, { useState, useEffect } from "react";
import { Search, Plus, Users, Building2, Mail, Phone, FileText, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCustomers } from "@/hooks/useCustomers";

interface Client {
  id: string;
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  credit?: number;
  status?: "active" | "inactive";
}

interface ClientSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[]; // AIDEV-NOTE: Mantido para compatibilidade, mas não será usado
  onClientSelect: (client: any) => void;
  onCreateClient: () => void;
}

export function ClientSearch({ 
  open, 
  onOpenChange, 
  clients: _, // AIDEV-NOTE: Ignorando prop clients, usando hook diretamente
  onClientSelect, 
  onCreateClient 
}: ClientSearchProps) {
  // AIDEV-NOTE: Estados para controle de busca e paginação
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  
  // AIDEV-NOTE: Hook useCustomers com paginação e busca no servidor
  const { 
    customers, 
    totalCount, 
    isLoading, 
    error 
  } = useCustomers({
    searchTerm: debouncedSearchTerm,
    page: currentPage,
    limit: 10
  });

  // AIDEV-NOTE: Debounce para busca em tempo real
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset para primeira página ao buscar
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // AIDEV-NOTE: Cálculos de paginação
  const totalPages = Math.ceil(totalCount / 10);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  // AIDEV-NOTE: Função para navegar entre páginas
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // AIDEV-NOTE: Reset da busca ao fechar modal
  const handleClose = (open: boolean) => {
    if (!open) {
      setSearchTerm("");
      setDebouncedSearchTerm("");
      setCurrentPage(1);
    }
    onOpenChange(open);
  };

  // AIDEV-NOTE: Função para formatar documento (CPF/CNPJ)
  const formatDocument = (doc: string | number | undefined) => {
    if (!doc) return "";
    const docStr = doc.toString().replace(/\D/g, "");
    
    if (docStr.length === 11) {
      // CPF: 000.000.000-00
      return docStr.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else if (docStr.length === 14) {
      // CNPJ: 00.000.000/0000-00
      return docStr.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    }
    
    return docStr;
  };

  // AIDEV-NOTE: Função para selecionar cliente (passa objeto completo para resolver problema de paginação)
  const handleSelectClient = (customer: any) => {
    onClientSelect(customer);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Selecionar Cliente
          </DialogTitle>
        </DialogHeader>

        {/* AIDEV-NOTE: Barra de busca e botão de criar cliente */}
        <div className="flex gap-3 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por nome, empresa, email ou documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={onCreateClient} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Novo Cliente
          </Button>
        </div>

        <Separator />

        {/* AIDEV-NOTE: Área de conteúdo com scroll */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* AIDEV-NOTE: Indicador de carregamento */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Carregando clientes...</span>
            </div>
          )}

          {/* AIDEV-NOTE: Tratamento de erro */}
          {error && (
            <div className="flex items-center justify-center py-8 text-destructive">
              <span>Erro ao carregar clientes. Tente novamente.</span>
            </div>
          )}

          {/* AIDEV-NOTE: Lista de clientes */}
          {!isLoading && !error && (
            <>
              {customers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhum cliente encontrado</p>
                  <p className="text-sm">
                    {searchTerm ? "Tente ajustar sua busca" : "Comece criando seu primeiro cliente"}
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  <div className="space-y-2 p-1">
                    {customers.map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => handleSelectClient(customer)}
                        className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                                {customer.name}
                              </h3>
                              {customer.company && (
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {customer.company}
                                </Badge>
                              )}
                              {customer.cpf_cnpj && (
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  {formatDocument(customer.cpf_cnpj)}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                              {customer.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 flex-shrink-0" />
                                  <span className="truncate">{customer.email}</span>
                                </div>
                              )}
                              
                              {customer.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 flex-shrink-0" />
                                  <span>{customer.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* AIDEV-NOTE: Controles de paginação */}
        {!isLoading && !error && totalPages > 1 && (
          <>
            <Separator />
            <div className="flex items-center justify-between flex-shrink-0 py-2">
              <div className="text-sm text-muted-foreground">
                {totalCount > 0 && (
                  <>
                    Mostrando {((currentPage - 1) * 10) + 1} a {Math.min(currentPage * 10, totalCount)} de {totalCount} clientes
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!hasPreviousPage}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                
                <div className="flex items-center gap-1">
                  {/* AIDEV-NOTE: Mostrar páginas próximas */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!hasNextPage}
                  className="flex items-center gap-1"
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
