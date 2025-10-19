import { useState, useEffect } from "react";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCpfCnpj } from "@/lib/utils";
import { formatInstallmentDisplay, getInstallmentBadgeVariant } from '@/utils/installmentUtils';
import { supabase } from '@/lib/supabase';
import { useCurrentTenant } from '@/hooks/useZustandTenant'; // AIDEV-NOTE: Hook para obter tenant atual
import { ChargeDetailDrawer } from './ChargeDetailDrawer'; // AIDEV-NOTE: Importar o drawer de detalhes
import type { Cobranca } from '@/types/models/cobranca'; // AIDEV-NOTE: Tipo da cobrança

interface CompanyData {
  name: string;
  clientName: string;
  cpfCnpj: string;
  charges: any[];
  totalValue: number;
  overdueCount: number;
  pendingCount: number;
  receivedCount: number;
}

export function ChargesCompanyList() {
  // AIDEV-NOTE: Hook obrigatório para segurança multi-tenant
  const { currentTenant } = useCurrentTenant();
  
  // AIDEV-NOTE: Inicialização explícita com string vazia para evitar componente não controlado
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<CompanyData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyData | null>(null);
  const [dataWarning, setDataWarning] = useState<string | null>(null);
  const [overdueCompanyMap, setOverdueCompanyMap] = useState<Record<string, boolean>>({});
  // AIDEV-NOTE: Estados para controle do ChargeDetailDrawer
  const [selectedCharge, setSelectedCharge] = useState<Cobranca | null>(null);
  const [isChargeDrawerOpen, setIsChargeDrawerOpen] = useState(false);

  useEffect(() => {
    async function loadAllOverdueCharges() {
      setIsLoading(true);
      console.log("Iniciando carregamento de cobranças...");
      
      try {
        // Obter a data atual para filtro
        const today = new Date().toISOString().split('T')[0];
        console.log("Data atual:", today);
        
        // AIDEV-NOTE: Validação de segurança multi-tenant obrigatória
        if (!currentTenant?.id) {
          console.error('Tenant não definido - violação de segurança');
          setIsLoading(false);
          return;
        }
        
        // Buscar diretamente as cobranças atrasadas (sem limite) - COM FILTRO DE TENANT
        const { data: overdueCharges, error, count } = await supabase
          .from('charges')
          .select(`
            *,
            customers (
              name,
              email,
              phone,
              cpf_cnpj,
              company
            )
          `, { count: 'exact' })
          .eq('tenant_id', currentTenant.id)
          .eq('status', 'PENDING')
          .lt('data_vencimento', today);

        if (error) {
          console.error("Erro ao carregar cobranças atrasadas:", error);
          setIsLoading(false);
          return;
        }

        console.log(`Cobranças atrasadas carregadas:`, overdueCharges);
        
        // Agrupar por empresa para contar empresas afetadas
        const companiesCpfCnpj = new Set<string>();
        const companyMap: Record<string, boolean> = {};
        
        overdueCharges?.forEach(charge => {
          if (charge.customer?.cpf_cnpj) {
            companiesCpfCnpj.add(charge.customer.cpf_cnpj);
            companyMap[charge.customer.cpf_cnpj] = true;
          }
        });
        
        console.log(`Empresas com cobranças atrasadas:`, companiesCpfCnpj);
        
        setOverdueCompanyMap(companyMap);
        
        // Apresentar aviso apenas se houver divergência significativa no número de empresas com atraso
        if (overdueCharges && companiesCpfCnpj.size > 9 && companiesCpfCnpj.size - 9 > 3) {
          setDataWarning(`Existem ${companiesCpfCnpj.size} empresas com cobranças atrasadas no total.`);
        } else {
          setDataWarning(null); // Limpar o aviso se não for necessário
        }
        
        await loadCharges();
      } catch (error) {
        console.error("Erro ao verificar cobranças atrasadas:", error);
        setIsLoading(false);
      }
    }
    
    async function loadCharges() {
      console.log("Carregando todas as cobranças...");
      
      try {
        const { count: totalCount } = await supabase
          .from('charges')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', currentTenant.id);
          
        console.log(`Total de cobranças no banco:`, totalCount);
        
        const { data: charges, error } = await supabase
          .from('charges')
          .select(`
            *,
            customers (
              name,
              email,
              phone,
              cpf_cnpj,
              company
            )
          `)
          .eq('tenant_id', currentTenant.id)
          .order('data_vencimento', { ascending: false });

        if (error) {
          console.error("Erro ao carregar cobranças:", error);
          setIsLoading(false);
          return;
        }

        console.log(`Cobranças carregadas:`, charges);
        
        // Passo 1: Agrupar cobranças por empresa
        const companiesMap: Record<string, CompanyData> = {};
        
        charges?.forEach(charge => {
          const cpfCnpj = charge.customer?.cpf_cnpj || "-";
          
          if (!companiesMap[cpfCnpj]) {
            companiesMap[cpfCnpj] = {
              name: charge.customer?.company || "Sem empresa",
              clientName: charge.customer?.name || "Cliente não identificado",
              cpfCnpj,
              charges: [],
              totalValue: 0,
              overdueCount: 0,
              pendingCount: 0,
              receivedCount: 0,
            };
          }
          
          companiesMap[cpfCnpj].charges.push(charge);
          companiesMap[cpfCnpj].totalValue += charge.valor;
        });
        
        console.log("Empresas agrupadas:", companiesMap);
        
        // Passo 2: Calcular contagens para cada empresa
        const today = new Date().toISOString().split('T')[0];
        const companiesList = Object.values(companiesMap);
        
        companiesList.forEach(company => {
          company.charges.forEach(charge => {
            if (charge.status === 'PENDING' && charge.data_vencimento < today) {
              company.overdueCount++;
            } else if (charge.status === 'PENDING') {
              company.pendingCount++;
            } else if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(charge.status)) {
              company.receivedCount++;
            }
          });
        });
        
        console.log("Lista final de empresas:", companiesList);
        
        setCompanies(companiesList);
        setFilteredCompanies(companiesList);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        setDataWarning("Erro ao carregar dados. Tente novamente mais tarde.");
      } finally {
        setIsLoading(false);
      }
    }
    
    loadAllOverdueCharges();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredCompanies(companies);
      console.log(`Resetando filtro: ${companies.length} empresas disponíveis`);
      return;
    }
    
    const search = searchTerm.toLowerCase().trim();
    
    if (search === "atrasadas" || search === "vencidas" || search === "overdue") {
      // Simplesmente filtrar empresas que têm cobranças atrasadas
      // Como recalculamos os valores de forma precisa anteriormente, podemos confiar neles
      const filtered = companies.filter(company => company.overdueCount > 0);
      
      console.log(`Filtro "atrasadas": Encontradas ${filtered.length} empresas com cobranças atrasadas`);
      
      setFilteredCompanies(filtered);
    } 
    else if (search === "pendentes" || search === "pending") {
      const filtered = companies.filter(company => company.pendingCount > 0);
      console.log(`Filtro "pendentes": Encontradas ${filtered.length} empresas com cobranças pendentes`);
      setFilteredCompanies(filtered);
    }
    else if (search === "recebidas" || search === "received" || search === "pagas") {
      const filtered = companies.filter(company => company.receivedCount > 0);
      console.log(`Filtro "recebidas": Encontradas ${filtered.length} empresas com cobranças recebidas`);
      setFilteredCompanies(filtered);
    }
    else {
      const filtered = companies.filter(company => 
        company.name.toLowerCase().includes(search) ||
        company.clientName.toLowerCase().includes(search) ||
        company.cpfCnpj.toLowerCase().includes(search)
      );
      console.log(`Filtro por termo "${search}": Encontradas ${filtered.length} empresas`);
      setFilteredCompanies(filtered);
    }
    
    setCurrentPage(1); 
  }, [searchTerm, companies]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleCompanyClick = (companyData: CompanyData) => {
    // Recalcular o número correto de cobranças atrasadas
    const today = new Date().toISOString().split('T')[0];
    
    // Verificar cobranças atrasadas
    const overdueCharges = companyData.charges.filter(
      charge => charge.status === 'PENDING' && charge.data_vencimento < today
    );
    
    // Verificar cobranças pendentes (não atrasadas)
    const pendingCharges = companyData.charges.filter(
      charge => charge.status === 'PENDING' && charge.data_vencimento >= today
    );
    
    // Verificar cobranças recebidas
    const receivedCharges = companyData.charges.filter(
      charge => ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(charge.status)
    );
    
    console.log(`Empresa: ${companyData.name}`);
    console.log(`Contagem atual: atrasadas=${companyData.overdueCount}, pendentes=${companyData.pendingCount}, recebidas=${companyData.receivedCount}`);
    console.log(`Contagem recalculada: atrasadas=${overdueCharges.length}, pendentes=${pendingCharges.length}, recebidas=${receivedCharges.length}`);
    
    // Atualizar os valores no objeto
    const updatedCompanyData = {
      ...companyData,
      overdueCount: overdueCharges.length,
      pendingCount: pendingCharges.length,
      receivedCount: receivedCharges.length
    };
    
    // Abrir o modal com dados atualizados
    setSelectedCompany(updatedCompanyData);
    setIsDialogOpen(true);
  };

  // AIDEV-NOTE: Handler para abrir o drawer de detalhes da cobrança
  const handleChargeClick = (charge: any) => {
    console.log('🔍 [CLICK] ChargesCompanyList - Cobrança selecionada (estrutura REAL):', {
      // Campos que EXISTEM no banco real
      id: charge.id,
      tenant_id: charge.tenant_id,
      customer_id: charge.customer_id,
      asaas_id: charge.asaas_id, // Campo correto (não id_asaas)
      contract_id: charge.contract_id,
      valor: charge.valor,
      status: charge.status,
      tipo: charge.tipo,
      data_vencimento: charge.data_vencimento,
      descricao: charge.descricao,
      created_at: charge.created_at,
      updated_at: charge.updated_at,
      customerName: charge.customer?.name,
      fullCharge: charge
    });
    
    console.log('🔍 ChargesCompanyList - Estado antes da atualização:', {
      selectedChargeAtual: selectedCharge,
      isChargeDrawerOpenAtual: isChargeDrawerOpen
    });
    
    // AIDEV-NOTE: Mapeamento CORRIGIDO - usando apenas campos que EXISTEM no banco
    const formattedCharge: Cobranca = {
      id: charge.id,
      tenant_id: charge.tenant_id || currentTenant?.id || '',
      customer_id: charge.customer_id,
      asaas_id: charge.asaas_id || null,
      contract_id: charge.contract_id || null,
      valor: typeof charge.valor === 'number' ? charge.valor : parseFloat(charge.valor) || 0,
      status: charge.status || null,
      tipo: charge.tipo || null,
      data_vencimento: charge.data_vencimento,
      descricao: charge.descricao || null,
      created_at: charge.created_at || new Date().toISOString(),
      updated_at: charge.updated_at || null,
      customer: charge.customer
    };
    
    setSelectedCharge(formattedCharge);
    setIsChargeDrawerOpen(true);
    
    console.log('🔍 [FORMATTED] ChargesCompanyList - Dados CORRIGIDOS para o drawer:', {
      // Campos reais do banco
      realBankFields: {
        id: charge.id,
        tenant_id: charge.tenant_id,
        customer_id: charge.customer_id,
        asaas_id: charge.asaas_id,
        contract_id: charge.contract_id,
        valor: charge.valor,
        status: charge.status,
        tipo: charge.tipo,
        data_vencimento: charge.data_vencimento,
        descricao: charge.descricao,
        created_at: charge.created_at,
        updated_at: charge.updated_at
      },
      formattedCharge,
      drawerAberto: true
    });
  };

  // AIDEV-NOTE: Handler para fechar o drawer e atualizar dados
  const handleChargeDrawerClose = () => {
    setIsChargeDrawerOpen(false);
    setSelectedCharge(null);
  };

  const handleRefreshCharges = () => {
    // Recarregar dados das empresas
    fetchCompaniesData();
  };

  const ITEMS_PER_PAGE = 10;
  const totalItems = filteredCompanies.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  
  const paginatedCompanies = filteredCompanies.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;
    const halfVisible = Math.floor(maxVisiblePages / 2);
    
    let startPage = Math.max(1, currentPage - halfVisible);
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      items.push(
        <PaginationItem key="first">
          <PaginationLink onClick={() => setCurrentPage(1)}>1</PaginationLink>
        </PaginationItem>
      );
      if (startPage > 2) {
        items.push(
          <PaginationItem key="ellipsis-start">
            <PaginationLink disabled>...</PaginationLink>
          </PaginationItem>
        );
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            onClick={() => setCurrentPage(i)}
            isActive={currentPage === i}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(
          <PaginationItem key="ellipsis-end">
            <PaginationLink disabled>...</PaginationLink>
          </PaginationItem>
        );
      }
      items.push(
        <PaginationItem key="last">
          <PaginationLink onClick={() => setCurrentPage(totalPages)}>
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        {/* Filtro fixo no topo */}
        <div className="sticky top-0 bg-background z-10 pb-4">
          <div className="relative max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por empresa ou CNPJ..."
              className="pl-9"
              disabled
            />
          </div>
        </div>
        
        {/* Conteúdo com skeleton loading */}
        <div className="flex-1 overflow-hidden rounded-md border">
          <div className="overflow-auto h-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Cobranças</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filtro fixo no topo */}
      <div className="sticky top-0 bg-background z-10 pb-4">
        <div className="relative max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por empresa ou CNPJ..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      
      {/* Exibir aviso se houver */}
      {dataWarning && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-1 rounded mb-2">
          <span className="block sm:inline">{dataWarning}</span>
        </div>
      )}
      
      {/* Tabela com scroll interno */}
      <div className="flex-1 rounded-md border overflow-hidden min-h-0">
        <div className="h-full overflow-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-gray-500">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Cobranças</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCompanies.length > 0 ? (
                paginatedCompanies.map((data) => {
                  const displayOverdueCount = data.charges.filter(charge => 
                    charge.status === 'OVERDUE' || 
                    (charge.status === 'PENDING' && new Date(charge.data_vencimento) < new Date())
                  ).length;
                  
                  return (
                    <TableRow 
                      key={data.name} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleCompanyClick(data)}
                    >
                      <TableCell className="font-medium">{data.name}</TableCell>
                      <TableCell>{data.clientName}</TableCell>
                      <TableCell>{formatCpfCnpj(data.cpfCnpj)}</TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                          .format(data.totalValue)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {displayOverdueCount > 0 && (
                            <Badge variant="destructive">
                              {displayOverdueCount} {displayOverdueCount === 1 ? 'atrasada' : 'atrasadas'}
                            </Badge>
                          )}
                          {data.pendingCount > 0 && (
                            <Badge variant="outline">
                              {data.pendingCount} {data.pendingCount === 1 ? 'pendente' : 'pendentes'}
                            </Badge>
                          )}
                          {data.receivedCount > 0 && (
                            <Badge variant="secondary">
                              {data.receivedCount} {data.receivedCount === 1 ? 'recebida' : 'recebidas'}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Nenhuma empresa encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Paginação fixa na parte inferior */}
      {totalItems > 0 && (
        <div className="mt-4 flex items-center justify-between pb-3">
          <p className="text-sm text-muted-foreground">
            Mostrando {paginatedCompanies.length} de {totalItems} empresas
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                />
              </PaginationItem>
              
              {renderPaginationItems()}
              
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes das Cobranças - {selectedCompany?.name}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Parcelas</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedCompany?.charges.map((charge) => (
                  <TableRow 
                    key={charge.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleChargeClick(charge)}
                  >
                    <TableCell>{charge.customer?.name}</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
                        .format(charge.valor)}
                    </TableCell>
                    <TableCell>
                      {charge.data_vencimento.split('-').reverse().join('/')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getInstallmentBadgeVariant(charge.descricao)} className="text-xs">
                        {formatInstallmentDisplay(charge.descricao)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={charge.descricao}>
                      {charge.descricao || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          charge.status === "OVERDUE" || 
                          (charge.status === "PENDING" && new Date(charge.data_vencimento) < new Date()) 
                            ? "destructive" :
                          charge.status === "PENDING" ? "outline" :
                          charge.status === "CANCELLED" ? "secondary" :
                          "secondary"
                        }
                      >
                        {charge.status === "OVERDUE" || 
                         (charge.status === "PENDING" && new Date(charge.data_vencimento) < new Date()) 
                           ? "Atrasada" :
                         charge.status === "PENDING" ? "Pendente" :
                         charge.status === "RECEIVED" ? "Recebida" :
                         charge.status === "CONFIRMED" ? "Confirmada" :
                         charge.status === "CANCELLED" ? "Cancelada" :
                         charge.status === "REFUNDED" ? "Reembolsada" :
                         charge.status === "BANK_PROCESSING" ? "Em processamento" :
                         charge.status === "FAILED" ? "Falhou" :
                         charge.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* AIDEV-NOTE: Drawer de detalhes da cobrança */}
      <ChargeDetailDrawer
        charge={selectedCharge}
        isOpen={isChargeDrawerOpen}
        onClose={handleChargeDrawerClose}
        onRefresh={handleRefreshCharges}
      />
    </div>
  );
}
