import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ContractFormValues, contractFormSchema } from "../schema/ContractFormSchema";
import { useContractEdit } from "@/hooks/useContractEdit";
import { useContractCosts } from "@/hooks/useContractCosts";
import { toast } from "sonner";

// AIDEV-NOTE: Interfaces para tipagem específica
interface ServiceData {
  id?: string;
  service_id?: string;
  name?: string;
  description?: string;
  quantity?: number;
  unit_price?: number;
  default_price?: number;
  discount_percentage?: number;
  tax_rate?: number;
  cost_percentage?: number;
  [key: string]: unknown;
}

interface ProductData {
  id?: string;
  product_id?: string;
  name?: string;
  description?: string;
  quantity?: number;
  price?: number;
  unit_price?: number;
  discount_percentage?: number;
  tax_rate?: number;
  [key: string]: unknown;
}

interface ContractData {
  id?: string;
  contract_number?: string;
  services?: ServiceData[];
  products?: ProductData[];
  [key: string]: unknown;
}

interface TotalValues {
  subtotal: number;
  discount: number;
  tax: number;
  costs: number;
  total: number;
}

// AIDEV-NOTE: Interface para alterações pendentes de serviços
interface PendingServiceChanges {
  [serviceId: string]: {
    originalData: ServiceData;
    pendingChanges: Partial<ServiceData>;
    hasChanges: boolean;
    timestamp: number;
  };
}

