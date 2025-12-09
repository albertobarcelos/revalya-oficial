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
  // AIDEV-NOTE: Detalhamento por tipo de item
  services: {
    subtotal: number;
    discount: number;
    costs: number;
  };
  products: {
    subtotal: number;
    discount: number;
  };
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
  /** Dados pré-carregados para popular o formulário quando não há contractId (ex: standalone billing) */
  initialData?: Partial<ContractFormValues>;
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

  // AIDEV-NOTE: Calcular desconto de serviços (percentual OU valor fixo)
  const servicesDiscount = services.reduce((sum, service) => {
    const quantity = service.quantity || 1;
    const unitPrice = service.unit_price || service.default_price || 0;
    const serviceTotal = quantity * unitPrice;
    
    // Verificar se tem desconto fixo ou percentual
    const discountAmount = (service as any).discount_amount || 0;
    const discountPercentage = service.discount_percentage || 0;
    
    // Priorizar desconto fixo se existir, senão calcular por percentual
    const serviceDiscount = discountAmount > 0 
      ? discountAmount 
      : serviceTotal * (discountPercentage / 100);
    
    return sum + serviceDiscount;
  }, 0);

  // AIDEV-NOTE: Calcular desconto de produtos (percentual OU valor fixo)
  const productsDiscount = products.reduce((sum, product) => {
    const quantity = product.quantity || 1;
    const unitPrice = product.price || product.unit_price || 0;
    const productTotal = quantity * unitPrice;
    
    // Verificar se tem desconto fixo ou percentual
    const discountAmount = (product as any).discount_amount || 0;
    const discountPercentage = product.discount_percentage || 0;
    
    // Priorizar desconto fixo se existir, senão calcular por percentual
    const productDiscount = discountAmount > 0 
      ? discountAmount 
      : productTotal * (discountPercentage / 100);
    
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
    total: Math.round(total * 100) / 100,
    // AIDEV-NOTE: Detalhamento por tipo de item
    services: {
      subtotal: Math.round(servicesSubtotal * 100) / 100,
      discount: Math.round(servicesDiscount * 100) / 100,
      costs: Math.round(costs * 100) / 100 // Custos são apenas de serviços
    },
    products: {
      subtotal: Math.round(productsSubtotal * 100) / 100,
      discount: Math.round(productsDiscount * 100) / 100
    }
  };
};

export function ContractFormProvider({
  mode = "create",
  contractId,
  onSuccess,
  onCancel,
  onFormChange,
  onEditRequest,
  initialData,
  children
}: ContractFormProviderProps) {
  // Estados do formulário
  const [formChanged, setFormChanged] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [activeTab, setActiveTab] = useState("servico");
  const [totalValues, setTotalValues] = useState<TotalValues>({
    subtotal: 0,
    discount: 0,
    tax: 0,
    costs: 0,
    total: 0,
    // AIDEV-NOTE: Detalhamento por tipo de item
    services: {
      subtotal: 0,
      discount: 0,
      costs: 0
    },
    products: {
      subtotal: 0,
      discount: 0
    }
  });

  // AIDEV-NOTE: Estado para alterações pendentes de serviços
  const [pendingServiceChanges, setPendingServiceChanges] = useState<PendingServiceChanges>({});

  // Hook otimizado para carregamento de dados de edição
  const { data: contractData, isLoading: isLoadingContract, error: contractError, loadContract } = useContractEdit();

  // AIDEV-NOTE: Hook para buscar custos reais de contratos existentes
  const { totalCosts: contractCosts, isLoading: isLoadingCosts } = useContractCosts(contractId);

  // Sempre edição quando houver um contrato selecionado
  const isEditMode = Boolean(contractId);
  const isViewMode = false; // Desativa o modo de visualização

  // Ref para evitar recarregamentos desnecessários
  const loadedContractRef = useRef<string | null>(null);
  const isLoadingRef = useRef<boolean>(false);
  // AIDEV-NOTE: Ref para rastrear se initialData já foi aplicado (evitar reaplicações)
  const appliedInitialDataRef = useRef<string | null>(null);

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
  }, [form, pendingServiceChanges]);

  // 🚀 CARREGAMENTO OTIMIZADO: Carregar dados do contrato quando contractId mudar
  useEffect(() => {
    if (contractId && isEditMode && loadedContractRef.current !== contractId && !isLoadingRef.current) {
      isLoadingRef.current = true;
      
      loadContract(contractId, form).then(() => {
        loadedContractRef.current = contractId;
        isLoadingRef.current = false;
      }).catch((error) => {
        console.error('❌ Erro ao carregar contrato:', error);
        loadedContractRef.current = null;
        isLoadingRef.current = false;
      });
    } else if (!contractId && loadedContractRef.current) {
      // Limpar estado apenas após um delay para evitar "piscar" ao fechar dialog
      // Isso permite que o dialog feche suavemente antes de limpar o estado
      const timeoutId = setTimeout(() => {
        loadedContractRef.current = null;
        isLoadingRef.current = false;
      }, 200);
      
      return () => clearTimeout(timeoutId);
    }
  }, [contractId, isEditMode, form, loadContract]); // Dependências mínimas

  // AIDEV-NOTE: Aplicar initialData quando não há contractId (ex: standalone billing)
  useEffect(() => {
    if (!contractId && initialData && Object.keys(initialData).length > 0) {
      // AIDEV-NOTE: Criar uma chave única baseada no conteúdo do initialData para evitar reaplicações
      const initialDataKey = JSON.stringify(initialData);
      
      // AIDEV-NOTE: Só aplicar se ainda não foi aplicado ou se mudou
      if (appliedInitialDataRef.current !== initialDataKey) {
        console.log('📝 Aplicando initialData ao formulário:', initialData);
        // AIDEV-NOTE: Usar reset para aplicar todos os dados de uma vez
        form.reset({
          ...form.getValues(), // Manter valores atuais
          ...initialData, // Sobrescrever com initialData
        });
        appliedInitialDataRef.current = initialDataKey;
      }
    } else if (contractId) {
      // AIDEV-NOTE: Limpar ref quando há contractId (dados vêm do contrato)
      appliedInitialDataRef.current = null;
    }
  }, [contractId, initialData, form]);

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
    
    // AIDEV-NOTE: Incluir desconto do contrato e custos híbridos no cálculo dos totais
    const newTotals = calculateTotals(services || [], products || [], contractDiscount, hybridCosts);
    setTotalValues(newTotals);
    
    // AIDEV-NOTE: Atualizar apenas total_amount e total_tax
    // Não sobrescrever total_discount pois ele é gerenciado pelo ContractDiscounts
    form.setValue('total_amount', newTotals.total);
    form.setValue('total_tax', newTotals.tax);
    
    const itemsCount = (services?.length || 0) + (products?.length || 0);
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
