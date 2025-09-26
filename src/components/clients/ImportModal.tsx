/**
 * Modal de Importação de Clientes
 * 
 * Componente responsável por permitir a importação de clientes
 * tanto do Asaas quanto de arquivos CSV/Excel.
 * 
 * @module ImportModal
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Cloud, 
  FileSpreadsheet, 
  Download, 
  Upload,
  Users,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { asaasService } from '@/services/asaas';
import { useToast } from '@/components/ui/use-toast';
import { useTenantAccessGuard } from '@/hooks/templates/useSecureTenantQuery';


interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportData: (data: any[], type: 'asaas' | 'csv') => void;
}

export function ImportModal({ 
  open, 
  onOpenChange, 
  onImportData 
}: ImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isLoadingAsaas, setIsLoadingAsaas] = useState(false);
  
  const { toast } = useToast();
  const { currentTenant } = useTenantAccessGuard();

  // AIDEV-NOTE: Handler para processar arquivo selecionado
  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    // TODO: Implementar processamento do arquivo aqui
    console.log('Arquivo selecionado:', file.name);
  };

  // AIDEV-NOTE: Handler para importação do Asaas
  const handleAsaasImport = async () => {
    if (!currentTenant?.id) {
      toast({
        title: "Erro de autenticação",
        description: "Tenant não identificado. Faça login novamente.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingAsaas(true);
    try {
      const customers = await asaasService.getAllCustomersWithPagination(currentTenant.id);
      
      if (!customers || customers.length === 0) {
        toast({
          title: "Nenhum cliente encontrado",
          description: "Não foram encontrados clientes no Asaas para importar.",
          variant: "default",
        });
        return;
      }

      // AIDEV-NOTE: Mapear todos os campos disponíveis do Asaas para o ImportWizard
      const mockData = customers.map((customer, i) => ({
        // Campos básicos
        id: customer.id || '', // AIDEV-NOTE: ID original do Asaas (cus_xxxxx)
        name: customer.name || `Cliente ${i + 1}`,
        email: customer.email || '',
        phone: customer.phone || '', // AIDEV-NOTE: Campo telefone fixo
        celular: customer.mobilePhone || '', // AIDEV-NOTE: Campo celular do mobilePhone
        
        // Informações empresariais (movido para cima do CPF/CNPJ)
        company: customer.company || '',
        
        // Documento e tipo de pessoa
        cpfCnpj: customer.cpfCnpj || '',
        personType: customer.personType || '',
        
        // Endereço completo
        address: customer.address || '',
        addressNumber: customer.addressNumber || '',
        complement: customer.complement || '',
        province: customer.province || '', // AIDEV-NOTE: Campo bairro do Asaas
        city: customer.cityName || customer.city || '', // AIDEV-NOTE: Campo cidade do Asaas
        state: customer.state || '',
        country: customer.country || 'Brasil',
        postalCode: customer.postalCode || '',
        
        // Informações adicionais
        observations: customer.observations || '',
        externalReference: customer.externalReference || '',
        
        // Status e identificação
        deleted: customer.deleted === true, // AIDEV-NOTE: Garantir valor booleano correto
        id: customer.id || '', // AIDEV-NOTE: ID original do cliente no Asaas
      }));
      
      onImportData(mockData, 'asaas');
      onOpenChange(false);
      
      toast({
        title: "Clientes importados com sucesso!",
        description: `${customers.length} clientes foram importados do Asaas.`,
      });
    } catch (error) {
      console.error('Erro ao buscar clientes do Asaas:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      if (errorMessage.includes('não configurada') || errorMessage.includes('inativa')) {
        toast({
          title: "Integração não configurada",
          description: "Configure sua integração com o Asaas nas configurações do sistema.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao buscar clientes",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoadingAsaas(false);
    }
  };

  // AIDEV-NOTE: Handlers para drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileSelected(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleFileSelected(file);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5 text-primary" />
              Importar Clientes
            </DialogTitle>
            <DialogDescription>
              Escolha a origem dos dados para importar clientes para o sistema
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Importar do Asaas */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="cursor-pointer hover:shadow-md transition-all duration-200 border-2 hover:border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Cloud className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Importar do Asaas</CardTitle>
                        <CardDescription>
                          Sincronizar clientes diretamente da plataforma Asaas
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Recomendado
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AlertCircle className="h-4 w-4" />
                      <span>Dados atualizados em tempo real</span>
                    </div>
                    <Button 
                      onClick={handleAsaasImport}
                      className="w-full"
                      size="lg"
                      disabled={isLoadingAsaas}
                    >
                      {isLoadingAsaas ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Buscando clientes...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Buscar Clientes do Asaas
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <div className="flex items-center gap-4">
              <Separator className="flex-1" />
              <span className="text-sm text-muted-foreground font-medium">OU</span>
              <Separator className="flex-1" />
            </div>

            {/* Importar de Planilha */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card className="cursor-pointer hover:shadow-md transition-all duration-200 border-2 hover:border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FileSpreadsheet className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Importar de Planilha</CardTitle>
                      <CardDescription>
                        Fazer upload de arquivo CSV ou Excel com dados dos clientes
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {/* Área de Drop */}
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        dragActive 
                          ? 'border-primary bg-primary/5' 
                          : 'border-muted-foreground/25 hover:border-primary/50'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium mb-1">
                        Arraste e solte seu arquivo aqui
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Formatos suportados: CSV, XLSX
                      </p>
                      
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileInput}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload">
                        <Button variant="outline" size="sm" asChild>
                          <span className="cursor-pointer">
                            Selecionar Arquivo
                          </span>
                        </Button>
                      </label>
                    </div>

                    {/* Informações do formato */}
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs font-medium mb-1">Formato esperado:</p>
                      <p className="text-xs text-muted-foreground">
                        Nome, Email, Telefone, CPF/CNPJ, Empresa, Endereço
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}