interface ContractFormContextType {
  form: ReturnType<typeof useForm<ContractFormValues>>;
  mode: "create" | "edit" | "view";
  formChanged: boolean;
  setFormChanged: (changed: boolean) => void;
  isPending: boolean;
  setIsPending: (pending: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  totalValues: TotalValues;
  setTotalValues: (values: TotalValues) => void;
  isViewMode: boolean;
  isEditMode: boolean;
  isLoadingContract: boolean;
  contractData: ContractData | null;
  // AIDEV-NOTE: Estado compartilhado para alterações pendentes
  pendingServiceChanges: PendingServiceChanges;
  setPendingServiceChanges: (changes: PendingServiceChanges) => void;
  applyPendingChanges: () => void;
}

const ContractFormContext = createContext<ContractFormContextType | null>(null);

export const useContractForm = () => {
  const context = useContext(ContractFormContext);
  if (!context) {
    throw new Error("useContractForm deve ser usado dentro de um ContractFormProvider");
  }
  return context;
};

interface ContractFormProviderProps {
  mode?: "create" | "edit" | "view";
  contractId?: string;
  onSuccess: (contractId: string) => void;
  onCancel: () => void;
  onFormChange?: (hasChanges: boolean) => void;
  onEditRequest?: (contractId: string) => void;
  children: React.ReactNode;
}

// Função para calcular totais baseado nos serviços e produtos
const calculateTotals = (
  services: ServiceData[] = [], 
  products: ProductData[] = [], 
  contractDiscount: number = 0,
  cost_price?: number // AIDEV-NOTE: Custos reais da view vw_contract_services_detailed
) => {
  // Calcular subtotal de serviços
  const servicesSubtotal = services.reduce((sum, service) => {
    const quantity = service.quantity || 1;
    const unitPrice = service.unit_price || service.default_price || 0;
    const serviceTotal = quantity * unitPrice;
    return sum + serviceTotal;
  }, 0);

  // Calcular subtotal de produtos
  const productsSubtotal = products.reduce((sum, product) => {
    const quantity = product.quantity || 1;
    const unitPrice = product.price || product.unit_price || 0;
    const productTotal = quantity * unitPrice;
    return sum + productTotal;
  }, 0);

  const subtotal = servicesSubtotal + productsSubtotal;

  // Calcular desconto de serviços
  const servicesDiscount = services.reduce((sum, service) => {
    const quantity = service.quantity || 1;
    const unitPrice = service.unit_price || service.default_price || 0;
    const discountPercentage = service.discount_percentage || 0;
    const serviceTotal = quantity * unitPrice;
    const serviceDiscount = serviceTotal * (discountPercentage / 100);
    return sum + serviceDiscount;
  }, 0);

  // Calcular desconto de produtos
  const productsDiscount = products.reduce((sum, product) => {
    const quantity = product.quantity || 1;
    const unitPrice = product.price || product.unit_price || 0;
    const discountPercentage = product.discount_percentage || 0;
    const productTotal = quantity * unitPrice;
    const productDiscount = productTotal * (discountPercentage / 100);
    return sum + productDiscount;
  }, 0);

  const itemsDiscount = servicesDiscount + productsDiscount;
  const totalDiscount = itemsDiscount + contractDiscount;

  // Calcular impostos de serviços
  const servicesTax = services.reduce((sum, service) => {
    const quantity = service.quantity || 1;
    const unitPrice = service.unit_price || service.default_price || 0;
    const taxRate = service.tax_rate || 0;
    const discountPercentage = service.discount_percentage || 0;
    const serviceTotal = quantity * unitPrice;
    const afterDiscount = serviceTotal - (serviceTotal * (discountPercentage / 100));
    const serviceTax = afterDiscount * (taxRate / 100);
    return sum + serviceTax;
  }, 0);

  // Calcular impostos de produtos
  const productsTax = products.reduce((sum, product) => {
    const quantity = product.quantity || 1;
    const unitPrice = product.price || product.unit_price || 0;
    const taxRate = product.tax_rate || 0;
    const discountPercentage = product.discount_percentage || 0;
    const productTotal = quantity * unitPrice;
    const afterDiscount = productTotal - (productTotal * (discountPercentage / 100));
    const productTax = afterDiscount * (taxRate / 100);
    return sum + productTax;
  }, 0);

  const tax = servicesTax + productsTax;

  // AIDEV-NOTE: Calcular custos baseado em cost_price dos serviços ou cost_percentage
  // CORREÇÃO: Priorizar cost_price direto dos serviços quando disponível
  let costs: number;
  
  if (cost_price !== undefined) {
    // ✅ Usar custos reais da view vw_contract_services_detailed (para contratos existentes salvos)
    costs = cost_price;
  } else {
    // ✅ Calcular custos baseado em cost_price direto dos serviços ou cost_percentage
    const servicesCosts = services.reduce((sum, service) => {
      const quantity = service.quantity || 1;
      
      // AIDEV-NOTE: CORREÇÃO - Priorizar cost_price direto do serviço
      if (service.cost_price !== undefined && service.cost_price !== null && service.cost_price > 0) {
        // Usar cost_price direto multiplicado pela quantidade
        const serviceCost = (service.cost_price || 0) * quantity;
        return sum + serviceCost;
      }
      
      // Fallback: calcular por cost_percentage se cost_price não estiver disponível
      const unitPrice = service.unit_price || service.default_price || 0;
      const costPercentage = service.cost_percentage || 0;
      const serviceTotal = quantity * unitPrice;
      const serviceCost = serviceTotal * (costPercentage / 100);
      
      return sum + serviceCost;
    }, 0);
    costs = servicesCosts;
  }
  const total = subtotal - totalDiscount + tax;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(totalDiscount * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    costs: Math.round(costs * 100) / 100,
    total: Math.round(total * 100) / 100
  };
};

export function ContractFormProvider({
  mode = "create",
  contractId,
  onSuccess,
  onCancel,
  onFormChange,
  onEditRequest,
  children
}: ContractFormProviderProps) {
  // Estados do formulário
  const [formChanged, setFormChanged] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [activeTab, setActiveTab] = useState("servico");
  const [totalValues, setTotalValues] = useState({
    subtotal: 0,
    discount: 0,
    tax: 0,
    costs: 0,
    total: 0,
  });

  // AIDEV-NOTE: Estado para alterações pendentes de serviços
  const [pendingServiceChanges, setPendingServiceChanges] = useState<PendingServiceChanges>({});

  // Hook otimizado para carregamento de dados de edição
  const { data: contractData, isLoading: isLoadingContract, error: contractError, loadContract } = useContractEdit();

  // AIDEV-NOTE: Hook para buscar custos reais de contratos existentes
  console.log('🔍 [DEBUG] ContractFormProvider - contractId:', contractId);
  const { totalCosts: contractCosts, isLoading: isLoadingCosts } = useContractCosts(contractId);

  // Sempre edição quando houver um contrato selecionado
  const isEditMode = Boolean(contractId);
  const isViewMode = false; // Desativa o modo de visualização

  // Ref para evitar recarregamentos desnecessários
  const loadedContractRef = useRef<string | null>(null);
  const isLoadingRef = useRef<boolean>(false);

  // Configuração do formulário
  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      contract_number: mode === "create" ? `${new Date().getFullYear()}${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}` : "",
      billing_day: 10,
      anticipate_weekends: true,
      installments: 1,
      services: [],
      products: [],
      total_amount: 0,
      total_discount: 0,
      total_tax: 0,
      // ... outros valores padrão
    }
  });

  // AIDEV-NOTE: Função para aplicar alterações pendentes ao formulário
  const applyPendingChanges = React.useCallback(() => {
    const currentServices = form.getValues('services') || [];
    const updatedServices = currentServices.map(service => {
      const serviceId = service.service_id || service.id;
      const pendingChange = pendingServiceChanges[serviceId];
      
      if (pendingChange && pendingChange.hasChanges) {
        return {
          ...service,
          ...pendingChange.pendingChanges
        };
      }
      
      return service;
    });

    form.setValue('services', updatedServices);
    console.log('🔄 Alterações pendentes aplicadas:', Object.keys(pendingServiceChanges).length);
  }, [form, pendingServiceChanges]);

  // 🚀 CARREGAMENTO OTIMIZADO: Carregar dados do contrato quando contractId mudar
  useEffect(() => {
    if (contractId && isEditMode && loadedContractRef.current !== contractId && !isLoadingRef.current) {
      console.log('🔄 ContractFormProvider: Carregando contrato ID:', contractId);
      isLoadingRef.current = true;
      
      loadContract(contractId, form).then(() => {
        loadedContractRef.current = contractId;
        isLoadingRef.current = false;
        console.log('✅ ContractFormProvider: Contrato carregado, dados do formulário:', form.getValues());
        const services = form.getValues('services');
        console.log('📋 ContractFormProvider: Serviços no formulário após carregamento:', services?.length || 0, services);
      }).catch((error) => {
        console.error('❌ ContractFormProvider: Erro ao carregar contrato:', error);
        loadedContractRef.current = null;
        isLoadingRef.current = false;
      });
    } else if (!contractId) {
      // Limpar estado quando não há contrato selecionado
      loadedContractRef.current = null;
      isLoadingRef.current = false;
    }
  }, [contractId, isEditMode]); // Dependências mínimas

  // Exibir erro se houver problema no carregamento
  useEffect(() => {
    if (contractError) {
      console.error('❌ Erro ao carregar contrato:', contractError);
      toast.error(`Erro ao carregar contrato: ${contractError.message}`);
    }
  }, [contractError]);

  // Monitorar mudanças nos serviços, produtos e desconto do contrato e recalcular totais
  const services = form.watch('services');
  const products = form.watch('products');
  const contractDiscount = form.watch('total_discount') || 0;
  
  // AIDEV-NOTE: Função para calcular custos híbridos (backend + local)
  // CORREÇÃO: Agora calcula custos baseado em cost_price dos serviços quando disponível
  const calculateHybridCosts = useCallback((currentServices: any[]) => {
    if (!contractId || !contractCosts) {
      // Para contratos novos, calcular custos diretamente dos serviços
      // AIDEV-NOTE: CORREÇÃO - Calcular custos baseado em cost_price dos serviços
      let totalLocalCosts = 0;
      
      currentServices.forEach(service => {
        const quantity = service.quantity || 1;
        
        // Priorizar cost_price direto do serviço
        if (service.cost_price !== undefined && service.cost_price !== null && service.cost_price > 0) {
          totalLocalCosts += (service.cost_price || 0) * quantity;
        } else {
          // Fallback: calcular por cost_percentage
          const unitPrice = service.unit_price || service.default_price || 0;
          const costPercentage = service.cost_percentage || 0;
          const serviceTotal = quantity * unitPrice;
          const serviceCost = serviceTotal * (costPercentage / 100);
          totalLocalCosts += serviceCost;
        }
      });
      
      return totalLocalCosts > 0 ? totalLocalCosts : undefined;
    }

    // Para contratos existentes, combinar custos salvos + custos locais editados
    let totalLocalCosts = 0;
    let totalBackendCosts = contractCosts;

    currentServices.forEach(service => {
      const serviceId = service.service_id || service.id;
      const quantity = service.quantity || 1;
      
      // AIDEV-NOTE: CORREÇÃO - Verificar se o serviço tem cost_price editado localmente
      if (service.cost_price !== undefined && service.cost_price !== null && service.cost_price > 0) {
        // Serviço com cost_price editado - usar o valor editado
        totalLocalCosts += (service.cost_price || 0) * quantity;
      } else if (serviceId && typeof serviceId === 'string' && serviceId.length > 10) {
        // Serviço salvo no backend sem edição local - custo já está em contractCosts
        // Não adicionar novamente
      } else {
        // Serviço novo (local) - calcular custo usando cost_percentage
        const unitPrice = service.unit_price || 0;
        const costPercentage = service.cost_percentage || 0;
        const serviceTotal = quantity * unitPrice;
        const serviceCost = serviceTotal * (costPercentage / 100);
        totalLocalCosts += serviceCost;
      }
    });

    // AIDEV-NOTE: CORREÇÃO - Se há serviços com cost_price editado, recalcular todos os custos
    // Caso contrário, usar custos do backend + custos locais de novos serviços
    const hasEditedCostPrice = currentServices.some(s => 
      s.cost_price !== undefined && s.cost_price !== null && s.cost_price > 0
    );
    
    if (hasEditedCostPrice) {
      // Recalcular todos os custos baseado nos cost_price dos serviços
      let recalculatedCosts = 0;
      currentServices.forEach(service => {
        const quantity = service.quantity || 1;
        if (service.cost_price !== undefined && service.cost_price !== null && service.cost_price > 0) {
          recalculatedCosts += (service.cost_price || 0) * quantity;
        } else {
          // Para serviços sem cost_price, usar cost_percentage ou 0
          const unitPrice = service.unit_price || service.default_price || 0;
          const costPercentage = service.cost_percentage || 0;
          const serviceTotal = quantity * unitPrice;
          const serviceCost = serviceTotal * (costPercentage / 100);
          recalculatedCosts += serviceCost;
        }
      });
      return recalculatedCosts;
    }

    // Retornar custos do backend + custos locais de novos serviços
    return totalBackendCosts + totalLocalCosts;
  }, [contractId, contractCosts]);

  useEffect(() => {
    // Recalcular sempre que houver mudanças nos serviços, produtos ou desconto
    const hasItems = (services && services.length > 0) || (products && products.length > 0);
    
    // AIDEV-NOTE: Calcular custos híbridos para contratos existentes
    const hybridCosts = calculateHybridCosts(services || []);
    
    console.log('🔍 [DEBUG] Custos híbridos:', {
      contractId,
      contractCosts,
      hybridCosts,
      servicesCount: services?.length || 0,
      hasContractId: !!contractId,
      hasContractCosts: !!contractCosts
    });
    
    // AIDEV-NOTE: Incluir desconto do contrato e custos híbridos no cálculo dos totais
    const newTotals = calculateTotals(services || [], products || [], contractDiscount, hybridCosts);
    setTotalValues(newTotals);
    
    // AIDEV-NOTE: Atualizar apenas total_amount e total_tax
    // Não sobrescrever total_discount pois ele é gerenciado pelo ContractDiscounts
    form.setValue('total_amount', newTotals.total);
    form.setValue('total_tax', newTotals.tax);
    
    const itemsCount = (services?.length || 0) + (products?.length || 0);
    const costsSource = hybridCosts !== undefined ? 'custos híbridos (backend + local)' : 'cost_percentage';
    console.log('💰 Totais recalculados:', newTotals, 'para', (services?.length || 0), 'serviços e', (products?.length || 0), 'produtos', 'com desconto do contrato:', contractDiscount, 'usando', costsSource);
  }, [services, products, contractDiscount, contractId, contractCosts, form, calculateHybridCosts]);

  // Detectar mudanças no formulário
  const handleFormChange = () => {
    if (!isViewMode) {
      setFormChanged(true);
      if (onFormChange) {
        onFormChange(true);
      }
    }
  };

  // Monitorar mudanças no formulário
  useEffect(() => {
    if (onFormChange) {
      onFormChange(formChanged);
    }
  }, [formChanged, onFormChange]);

  // Contexto com todos os valores e funções
  const contextValue = {
    form,
    mode,
    formChanged,
    setFormChanged,
    isPending,
    setIsPending,
    activeTab,
    setActiveTab,
    totalValues,
    setTotalValues,
    isViewMode,
    isEditMode,
    isLoadingContract,
    contractData,
    // AIDEV-NOTE: Novos estados para alterações pendentes
    pendingServiceChanges,
    setPendingServiceChanges,
    applyPendingChanges
  };

  return (
    <ContractFormContext.Provider value={contextValue}>
      <FormProvider {...form}>
        {children}
      </FormProvider>
    </ContractFormContext.Provider>
  );
}
