import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogTitle,
  DialogDescription, 
  DialogHeader
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Plus, UserCheck, ArrowLeft, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VisuallyHidden } from "@/components/ui/visually-hidden";

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
  clients: Client[];
  onClientSelect: (clientId: string) => void;
  onCreateClient: () => void;
}

export function ClientSearch({ open, onOpenChange, clients, onClientSelect, onCreateClient }: ClientSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  
  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.document && client.document.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
          <DialogTitle>Seleção de Cliente</DialogTitle>
          <DialogDescription>
            Selecione um cliente para associar ao contrato ou cadastre um novo.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-background/95 backdrop-blur-sm border-y border-border/50 shadow-lg w-full" style={{ maxHeight: 'calc(100vh - 278px)', overflow: 'auto' }}>
          {/* Cabeçalho com seta de voltar */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground sticky top-0 z-10">
            <Button
              variant="ghost"
              size="icon"
              className="mr-2 hover:bg-primary-foreground/10 text-primary-foreground"
              onClick={() => onOpenChange(false)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex-1 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              <h2 className="text-lg font-medium">Seleção de Cliente</h2>
            </div>
            
            <Button 
              variant="ghost" 
              className="gap-1 hover:bg-primary-foreground/10 text-primary-foreground"
              onClick={onCreateClient}
            >
              <Plus className="h-4 w-4" />
              <span>Novo Cliente</span>
            </Button>
          </div>

          {/* Conteúdo principal */}
          <div className="p-4">
            {/* Barra de pesquisa */}
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Digite o que deseja pesquisar (Nome, CNPJ, Razão Social, CPF...)"
                  className="pl-10 py-6 bg-background text-base"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button 
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setSearchTerm("")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button className="bg-primary hover:bg-primary/90 py-6 px-4">
                <Search className="h-4 w-4 mr-2" />
                Pesquisar
              </Button>
            </div>

            {/* Tabela de clientes */}
            <div className="border rounded-md bg-card/50">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-10 text-center">#</TableHead>
                    <TableHead>CNPJ/CPF</TableHead>
                    <TableHead>Nome / Razão Social</TableHead>
                    <TableHead>Crédito Total</TableHead>
                    <TableHead>Total a Receber</TableHead>
                    <TableHead>Crédito Disponível</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center">
                        Nenhum cliente encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClients.map((client, index) => (
                      <TableRow 
                        key={client.id}
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => onClientSelect(client.id)}
                      >
                        <TableCell className="text-center">
                          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                            <span className="h-2 w-2 rounded-full bg-green-600"></span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{client.document || "-"}</TableCell>
                        <TableCell>{client.name}</TableCell>
                        <TableCell>R$ 0,00</TableCell>
                        <TableCell>R$ 0,00</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>{client.phone || "-"}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                            Ativo
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              onClientSelect(client.id);
                            }}
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between px-4 py-2 border-t">
                <span className="text-xs text-muted-foreground">
                  {filteredClients.length} de {clients.length} registros
                </span>
                
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" disabled>
                    Anterior
                  </Button>
                  <Button variant="outline" size="sm" className="bg-primary/10 border-primary text-primary">
                    1
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    Próximo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
