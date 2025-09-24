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
  const [dragActive, setDragActive] = useState(false);
  const [isLoadingAsaas, setIsLoadingAsaas] = useState(false);
  const { toast } = useToast();
  
  // Obter tenant atual para passar para o asaasService
  const { currentTenant } = useTenantAccessGuard();

  // AIDEV-NOTE: Handler para buscar clientes do Asaas
  const handleAsaasImport = async () => {
    try {
      setIsLoadingAsaas(true);
      
      // Verificar se temos um tenant válido
      if (!currentTenant?.id) {
        toast({
          title: "Erro de autenticação",
          description: "Não foi possível identificar o tenant atual. Faça login novamente.",
          variant: "destructive",
        });
        return;
      }
      
      console.log('Buscando clientes do ASAAS para tenant:', currentTenant.id);
      const customers = await asaasService.getAllCustomersWithPagination(currentTenant.id, 20);
      
      if (customers.length === 0) {
        toast({
          title: "Nenhum cliente encontrado",
          description: "Não foram encontrados clientes no Asaas para importar.",
          variant: "default",
        });
        return;
      }

      // Transformar dados do Asaas para o formato esperado
      const formattedData = customers.map(customer => ({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || customer.mobilePhone || '',
        cpfCnpj: customer.cpfCnpj || '',
        address: customer.address || '',
        addressNumber: customer.addressNumber || '',
        complement: customer.complement || '',
        province: customer.province || '',
        city: customer.city || '',
        state: customer.state || '',
        postalCode: customer.postalCode || '',
        externalReference: customer.externalReference || '',
        observations: customer.observations || '',
        additionalEmails: customer.additionalEmails || '',
        municipalInscription: customer.municipalInscription || '',
        stateInscription: customer.stateInscription || '',
        groupName: customer.groupName || '',
        company: customer.company || '',
        personType: customer.personType || 'FISICA'
      }));

      onImportData(formattedData, 'asaas');
      
      toast({
        title: "Clientes carregados com sucesso!",
        description: `${customers.length} clientes foram carregados do Asaas.`,
      });
    } catch (error) {
      console.error('Erro ao buscar clientes do Asaas:', error);
      
      // AIDEV-NOTE: Verificar se é erro de credenciais não configuradas
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      if (errorMessage.includes('não configurada') || errorMessage.includes('inativa')) {
        toast({
          title: "Integração não configurada",
          description: "Configure as credenciais do Asaas em Configurações > Integrações antes de importar clientes.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao buscar clientes",
          description: "Ocorreu um erro ao conectar com o Asaas. Verifique sua conexão e tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoadingAsaas(false);
    }
  };

  // AIDEV-NOTE: Handlers para drag and drop de arquivos CSV
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
      if (file.type === 'text/csv' || file.name.endsWith('.csv') || file.name.endsWith('.xlsx')) {
        handleFileUpload(file);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  // AIDEV-NOTE: Handler para processar arquivo CSV/Excel
  const handleFileUpload = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({
          title: "Arquivo inválido",
          description: "O arquivo deve conter pelo menos um cabeçalho e uma linha de dados.",
          variant: "destructive",
        });
        return;
      }

      // Assumir que a primeira linha é o cabeçalho
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row: any = {};
        
        headers.forEach((header, index) => {
          row[header.toLowerCase()] = values[index] || '';
        });
        
        return {
          name: row.nome || row.name || '',
          email: row.email || '',
          phone: row.telefone || row.phone || '',
          cpfCnpj: row.cpfcnpj || row.cpf || row.cnpj || '',
          address: row.endereco || row.address || '',
          addressNumber: row.numero || row.number || '',
          complement: row.complemento || row.complement || '',
          province: row.bairro || row.province || '',
          city: row.cidade || row.city || '',
          state: row.estado || row.state || '',
          postalCode: row.cep || row.postalcode || '',
          personType: row.tipo || row.persontype || 'FISICA'
        };
      });

      onImportData(data, 'csv');
      
      toast({
        title: "Arquivo processado com sucesso!",
        description: `${data.length} registros foram carregados do arquivo.`,
      });
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast({
        title: "Erro ao processar arquivo",
        description: "Ocorreu um erro ao ler o arquivo. Verifique se é um CSV válido.",
        variant: "destructive",
      });
    }
  };

  return (
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
          {/* Opção 1: Importar do Asaas */}
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

          {/* Opção 2: Importar CSV */}
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

                  {/* Informações sobre formato */}
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
  );
}