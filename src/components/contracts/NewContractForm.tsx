import React, { useState, useEffect } from "react";
import { FormProvider } from "react-hook-form";
import { toast } from "sonner";
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// PrimeReact imports
import { Button as PrimeButton } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { InputSwitch } from 'primereact/inputswitch';
import { InputTextarea } from 'primereact/inputtextarea';
import { Checkbox as PrimeCheckbox } from 'primereact/checkbox';
import { Dialog as PrimeDialog } from 'primereact/dialog';
import { TabView, TabPanel } from 'primereact/tabview';
import { Card } from 'primereact/card';
import { Divider } from 'primereact/divider';
import { InputNumber } from 'primereact/inputnumber';
import { Calendar } from 'primereact/calendar';
import { Panel } from 'primereact/panel';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toolbar } from 'primereact/toolbar';
import { Sidebar } from 'primereact/sidebar';
import { Badge } from 'primereact/badge';
import { Tag } from 'primereact/tag';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Splitter, SplitterPanel } from 'primereact/splitter';
import { ScrollPanel } from 'primereact/scrollpanel';
import { SelectButton } from 'primereact/selectbutton';
import { Avatar } from 'primereact/avatar';

// PrimeReact CSS
import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

// Componentes refatorados
import { ContractFormProvider, useContractForm } from "./form/ContractFormProvider";
import { ContractLoadingManager } from "./form/ContractLoadingManager";
import { ContractFormActions } from "./form/ContractFormActions";
import { CancelButton } from "./form/CancelButton";
import { ContractCancelButton } from "./ContractCancelButton";
import { ContractSuspendButton } from "./ContractSuspendButton";
import { ContractActivateButton } from "./ContractActivateButton";

// Importações dos ícones
import { 
  FileText, 
  Package, 
  Percent, 
  Building2, 
  Building, 
  MessageSquare,
  X,
  CreditCard,
  Calculator
} from "lucide-react";

// Hooks e serviços
import { useCustomers } from "@/hooks/useCustomers";
import { useContracts } from "@/hooks/useContracts";
import { useServices } from "@/hooks/useServices";
import { useSecureProducts } from "@/hooks/useSecureProducts";
import { useContract } from "@/hooks/useContractDetail";
import { useSupabase } from '@/hooks/useSupabase';

// Componentes UI
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Form, // Usado para FormField, não como wrapper principal aqui
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage 
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// Componentes do contrato
import { ContractBasicInfo } from "./parts/ContractBasicInfo";
import { ContractSidebar } from "./parts/ContractSidebar";
import { ContractFormHeader } from "./parts/ContractFormHeader";
import { AddServiceDialog } from "./AddServiceDialog";
import { ServiceSelection } from "./parts/ServiceSelection";
import { CreateServiceDialog } from "../services/CreateServiceDialog";
import { ContractProducts } from "./parts/ContractProducts";
import { RecebimentosHistorico, Recebimento } from "./parts/RecebimentosHistorico";
import { ContractTaxes } from "./parts/ContractTaxes";
import { ContractServices } from "./parts/ContractServices";

// Schema de validação Zod integrado
const contractSchema = z.object({
  clientType: z.enum(['individual', 'company']),
  clientName: z.string().min(1),
  clientEmail: z.string().email(),
  clientPhone: z.string().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/),
  clientDocument: z.string().min(1),
  contractNumber: z.string().min(1),
  contractType: z.enum(['service', 'product', 'subscription']),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  description: z.string().min(10),
  paymentMethod: z.enum(['cash', 'card', 'pix', 'bank_transfer']),
  billingType: z.enum(['monthly', 'quarterly', 'semiannual', 'annual', 'one_time']),
  amount: z.number().positive(),
  discount: z.number().min(0).max(100).optional(),
  autoRenewal: z.boolean().optional(),
  notifications: z.boolean().optional(),
  terms: z.boolean().refine(val => val === true, 'Aceite os termos')
});

type ContractFormData = z.infer<typeof contractSchema>;
// import { ContractTabs } from "./parts/ContractTabs"; // Não usado diretamente em NewContractForm

// Schema do formulário
import { ContractFormValues, contractFormSchema } from "./schema/ContractFormSchema";

// Inicialização do form com Zod resolver
// Assumindo que o form é inicializado em ContractFormProvider ou similar, ajustar conforme necessário
// Por exemplo, no useForm:
// const methods = useForm<ContractFormData>({
//   resolver: zodResolver(contractSchema),
//   defaultValues: { /* valores */ }
// });

// Interface para dados financeiros
interface FinancialData {
  paymentMethod: string;
  cardType?: string; // 'credit' ou 'credit_recurring' quando método for 'card'
  billingType: string;
  recurrenceFrequency?: string;
  installments?: number;
  paymentGateway?: string;
}

// Interface para dados de impostos
interface TaxData {
  nbs_code: string;
  deduction_value: number;
  service_calculation_base: number;
  iss_rate: number;
  iss_value: number;
  iss_withholding: boolean;
  ir_rate: number;
  ir_value: number;
  ir_withholding: boolean;
  pis_rate: number;
  pis_value: number;
  pis_withholding: boolean;
  cofins_rate: number;
  cofins_value: number;
  cofins_withholding: boolean;
  withholding_at_source: boolean;
  municipal_service: boolean;
  exempt_iss: boolean;
  suspended_iss: boolean;
}

// Removido o componente ContractServices local - agora usando o importado de ./parts/ContractServices

// Interface para dados de impostos e retenções
interface TaxData {
  nbs_code: string;
  deduction_value: number;
  service_calculation_base: number;
  total_item_value: number;
  iss_rate: number;
  iss_value: number;
  iss_withholding: boolean;
  ir_rate: number;
  ir_value: number;
  ir_withholding: boolean;
  csll_rate: number;
  csll_value: number;
  csll_withholding: boolean;
  inss_rate: number;
  inss_value: number;
  inss_withholding: boolean;
  pis_rate: number;
  pis_value: number;
  pis_withholding: boolean;
  cofins_rate: number;
  cofins_value: number;
  cofins_withholding: boolean;
  withholding_at_source: boolean;
  municipal_service: boolean;
  exempt_iss: boolean;
  suspended_iss: boolean;
}

