import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ContractFormValues, contractFormSchema } from "../schema/ContractFormSchema";
import { useContractEdit } from "@/hooks/useContractEdit";
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
const calculateTotals = (services: ServiceData[] = [], products: ProductData[] = [], contractDiscount: number = 0) => {
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
  const total = subtotal - totalDiscount + tax;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(totalDiscount * 100) / 100,
    tax: Math.round(tax * 100) / 100,
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
    total: 0,
  });

  // AIDEV-NOTE: Estado para alterações pendentes de serviços
  const [pendingServiceChanges, setPendingServiceChanges] = useState<PendingServiceChanges>({});

  // Hook otimizado para carregamento de dados de edição
  const { data: contractData, isLoading: isLoadingContract, error: contractError, loadContract } = useContractEdit();

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
  
  useEffect(() => {
    // Recalcular sempre que houver mudanças nos serviços, produtos ou desconto
    const hasItems = (services && services.length > 0) || (products && products.length > 0);
    
    // AIDEV-NOTE: Incluir desconto do contrato no cálculo dos totais
    const newTotals = calculateTotals(services || [], products || [], contractDiscount);
    setTotalValues(newTotals);
    
    // AIDEV-NOTE: Atualizar apenas total_amount e total_tax
    // Não sobrescrever total_discount pois ele é gerenciado pelo ContractDiscounts
    form.setValue('total_amount', newTotals.total);
    form.setValue('total_tax', newTotals.tax);
    
    const itemsCount = (services?.length || 0) + (products?.length || 0);
    console.log('💰 Totais recalculados:', newTotals, 'para', (services?.length || 0), 'serviços e', (products?.length || 0), 'produtos', 'com desconto do contrato:', contractDiscount);
  }, [services, products, contractDiscount, form]);

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