// Novo componente para o formulário detalhado de cada serviço
interface ServiceDetailFormProps {
  service: {
    id?: string;
    name: string;
    description?: string;
    quantity?: number;
    unit_price?: number;
    tax_rate?: number;
    discount_percentage?: number;
    total_amount?: number;
    is_active?: boolean;
    taxation?: string;
    service_code?: string;
    lc116_code?: string;
    iss_rate?: number;
    iss_value?: number;
    withholding_tax?: boolean;
    taxes?: TaxData;
    // Campos financeiros
    payment_method?: string;
    card_type?: string;
    billing_type?: string;
    recurrence_frequency?: string;
    installments?: number;
  };
  index: number;
  onUpdate: (index: number, data: {
    name?: string;
    description?: string;
    quantity?: number;
    unit_price?: number;
    tax_rate?: number;
    discount_percentage?: number;
    total_amount?: number;
    is_active?: boolean;
    taxation?: string;
    service_code?: string;
    lc116_code?: string;
    iss_rate?: number;
    iss_value?: number;
    withholding_tax?: boolean;
    taxes?: TaxData;
    // Campos financeiros
    payment_method?: string;
    card_type?: string;
    billing_type?: string;
    recurrence_frequency?: string;
    installments?: number;
  }) => void;
  onClose: () => void;
}

function ServiceDetailForm({ service, index, onUpdate, onClose }: ServiceDetailFormProps) {
  const [formData, setFormData] = useState(service);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [taxData, setTaxData] = useState<TaxData>(service.taxes || {
    nbs_code: '',
    deduction_value: 0,
    service_calculation_base: 0,
    total_item_value: 0,
    iss_rate: 0,
    iss_value: 0,
    iss_withholding: false,
    ir_rate: 0,
    ir_value: 0,
    ir_withholding: false,
    csll_rate: 0,
    csll_value: 0,
    csll_withholding: false,
    inss_rate: 0,
    inss_value: 0,
    inss_withholding: false,
    pis_rate: 0,
    pis_value: 0,
    pis_withholding: false,
    cofins_rate: 0,
    cofins_value: 0,
    cofins_withholding: false,
    withholding_at_source: false,
    municipal_service: false,
    exempt_iss: false,
    suspended_iss: false
  });

  // Estados para configuração financeira - inicializar vazio para forçar seleção
  const [financialData, setFinancialData] = useState({
    paymentMethod: service.payment_method || "",
    billingType: service.billing_type || "",
    recurrenceFrequency: service.recurrence_frequency || "",
    installments: service.installments || 1, // AIDEV-NOTE: Valor padrão 1 para parcelas
    cardType: service.card_type || "",
    paymentGateway: service.payment_gateway || ""
  });
  
  // Estado para controlar o modal de seleção de tipo de cartão
  const [showCardTypeDialog, setShowCardTypeDialog] = useState(false);

  // Sincronizar financialData quando os dados do serviço mudarem
  useEffect(() => {
    setFinancialData({
      paymentMethod: service.payment_method || "",
      billingType: service.billing_type || "",
      recurrenceFrequency: service.recurrence_frequency || "",
      installments: service.installments || 1, // AIDEV-NOTE: Valor padrão 1 para parcelas
      cardType: service.card_type || "",
      paymentGateway: service.payment_gateway || ""
    });
  }, [service.payment_method, service.billing_type, service.recurrence_frequency, service.installments, service.card_type, service.payment_gateway]);

  const handleChange = (field: string, value: string | number | boolean) => {
    const updatedData = { ...formData, [field]: value };
    
    // Recalcular total se quantidade ou preço unitário mudaram
    if (field === 'quantity' || field === 'unit_price') {
      updatedData.total_amount = (updatedData.quantity || 1) * (updatedData.unit_price || 0);
    }
    
    setFormData(updatedData);
    onUpdate(index, updatedData);
  };

  const handleEditTaxes = () => {
    setShowTaxModal(true);
  };

  const handleSaveTaxes = () => {
    const updatedData = { ...formData, taxes: taxData };
    setFormData(updatedData);
    onUpdate(index, updatedData);
    setShowTaxModal(false);
    toast.success('Impostos e retenções salvos com sucesso!');
  };

  // Função handleSaveFinancialConfig removida - alterações serão salvas pela sidebar

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h5 className="font-medium">Configuração do Serviço</h5>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          ✕ Fechar
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Detalhes do Serviço</TabsTrigger>
          <TabsTrigger value="financial">Detalhes Financeiros</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="space-y-4 mt-6">

      {/* LINHA 2: Campos de tributação lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end mb-6">
        <div>
          <Label className="text-sm font-medium text-foreground mb-2 block">
            Tributação dos Serviços
          </Label>
          <Select 
            defaultValue={formData.taxation || "tributado"}
            onValueChange={(value) => handleChange('taxation', value)}
          >
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tributado">Tributado no município</SelectItem>
              <SelectItem value="isento">Isento</SelectItem>
              <SelectItem value="suspenso">Suspenso</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium text-foreground mb-2 block">
            Código do Serviço ou CNAE
          </Label>
          <Input 
            className="h-10" 
            value={formData.service_code || ""} 
            onChange={(e) => handleChange('service_code', e.target.value)}
            placeholder="Ex: 1234"
          />
        </div>

        <div>
          <Label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-1">
            Código do Serviço LC 116
            <span className="text-primary cursor-help" title="Informação sobre LC 116">ℹ️</span>
          </Label>
          <Input 
            className="h-10" 
            value={formData.lc116_code || ""} 
            onChange={(e) => handleChange('lc116_code', e.target.value)}
            placeholder="Ex: 01.01"
          />
        </div>

        <div className="flex items-end">
          <Button 
            type="button" 
            variant="outline"
            size="sm"
            onClick={handleEditTaxes}
            className="text-sm flex items-center gap-1 h-10"
          >
            ✏️ Editar impostos
          </Button>
        </div>
      </div>

      {/* LINHA 3: Campos numéricos horizontais */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">
            Quantidade
          </label>
          <Input 
            type="number" 
            className="h-9 text-sm text-center" 
            value={formData.quantity || 1}
            onChange={(e) => handleChange('quantity', parseFloat(e.target.value) || 0)}
            step="0.000001"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1">
            Valor Unitário do Item
          </label>
          <Input 
            type="number" 
            className="h-9 text-sm text-right" 
            value={formData.unit_price || 0}
            onChange={(e) => handleChange('unit_price', parseFloat(e.target.value) || 0)}
            step="0.000001"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1">
            % do Desconto
          </label>
          <Input 
            type="number" 
            className="h-9 text-sm text-right" 
            value={formData.discount_percentage || 0}
            onChange={(e) => handleChange('discount_percentage', parseFloat(e.target.value) || 0)}
            step="0.000000001"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1">
            Valor Total do Item
          </label>
          <Input 
            type="number" 
            className="h-9 text-sm text-right bg-muted/50" 
            value={formData.total_amount?.toFixed(2) || ((formData.quantity || 1) * (formData.unit_price || 0)).toFixed(2)}
            readOnly
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1">
            Alíquota ISS (%)
          </label>
          <Input 
            type="number" 
            className="h-9 text-sm text-right" 
            value={formData.iss_rate || 0}
            onChange={(e) => handleChange('iss_rate', parseFloat(e.target.value) || 0)}
            step="0.0001"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1">
            Valor do ISS
          </label>
          <Input 
            type="number" 
            className="h-9 text-sm text-right" 
            value={formData.iss_value || 0}
            onChange={(e) => handleChange('iss_value', parseFloat(e.target.value) || 0)}
            step="0.0001"
          />
        </div>
      </div>

      {/* Checkbox Retido na fonte */}
      <div className="flex items-center gap-2 mb-4">
        <Checkbox 
          id={`retido-fonte-${index}`} 
          className="w-4 h-4"
          checked={formData.withholding_tax || false}
          onCheckedChange={(checked) => handleChange('withholding_tax', checked)}
        />
        <label htmlFor={`retido-fonte-${index}`} className="text-sm text-foreground">
          Retido na fonte
        </label>
      </div>

      {/* LINHA 4: Campo grande de descrição */}
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">
          Descrição do Serviço
        </label>
        <Textarea 
          className="w-full h-24 text-sm resize-none" 
          value={formData.description || "Serviços prestados"}
          onChange={(e) => handleChange('description', e.target.value)}
        />
      </div>

      {/* Modal de Impostos e Retenções */}
      <Dialog open={showTaxModal} onOpenChange={setShowTaxModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Impostos e Retenções</DialogTitle>
            <DialogDescription>
              Configure os impostos e retenções para este serviço
            </DialogDescription>
          </DialogHeader>
          
          {/* Informações Básicas - Sempre Visíveis */}
          <div className="space-y-4 border-b pb-4 mb-4">
            <h4 className="font-medium text-lg">Informações Básicas</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nbs_code">Código NBS</Label>
                <Input
                  id="nbs_code"
                  value={taxData.nbs_code}
                  onChange={(e) => setTaxData({...taxData, nbs_code: e.target.value})}
                  placeholder="Ex: 1.0101"
                />
              </div>
              <div>
                <Label htmlFor="deduction_value">Valor da Dedução</Label>
                <Input
                  id="deduction_value"
                  type="number"
                  step="0.01"
                  value={taxData.deduction_value}
                  onChange={(e) => setTaxData({...taxData, deduction_value: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="service_calculation_base">Base de Cálculo do Serviço</Label>
                <Input
                  id="service_calculation_base"
                  type="number"
                  step="0.01"
                  value={taxData.service_calculation_base}
                  onChange={(e) => setTaxData({...taxData, service_calculation_base: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label htmlFor="total_item_value">Valor Total do Item</Label>
                <Input
                  id="total_item_value"
                  type="number"
                  step="0.01"
                  value={taxData.total_item_value}
                  onChange={(e) => setTaxData({...taxData, total_item_value: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
          </div>
          
          <Tabs defaultValue="impostos" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="impostos">Impostos e Retenções</TabsTrigger>
              <TabsTrigger value="transparencia">Lei da Transparência</TabsTrigger>
              <TabsTrigger value="outras">Outras Informações</TabsTrigger>
            </TabsList>
            
            <TabsContent value="impostos" className="space-y-6 mt-6">

            {/* Impostos */}
            <div className="space-y-4">
              <h4 className="font-medium text-lg">Impostos</h4>
              
              {/* ISS */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium">ISS (Imposto Sobre Serviços)</h5>
                  <Checkbox
                    checked={taxData.iss_withholding}
                    onCheckedChange={(checked) => setTaxData({...taxData, iss_withholding: checked as boolean})}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="iss_rate">Alíquota (%)</Label>
                    <Input
                      id="iss_rate"
                      type="number"
                      step="0.0001"
                      value={taxData.iss_rate}
                      onChange={(e) => setTaxData({...taxData, iss_rate: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="iss_value">Valor</Label>
                    <Input
                      id="iss_value"
                      type="number"
                      step="0.01"
                      value={taxData.iss_value}
                      onChange={(e) => setTaxData({...taxData, iss_value: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
              </div>

              {/* IR */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium">IR (Imposto de Renda)</h5>
                  <Checkbox
                    checked={taxData.ir_withholding}
                    onCheckedChange={(checked) => setTaxData({...taxData, ir_withholding: checked as boolean})}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ir_rate">Alíquota (%)</Label>
                    <Input
                      id="ir_rate"
                      type="number"
                      step="0.0001"
                      value={taxData.ir_rate}
                      onChange={(e) => setTaxData({...taxData, ir_rate: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ir_value">Valor</Label>
                    <Input
                      id="ir_value"
                      type="number"
                      step="0.01"
                      value={taxData.ir_value}
                      onChange={(e) => setTaxData({...taxData, ir_value: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
              </div>

              {/* CSLL */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium">CSLL (Contribuição Social sobre o Lucro Líquido)</h5>
                  <Checkbox
                    checked={taxData.csll_withholding}
                    onCheckedChange={(checked) => setTaxData({...taxData, csll_withholding: checked as boolean})}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="csll_rate">Alíquota (%)</Label>
                    <Input
                      id="csll_rate"
                      type="number"
                      step="0.0001"
                      value={taxData.csll_rate}
                      onChange={(e) => setTaxData({...taxData, csll_rate: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="csll_value">Valor</Label>
                    <Input
                      id="csll_value"
                      type="number"
                      step="0.01"
                      value={taxData.csll_value}
                      onChange={(e) => setTaxData({...taxData, csll_value: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
              </div>

              {/* INSS */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium">INSS (Instituto Nacional do Seguro Social)</h5>
                  <Checkbox
                    checked={taxData.inss_withholding}
                    onCheckedChange={(checked) => setTaxData({...taxData, inss_withholding: checked as boolean})}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="inss_rate">Alíquota (%)</Label>
                    <Input
                      id="inss_rate"
                      type="number"
                      step="0.0001"
                      value={taxData.inss_rate}
                      onChange={(e) => setTaxData({...taxData, inss_rate: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="inss_value">Valor</Label>
                    <Input
                      id="inss_value"
                      type="number"
                      step="0.01"
                      value={taxData.inss_value}
                      onChange={(e) => setTaxData({...taxData, inss_value: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
              </div>

              {/* PIS */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium">PIS (Programa de Integração Social)</h5>
                  <Checkbox
                    checked={taxData.pis_withholding}
                    onCheckedChange={(checked) => setTaxData({...taxData, pis_withholding: checked as boolean})}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="pis_rate">Alíquota (%)</Label>
                    <Input
                      id="pis_rate"
                      type="number"
                      step="0.0001"
                      value={taxData.pis_rate}
                      onChange={(e) => setTaxData({...taxData, pis_rate: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pis_value">Valor</Label>
                    <Input
                      id="pis_value"
                      type="number"
                      step="0.01"
                      value={taxData.pis_value}
                      onChange={(e) => setTaxData({...taxData, pis_value: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
              </div>

              {/* COFINS */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium">COFINS (Contribuição para o Financiamento da Seguridade Social)</h5>
                  <Checkbox
                    checked={taxData.cofins_withholding}
                    onCheckedChange={(checked) => setTaxData({...taxData, cofins_withholding: checked as boolean})}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cofins_rate">Alíquota (%)</Label>
                    <Input
                      id="cofins_rate"
                      type="number"
                      step="0.0001"
                      value={taxData.cofins_rate}
                      onChange={(e) => setTaxData({...taxData, cofins_rate: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cofins_value">Valor</Label>
                    <Input
                      id="cofins_value"
                      type="number"
                      step="0.01"
                      value={taxData.cofins_value}
                      onChange={(e) => setTaxData({...taxData, cofins_value: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Opções Adicionais */}
            <div className="space-y-3">
              <h4 className="font-medium text-lg">Opções Adicionais</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="withholding_at_source"
                    checked={taxData.withholding_at_source}
                    onCheckedChange={(checked) => setTaxData({...taxData, withholding_at_source: checked as boolean})}
                  />
                  <Label htmlFor="withholding_at_source">Retenção na Fonte</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="municipal_service"
                    checked={taxData.municipal_service}
                    onCheckedChange={(checked) => setTaxData({...taxData, municipal_service: checked as boolean})}
                  />
                  <Label htmlFor="municipal_service">Serviço Municipal</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="exempt_iss"
                    checked={taxData.exempt_iss}
                    onCheckedChange={(checked) => setTaxData({...taxData, exempt_iss: checked as boolean})}
                  />
                  <Label htmlFor="exempt_iss">Isento de ISS</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="suspended_iss"
                    checked={taxData.suspended_iss}
                    onCheckedChange={(checked) => setTaxData({...taxData, suspended_iss: checked as boolean})}
                  />
                  <Label htmlFor="suspended_iss">ISS Suspenso</Label>
                </div>
              </div>
            </div>
            </TabsContent>
            
            <TabsContent value="transparencia" className="space-y-6 mt-6">
              <div className="space-y-4">
                <h4 className="font-medium text-lg">Informações sobre Tributos Incidentes</h4>
                <p className="text-sm text-muted-foreground">
                  Conforme Lei nº 12.741/2012, informamos a carga tributária aproximada incidente sobre este serviço:
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Tributos Federais */}
                  <div className="border rounded-lg p-4">
                    <h5 className="font-medium mb-3 text-primary">Tributos Federais</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>IR (Imposto de Renda):</span>
                        <span className="font-medium">R$ {taxData.ir_value.toFixed(2)} ({taxData.ir_rate.toFixed(4)}%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>CSLL:</span>
                        <span className="font-medium">R$ {taxData.csll_value.toFixed(2)} ({taxData.csll_rate.toFixed(4)}%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>INSS:</span>
                        <span className="font-medium">R$ {taxData.inss_value.toFixed(2)} ({taxData.inss_rate.toFixed(4)}%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>PIS:</span>
                        <span className="font-medium">R$ {taxData.pis_value.toFixed(2)} ({taxData.pis_rate.toFixed(4)}%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>COFINS:</span>
                        <span className="font-medium">R$ {taxData.cofins_value.toFixed(2)} ({taxData.cofins_rate.toFixed(4)}%)</span>
                      </div>
                      <hr className="my-2" />
                      <div className="flex justify-between font-medium text-primary">
                        <span>Total Federal:</span>
                        <span>R$ {(taxData.ir_value + taxData.csll_value + taxData.inss_value + taxData.pis_value + taxData.cofins_value).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Tributos Municipais */}
                  <div className="border rounded-lg p-4">
                    <h5 className="font-medium mb-3 text-success">Tributos Municipais</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>ISS (Imposto Sobre Serviços):</span>
                        <span className="font-medium">R$ {taxData.iss_value.toFixed(2)} ({taxData.iss_rate.toFixed(4)}%)</span>
                      </div>
                      <hr className="my-2" />
                      <div className="flex justify-between font-medium text-success">
                        <span>Total Municipal:</span>
                        <span>R$ {taxData.iss_value.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Resumo Total */}
                <div className="border-2 border-primary/20 rounded-lg p-4 bg-primary/5">
                  <div className="text-center space-y-2">
                    <h5 className="font-semibold text-lg">Total Aproximado de Tributos</h5>
                    <div className="text-2xl font-bold text-primary">
                      R$ {(taxData.ir_value + taxData.csll_value + taxData.inss_value + taxData.pis_value + taxData.cofins_value + taxData.iss_value).toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Percentual da Carga Tributária: {(
                        ((taxData.ir_value + taxData.csll_value + taxData.inss_value + taxData.pis_value + taxData.cofins_value + taxData.iss_value) / 
                        (taxData.total_item_value || 1)) * 100
                      ).toFixed(2)}% do valor do serviço
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
                  <p className="font-medium mb-1">Informações Adicionais:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Os valores apresentados são aproximados e podem variar conforme a legislação vigente.</li>
                    <li>Esta informação atende ao disposto na Lei nº 12.741/2012.</li>
                    <li>Para mais informações sobre a carga tributária, consulte: www.ibpt.org.br</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="outras" className="space-y-6 mt-6">
              <div className="space-y-4">
                {/* Opção de não gerar conta a receber */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="no_receivable"
                    checked={false}
                    onCheckedChange={() => {}}
                  />
                  <Label htmlFor="no_receivable" className="text-primary">Não gerar conta a receber para este item</Label>
                </div>
                
                {/* Categoria do Item e Serviço Cadastrado */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="item_category">Categoria do Item</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Clientes - Venda de PDV" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clientes-pdv">Clientes - Venda de PDV</SelectItem>
                        <SelectItem value="servicos">Serviços</SelectItem>
                        <SelectItem value="produtos">Produtos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="registered_service">Serviço Cadastrado</Label>
                    <div className="flex">
                      <Input
                        id="registered_service"
                        placeholder="-"
                        className="flex-1"
                      />
                      <Button variant="outline" size="sm" className="ml-2">
                        <span className="text-warning">📁</span>
                      </Button>
                      <Button variant="outline" size="sm" className="ml-1">
                        🔍
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Vigência */}
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start_validity">Vigência Inicial</Label>
                      <Input
                        id="start_validity"
                        type="date"
                      />
                    </div>
                    
                    {/* Campo de Vigência Final - Só aparece quando todos os checkboxes estão verdadeiros */}
                    {(() => {
                      const hasSpecificDate = formData?.end_date ? true : false;
                      const followsContractValidity = formData?.inherit_contract_validity || false;
                      const validNextBillingOnly = formData?.next_billing_only || false;
                      const allChecked = hasSpecificDate && followsContractValidity && validNextBillingOnly;
                      
                      return allChecked ? (
                        <div>
                          <Label htmlFor="end_validity">Vigência Final</Label>
                          <Input
                            id="end_validity"
                            type="date"
                            className=""
                          />
                        </div>
                      ) : null;
                    })()}
                  </div>
                  
                  {/* Opções de Vigência - Somente Leitura com Ícones */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 flex items-center justify-center">
                        {(() => {
                          // Regra: Verdadeiro se o contrato tiver data de término definida
                          const isChecked = formData?.end_date ? true : false;
                          return isChecked ? (
                            <span className="text-success text-lg">✓</span>
                          ) : (
                            <span className="text-danger text-lg">✗</span>
                          );
                        })()}
                      </div>
                      <Label className="text-primary cursor-default">Preencher uma data específica</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 flex items-center justify-center">
                        {(() => {
                          // Regra: Verdadeiro se o item herdar vigência do contrato
                          const isChecked = formData?.inherit_contract_validity || false;
                          return isChecked ? (
                            <span className="text-success text-lg">✓</span>
                          ) : (
                            <span className="text-danger text-lg">✗</span>
                          );
                        })()}
                      </div>
                      <Label className="text-primary cursor-default">Seguir a vigência final do contrato</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 flex items-center justify-center">
                        {(() => {
                          // Regra: Verdadeiro se o item for só para o próximo faturamento
                          const isChecked = formData?.next_billing_only || false;
                          return isChecked ? (
                            <span className="text-success text-lg">✓</span>
                          ) : (
                            <span className="text-danger text-lg">✗</span>
                          );
                        })()}
                      </div>
                      <Label className="text-primary cursor-default">Válido apenas para o próximo faturamento do contrato</Label>
                    </div>
                  </div>
                  
                  {/* Informação sobre o estado dos campos */}
                  <div className="text-sm text-muted-foreground bg-primary/10 p-3 rounded-md">
                    <p className="font-medium mb-1">ℹ️ Informações sobre Vigência:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Os ícones são calculados automaticamente com base nos dados do contrato</li>
                      <li>O campo "Vigência Final" só aparece quando todos os três ícones estão com ✓</li>
                      <li>Estas configurações seguem as regras de negócio do sistema</li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowTaxModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTaxes}>
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
        </TabsContent>
        
        <TabsContent value="financial" className="space-y-6 mt-6">
          <div className="space-y-6">
            <h4 className="font-medium text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Configuração Financeira
            </h4>
            
            {/* Método de Pagamento - Cards visuais */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground">Método de Pagamento</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { value: 'money', label: 'Dinheiro', icon: '💵', desc: 'Pagamento em espécie' },
                  { value: 'card', label: 'Cartão', icon: '💳', desc: 'Crédito ou crédito recorrente' },
                  { value: 'pix', label: 'PIX', icon: '📱', desc: 'Transferência instantânea' }
                ].map((method) => {
                  // Função para lidar com clique no método de pagamento
                  const handleMethodClick = () => {
                    if (method.value === 'card') {
                      setShowCardTypeDialog(true);
                    } else {
                      setFinancialData({...financialData, paymentMethod: method.value, cardType: undefined});
                    }
                  };

                  // Determinar o label e descrição do cartão baseado no tipo selecionado
                  const getCardLabel = () => {
                    if (method.value === 'card' && financialData.cardType) {
                      return `Cartão ${financialData.cardType === 'credit_recurring' ? 'Crédito Recorrente' : 'Crédito'}`;
                    }
                    return method.label;
                  };

                  const getCardDesc = () => {
                    if (method.value === 'card' && financialData.cardType) {
                      return financialData.cardType === 'credit_recurring' ? 'Cartão de crédito recorrente' : 'Cartão de crédito';
                    }
                    return method.desc;
                  };

                  return (
                    <div
                      key={method.value}
                      className={cn(
                        "border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md",
                        financialData.paymentMethod === method.value
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-border/60"
                      )}
                      onClick={handleMethodClick}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{method.icon}</span>
                        <div>
                          <p className="font-medium text-sm">{getCardLabel()}</p>
                          <p className="text-xs text-muted-foreground">{getCardDesc()}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Quantidade de Parcelas para cartão - aparece após escolher tipo de cartão e apenas para crédito normal */}
            {financialData.paymentMethod === 'card' && financialData.cardType === 'credit' && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">Quantidade de Parcelas</Label>
                <div className="bg-muted/50 rounded-lg p-4 border">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">📊</span>
                    <div>
                      <p className="font-medium text-sm">Parcelamento</p>
                      <p className="text-xs text-muted-foreground">
                        Defina o número de parcelas (máximo 6x para cartão)
                      </p>
                    </div>
                  </div>
                  <Input
                    type="number"
                    min="2"
                    max="6"
                    value={financialData.installments}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 2;
                      setFinancialData({...financialData, installments: Math.min(value, 6)});
                    }}
                    placeholder="Número de parcelas"
                    className="w-full"
                  />
                </div>
              </div>
            )}
            
            {/* Tipo de Faturamento - Cards visuais - só aparece após escolher método de pagamento */}
            {financialData.paymentMethod && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">Tipo de Faturamento</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { value: 'single', label: 'Único', icon: '📄', desc: 'Pagamento único' },
                    { value: 'recurring', label: 'Recorrente', icon: '🔄', desc: 'Cobrança periódica' },
                    { value: 'installment', label: 'Parcelado', icon: '📊', desc: 'Dividido em parcelas' }
                  ].map((type) => {
                    // AIDEV-NOTE: Se cartão crédito simples, só permitir 'single' (único). Credit_recurring permite parcelado e recorrente
                    const isDisabled = financialData.paymentMethod === 'money' || 
                      (financialData.paymentMethod === 'card' && financialData.cardType === 'credit' && type.value !== 'single');
                    
                    return (
                      <div
                        key={type.value}
                        className={cn(
                          "border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md",
                          financialData.billingType === type.value
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-border/60",
                          isDisabled && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={() => {
                          if (!isDisabled) {
                            setFinancialData({...financialData, billingType: type.value})
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{type.icon}</span>
                          <div>
                            <p className="font-medium text-sm">{type.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {type.desc}
                              {financialData.paymentMethod === 'card' && financialData.cardType === 'credit' && type.value !== 'single' && 
                                ' (Não disponível para cartão crédito simples)'
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Quantidade de Parcelas para faturamento parcelado (não cartão) - aparece logo após selecionar 'Parcelado' */}
            {financialData.billingType === 'installment' && 
              financialData.paymentMethod !== 'card' && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">Quantidade de Parcelas</Label>
                <div className="bg-muted/50 rounded-lg p-4 border">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">📊</span>
                    <div>
                      <p className="font-medium text-sm">Parcelamento</p>
                      <p className="text-xs text-muted-foreground">
                        Defina o número de parcelas (máximo 60x)
                      </p>
                    </div>
                  </div>
                  <Input
                    type="number"
                    min="2"
                    max="60"
                    value={financialData.installments}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 2;
                      setFinancialData({...financialData, installments: Math.min(value, 60)});
                    }}
                    placeholder="Número de parcelas"
                    className="w-full"
                  />
                </div>
              </div>
            )}
            
            {/* Frequência de Recorrência - só aparece se for recorrente e após escolher método de pagamento */}
            {financialData.paymentMethod && financialData.billingType === 'recurring' && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">Frequência de Recorrência</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { value: 'monthly', label: 'Mensal', icon: '📅' },
                    { value: 'quarterly', label: 'Trimestral', icon: '🗓️' },
                    { value: 'semiannual', label: 'Semestral', icon: '📆' },
                    { value: 'annual', label: 'Anual', icon: '🗓️' }
                  ].map((freq) => (
                    <div
                      key={freq.value}
                      className={cn(
                        "border-2 rounded-lg p-3 cursor-pointer transition-all duration-200 hover:shadow-md text-center",
                        financialData.recurrenceFrequency === freq.value
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-border/60"
                      )}
                      onClick={() => setFinancialData({...financialData, recurrenceFrequency: freq.value})}
                    >
                      <span className="text-xl block mb-1">{freq.icon}</span>
                      <p className="font-medium text-xs">{freq.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Gateway de Pagamento - só aparece após escolher método de pagamento e se não for dinheiro */}
            {financialData.paymentMethod && financialData.paymentMethod !== 'money' && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">Gateway de Pagamento</Label>
                <div className="bg-muted/50 rounded-lg p-4 border">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">🏦</span>
                    <div>
                      <p className="font-medium text-sm">Processador de Pagamento</p>
                      <p className="text-xs text-muted-foreground">Selecione o gateway para processar os pagamentos</p>
                    </div>
                  </div>
                  <Dropdown
                    value={financialData.paymentGateway}
                    onChange={(e) => setFinancialData({...financialData, paymentGateway: e.value})}
                    options={[
                      { label: 'Asaas', value: 'asaas' },
                      { label: 'Cora', value: 'cora' },
                      { label: 'Itaú', value: 'itau' },
                      { label: 'Omie', value: 'omie' },
                      { label: 'Conta Azul', value: 'conta_azul' },
                      { label: 'PagSeguro', value: 'pagseguro' },
                      { label: 'Mercado Pago', value: 'mercado_pago' },
                      { label: 'Stripe', value: 'stripe' },
                      { label: 'PayPal', value: 'paypal' },
                      { label: 'Outro', value: 'other' }
                    ]}
                    placeholder="Selecione um gateway"
                    className="w-full"
                  />
                </div>
              </div>
            )}
            
            {/* Botão removido - alterações serão salvas pela sidebar */}
          </div>
        </TabsContent>

        {/* Dialog para seleção do tipo de cartão */}
        <Dialog open={showCardTypeDialog} onOpenChange={setShowCardTypeDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Selecionar Tipo de Cartão
              </DialogTitle>
              <DialogDescription>
                Escolha o tipo de cartão para o pagamento
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              {[
                { value: 'credit', label: 'Crédito', icon: '💎', desc: 'Cartão de crédito' },
                { value: 'credit_recurring', label: 'Crédito Recorrente', icon: '🔄', desc: 'Cartão de crédito recorrente' }
              ].map((cardType) => (
                <div
                  key={cardType.value}
                  className="border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50 text-center"
                  onClick={() => {
                    // AIDEV-NOTE: Lógica para cartão conforme especificação:
                    // 1. Se crédito -> tipo de faturamento padrão "único" + parcelas aparecem
                    // 2. Se crédito recorrente -> tipo de faturamento padrão "recorrente" + sem parcelamento
                    const newFinancialData = {
                      ...financialData, 
                      paymentMethod: 'card',
                      cardType: cardType.value,
                      // Definir tipo de faturamento padrão baseado no tipo de cartão
                      billingType: cardType.value === 'credit' ? 'single' : 'recurring',
                      // Resetar parcelas se for crédito recorrente (não possui parcelamento)
                      installments: cardType.value === 'credit_recurring' ? 1 : financialData.installments
                    };
                    setFinancialData(newFinancialData);
                    setShowCardTypeDialog(false);
                  }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">{cardType.icon}</span>
                    <div>
                      <p className="font-medium text-sm">{cardType.label}</p>
                      <p className="text-xs text-muted-foreground">{cardType.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </Tabs>
    </div>
  );
}



interface NewContractFormProps {
  mode?: "create" | "edit" | "view";
  contractId?: string;
  onSuccess: (contractId: string) => void;
  onCancel: () => void;
  onFormChange?: (hasChanges: boolean) => void;
  onEditRequest?: (contractId: string) => void;
  forceRefreshContracts?: () => Promise<void>;
  isModal?: boolean; // AIDEV-NOTE: Controla se está sendo usado em modal ou tela cheia
  fromBilling?: boolean; // AIDEV-NOTE: Indica se o modal foi aberto a partir do kanban de faturamento
}

export function NewContractForm({ mode = "create", contractId, onSuccess, onCancel, onFormChange, onEditRequest, forceRefreshContracts, isModal = false, fromBilling = false }: NewContractFormProps) {
  const [activeTab, setActiveTab] = useState("servico");
  
  const { customers, refetch: refetchCustomers } = useCustomers();
  const { data: servicesData, refetch } = useServices(); // Renomeado para evitar conflito com a prop 'services'
  const availableServices = servicesData?.data || [];
  
  const handleClientCreated = async (clientId: string) => {
    await refetchCustomers();
  };

  return (
    <ContractFormProvider
      mode={mode}
      contractId={contractId}
      onSuccess={onSuccess}
      onCancel={onCancel}
      onFormChange={onFormChange}
      onEditRequest={onEditRequest}
    >
      <ContractLoadingManager contractId={contractId}>
        <ContractFormContent 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          customers={customers || []} 
          services={availableServices || []} // Passar os serviços disponíveis para o contexto do formulário/conteúdo
          onClientCreated={handleClientCreated}
          contractId={contractId}
          mode={mode}
          onSuccess={onSuccess}
          onCancel={onCancel}
          onEditRequest={onEditRequest}
          forceRefreshContracts={forceRefreshContracts}
          isModal={isModal}
          fromBilling={fromBilling}
        />
      </ContractLoadingManager>
    </ContractFormProvider>
  );
}

// Função auxiliar para estilização dos botões de navegação
const getNavButtonClass = (isActive: boolean) => 
  `flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-all duration-200
   ${isActive 
     ? 'bg-primary/10 text-primary shadow-inner' 
     : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}`;

interface ContractFormContentProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  customers: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    document?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
  }[];
  services: Array<{
    id: string;
    name: string;
    description?: string;
    default_price?: number;
    price?: number;
    tax_rate?: number;
    is_active?: boolean;
    created_at?: string;
    tenant_id?: string;
  }>; // Available services for selection or viewing
  onClientCreated: (clientId: string) => void;
  contractId?: string;
  mode: "create" | "edit" | "view";
  onSuccess: (contractId: string) => void;
  onCancel: () => void;
  onEditRequest?: (contractId: string) => void;
  isFieldLoading?: (fieldName: string) => boolean;
  forceRefreshContracts?: () => Promise<void>;
  isModal?: boolean; // AIDEV-NOTE: Controla se está sendo usado em modal ou tela cheia
  fromBilling?: boolean; // AIDEV-NOTE: Indica se o modal foi aberto a partir do kanban de faturamento
}

function ContractFormContent({ 
  activeTab, 
  setActiveTab,
  customers,
  services, // Estes são os serviços disponíveis
  onClientCreated,
  contractId,
  mode,
  onSuccess,
  onCancel,
  onEditRequest,
  isFieldLoading,
  forceRefreshContracts,
  isModal = false,
  fromBilling = false
}: ContractFormContentProps): JSX.Element {
  // Buscar produtos disponíveis
  const { products = [] } = useSecureProducts();
  const { form, isViewMode, totalValues } = useContractForm();
  
  // Observar o número do contrato do formulário
  const contractNumber = form.watch('contract_number');
  
  return (
    <FormProvider {...form}> 
      <div className={`bg-background flex flex-col ${
        isModal 
          ? 'min-h-[600px] max-h-[90vh]' 
          : 'min-h-screen'
      }`}>
        <ContractFormHeader
          onBack={onCancel}
          contractNumber={contractNumber}
          mode={mode}
          className="backdrop-blur-sm bg-primary/95 min-h-[60px] flex-shrink-0 z-10"
        />
        
        <div className="flex flex-1 min-h-0">
          <div className="w-[90px] bg-card shadow-md flex flex-col items-center border-r border-border/30 flex-shrink-0">
            {/* Botão de Salvar/Editar no topo */}
            <div className="py-3 flex-shrink-0">
              <ContractFormActions
                contractId={contractId}
                onSuccess={onSuccess}
                onCancel={onCancel}
                forceRefreshContracts={forceRefreshContracts}
              />
            </div>
            
            {/* Área de rolagem para a navegação */}
            <div className={`flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent px-1.5 py-2 ${
              isModal ? 'max-h-[calc(90vh-300px)]' : ''
            }`}>
              <nav className="space-y-3">
                <button 
                  className={getNavButtonClass(activeTab === "servico")}
                  onClick={() => setActiveTab("servico")}
                  aria-label="Aba de serviços"
                  aria-pressed={activeTab === "servico"}
                >
                  <FileText className="h-4 w-4" />
                  <span className="text-[9px] mt-1 font-medium">Serviço</span>
                </button>
                
                <button 
                  className={getNavButtonClass(activeTab === "produtos")}
                  onClick={() => setActiveTab("produtos")}
                  aria-label="Aba de produtos"
                  aria-pressed={activeTab === "produtos"}
                >
                  <Package className="h-4 w-4" />
                  <span className="text-[9px] mt-1 font-medium">Produtos</span>
                </button>
                
                <button 
                  className={getNavButtonClass(activeTab === "descontos")}
                  onClick={() => setActiveTab("descontos")}
                  aria-label="Aba de descontos"
                  aria-pressed={activeTab === "descontos"}
                >
                  <Percent className="h-4 w-4" />
                  <span className="text-[9px] mt-1 font-medium">Descontos</span>
                </button>
                
                <button 
                  className={getNavButtonClass(activeTab === "departamentos")}
                  onClick={() => setActiveTab("departamentos")}
                  aria-label="Aba de departamentos"
                  aria-pressed={activeTab === "departamentos"}
                >
                  <Building2 className="h-4 w-4" />
                  <span className="text-[9px] mt-1 font-medium">Depto</span>
                </button>
                
                <button 
                  className={getNavButtonClass(activeTab === "observacoes")}
                  onClick={() => setActiveTab("observacoes")}
                  aria-label="Aba de observações"
                  aria-pressed={activeTab === "observacoes"}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-[9px] mt-1 font-medium">Notas</span>
                </button>
                
                <button 
                  className={getNavButtonClass(activeTab === "impostos")}
                  onClick={() => setActiveTab("impostos")}
                  aria-label="Aba de impostos"
                  aria-pressed={activeTab === "impostos"}
                >
                  <Calculator className="h-4 w-4" />
                  <span className="text-[9px] mt-1 font-medium">Impostos</span>
                </button>
                
                <button 
                  className={getNavButtonClass(activeTab === "recebimentos")}
                  onClick={() => setActiveTab("recebimentos")}
                  aria-label="Aba de recebimentos"
                  aria-pressed={activeTab === "recebimentos"}
                >
                  <CreditCard className="h-4 w-4" />
                  <span className="text-[9px] mt-1 font-medium">Recebimentos</span>
                </button>
              </nav>
            </div>
            
            {/* Seção inferior com ações e botão cancelar - sempre visível */}
            <div className="flex-shrink-0 w-full min-h-[200px]">
              {/* Ações do contrato (Ativar/Suspender/Cancelar) - só em modo view/edit */}
              {mode !== "create" && contractId && (
                <div className="px-1.5 py-2 border-t border-border/20">
                  <div className="text-center mb-2">
                    <span className="text-[7px] text-muted-foreground font-medium uppercase tracking-wide">
                      Ações
                    </span>
                  </div>
                  
                  <div className="space-y-1.5">
                    <ContractActivateButton
                      contractId={contractId}
                      contractNumber={form.watch('contract_number') || 'N/A'}
                      contractStatus={form.watch('status')}
                      onSuccess={() => {
                        toast.success('Contrato ativado com sucesso!');
                        onSuccess(contractId);
                      }}
                      className="!w-16 !h-10 !p-1.5 text-[8px] flex flex-col items-center justify-center bg-green-50 border-green-200 text-green-700 hover:bg-green-100 transition-all duration-200 rounded-md"
                    />
                    
                    <ContractSuspendButton
                      contractId={contractId}
                      contractNumber={form.watch('contract_number') || 'N/A'}
                      onSuccess={() => {
                        toast.success('Contrato suspenso com sucesso!');
                        onSuccess(contractId);
                      }}
                      className="!w-16 !h-10 !p-1.5 text-[8px] flex flex-col items-center justify-center bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 transition-all duration-200 rounded-md"
                    />
                    
                    <ContractCancelButton
                      contractId={contractId}
                      contractNumber={form.watch('contract_number') || 'N/A'}
                      onSuccess={() => {
                        toast.success('Contrato cancelado com sucesso!');
                        onSuccess(contractId);
                      }}
                      className="!w-16 !h-10 !p-1.5 text-[8px] flex flex-col items-center justify-center bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/20 transition-all duration-200 rounded-md"
                    />
                  </div>
                </div>
              )}
              
              {/* Botão de Cancelar na parte inferior */}
              <div className="p-2 border-t border-border/20 w-full flex justify-center">
                <CancelButton 
                  onClick={onCancel}
                  className="hover:bg-destructive/10 hover:text-destructive !h-8 !w-16 !text-[8px]"
                />
              </div>
            </div>
          </div>
          
          <div className={`flex-1 overflow-y-auto overflow-x-hidden ${
            isModal ? 'max-h-[calc(90vh-180px)]' : ''
          }`}>
            <div className="min-h-full">
              <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${
                isModal ? 'p-4 pb-16' : 'p-6'
              }`}>
                <div className="col-span-1 lg:col-span-2 space-y-6">
                  <div className="bg-card rounded-lg border border-border/50 p-6 shadow-sm">
                    <h2 className="font-medium flex items-center gap-2 mb-4">
                      <Building className="h-4 w-4 text-primary" />
                      Informações Básicas
                    </h2>
                    <ContractBasicInfo 
                      customers={customers || []} 
                      onClientCreated={onClientCreated}
                      isFieldLoading={isFieldLoading}
                    />
                  </div>
                  
                  <div className="bg-card rounded-lg border border-border/50 p-6 shadow-sm min-h-[500px]">
                    {activeTab === "servico" && (
                      <ContractServices form={form} contractId={contractId} />
                    )}
                    {activeTab === "produtos" && (
                      <div>
                        <h2 className="font-medium flex items-center gap-2 mb-4">
                          <Package className="h-4 w-4 text-primary" />
                          Produtos do Contrato
                        </h2>
                        <ContractProducts products={products || []} />
                      </div>
                    )}
                    {activeTab === "descontos" && (
                      <div>
                        <h2 className="font-medium flex items-center gap-2 mb-4">
                          <Percent className="h-4 w-4 text-primary" />
                          Descontos
                        </h2>
                        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-muted/50">
                          <div className="flex flex-col items-center space-y-3">
                            <Percent className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground text-sm">Funcionalidade de Descontos em desenvolvimento</p>
                            <p className="text-xs text-muted-foreground/60">Em breve você poderá configurar descontos personalizados</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {activeTab === "departamentos" && (
                      <div>
                        <h2 className="font-medium flex items-center gap-2 mb-4">
                          <Building2 className="h-4 w-4 text-primary" />
                          Departamentos
                        </h2>
                        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-muted/50">
                          <div className="flex flex-col items-center space-y-3">
                            <Building2 className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground text-sm">Funcionalidade de Departamentos em desenvolvimento</p>
                            <p className="text-xs text-muted-foreground/60">Em breve você poderá organizar contratos por departamentos</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {activeTab === "impostos" && (
                      <div>
                        <h2 className="font-medium flex items-center gap-2 mb-4">
                          <Calculator className="h-4 w-4 text-primary" />
                          Impostos e Retenções
                        </h2>
                        <ContractTaxes />
                      </div>
                    )}
                    {activeTab === "observacoes" && (
                      <div>
                        <h2 className="font-medium flex items-center gap-2 mb-4">
                          <MessageSquare className="h-4 w-4 text-primary" />
                          Observações
                        </h2>
                        <FormField
                          control={form.control}
                          name="internal_notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Observações Internas</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Adicione observações internas sobre este contrato..."
                                  className="resize-none h-24 text-sm"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                Estas observações são apenas para uso interno e não serão visíveis para o cliente.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {activeTab === "recebimentos" && (
                      <div>
                        <h2 className="font-medium flex items-center gap-2 mb-4">
                          <CreditCard className="h-4 w-4 text-primary" />
                          Histórico de Recebimentos
                        </h2>
                        <RecebimentosHistorico 
                          recebimentos={recebimentosMock} 
                          onNovoRecebimento={() => {}} 
                          contractId={contractId}
                          showRealData={mode === 'view' && !!contractId}
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="col-span-1 lg:col-span-1">
                  <div className="bg-card sticky top-4 rounded-lg border border-border/50 shadow-sm p-6 mb-8">
                    <ContractSidebar 
                      totalValues={totalValues}
                      onCancel={onCancel}
                      isViewMode={mode === 'view'}
                      contractId={contractId}
                      fromBilling={fromBilling}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FormProvider>
  );
}

// Função para converter serviços para o formato esperado pelo ServiceSelection
const toServiceSelectionItem = (service: {
  id: string;
  name: string;
  description?: string;
  default_price?: number;
  price?: number;
  tax_rate?: number;
  is_active?: boolean;
  created_at?: string;
  tenant_id?: string;
}) => ({
  id: service.id,
  name: service.name,
  description: service.description || '',
  default_price: service.default_price || service.price || 0,
  tax_rate: service.tax_rate || 0,
  is_active: service.is_active ?? true,
  created_at: service.created_at || new Date().toISOString(),
  tenant_id: service.tenant_id || ''
});

// MOCK de recebimentos para exibição inicial
const recebimentosMock: Recebimento[] = [
  {
    id: "1",
    data: "2024-06-01",
    valor: 500,
    status: "Recebido",
    parcelaAtual: 1,
    totalParcelas: 1,
    observacao: "Pagamento à vista"
  },
  {
    id: "2",
    data: "2024-07-01",
    valor: 250,
    status: "Recebido",
    parcelaAtual: 1,
    totalParcelas: 2,
    observacao: "1ª parcela"
  },
  {
    id: "3",
    data: "2024-08-01",
    valor: 250,
    status: "Em aberto",
    parcelaAtual: 2,
    totalParcelas: 2,
    observacao: "2ª parcela"
  }
];
