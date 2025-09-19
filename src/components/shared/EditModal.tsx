/**
 * Componente Modal Reutilizável para Edição
 * 
 * AIDEV-NOTE: Modal universal para edição de entidades (serviços, produtos, clientes)
 * Utiliza configuração dinâmica de campos e validação
 * Integra Shadcn/UI + UIverse + Motion.dev para UX premium
 * 
 * @module EditModal
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Save, X, AlertCircle, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { getEditConfig } from './EditModalConfigs';

// AIDEV-NOTE: Tipos para configuração dinâmica de campos
export interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'currency' | 'textarea' | 'select' | 'switch' | 'cpf_cnpj';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  icon?: React.ReactNode;
  description?: string;
  group?: string;
}

export interface EditModalProps<T = any> {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: T) => Promise<void>;
  title: string;
  data?: T;
  entityType?: 'service' | 'product' | 'client';
  fields?: FieldConfig[];
  validationSchema?: z.ZodSchema<T>;
  isLoading?: boolean;
  onCodeValidation?: (code: string, currentId?: string) => Promise<boolean>;
}

// AIDEV-NOTE: Schemas de validação base por tipo de entidade
const createValidationSchema = (fields: FieldConfig[], customValidation?: z.ZodSchema<any>) => {
  if (customValidation) return customValidation;
  
  const schemaFields: Record<string, z.ZodSchema<any>> = {};
  
  fields.forEach(field => {
    let fieldSchema: z.ZodSchema<any>;
    
    switch (field.type) {
      case 'email':
        fieldSchema = z.string().email('Email inválido');
        break;
      case 'number':
      case 'currency':
        fieldSchema = z.number().min(0, 'Valor deve ser positivo');
        break;
      case 'phone':
        fieldSchema = z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos');
        break;
      case 'cpf_cnpj':
        fieldSchema = z.string().min(11, 'CPF/CNPJ inválido');
        break;
      default:
        fieldSchema = z.string();
    }
    
    if (!field.required) {
      fieldSchema = fieldSchema.optional();
    }
    
    schemaFields[field.name] = fieldSchema;
  });
  
  return z.object(schemaFields);
};

// AIDEV-NOTE: Componente de campo dinâmico com animações UIverse
const DynamicField: React.FC<{
  field: FieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}> = ({ field, value, onChange, error }) => {
  const [showPassword, setShowPassword] = useState(false);
  
  const renderField = () => {
    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[100px] resize-none"
          />
        );
        
      case 'number':
        return (
          <Input
            type="number"
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            min="0"
            step="0.01"
          />
        );
        
      case 'currency':
        return (
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="R$ 0,00"
              value={value ? formatCurrency(value) : ''}
              onChange={(e) => {
                // Permite que o usuário digite livremente
                const inputValue = e.target.value;
                
                // Se o campo estiver vazio, define como 0
                if (!inputValue || inputValue === 'R$ ') {
                  onChange(0);
                  return;
                }
                
                // Parse do valor apenas quando há conteúdo válido
                const numericValue = parseCurrency(inputValue);
                onChange(numericValue);
              }}
              onFocus={(e) => {
                // Ao focar, mostra apenas o valor numérico para facilitar edição
                if (value && value > 0) {
                  e.target.value = value.toString().replace('.', ',');
                }
              }}
              onBlur={(e) => {
                // Ao sair do foco, aplica a formatação completa
                if (value && value > 0) {
                  e.target.value = formatCurrency(value);
                }
              }}
              className="pl-10"
            />
          </div>
        );
        
      case 'select':
        return (
          <Select value={value || undefined} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
        
      case 'switch':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={value || false}
              onCheckedChange={onChange}
            />
            <Label className="text-sm text-muted-foreground">
              {value ? 'Ativo' : 'Inativo'}
            </Label>
          </div>
        );
        
      default:
        return (
          <div className="relative">
            {field.icon && (
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                {field.icon}
              </div>
            )}
            <Input
              type={field.type === 'phone' ? 'tel' : 'text'}
              placeholder={field.placeholder}
              value={field.format ? field.format(value) : (value || '')}
              onChange={(e) => {
                const newValue = field.parse ? field.parse(e.target.value) : e.target.value;
                onChange(newValue);
              }}
              className={field.icon ? 'pl-10' : ''}
            />
          </div>
        );
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-2"
    >
      <Label htmlFor={field.name} className="text-sm font-medium flex items-center gap-2">
        {field.icon && <span className="text-muted-foreground">{field.icon}</span>}
        {field.label}
        {field.required && <span className="text-destructive">*</span>}
      </Label>
      
      {renderField()}
      
      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}
      
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-1 text-xs text-destructive"
        >
          <AlertCircle className="h-3 w-3" />
          {error}
        </motion.div>
      )}
    </motion.div>
  );
};

// AIDEV-NOTE: Utilitários para formatação e validação
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const parseCurrency = (value: string): number => {
  // Remove todos os caracteres não numéricos exceto vírgula e ponto
  const cleanValue = value.replace(/[^\d,.-]/g, '');
  
  // Se contém vírgula, trata como separador decimal brasileiro
  if (cleanValue.includes(',')) {
    const parts = cleanValue.split(',');
    if (parts.length === 2) {
      // Remove pontos da parte inteira (milhares) e usa vírgula como decimal
      const integerPart = parts[0].replace(/\./g, '');
      const decimalPart = parts[1].substring(0, 2); // Máximo 2 casas decimais
      return parseFloat(`${integerPart}.${decimalPart}`) || 0;
    }
  }
  
  // Fallback para formato com ponto decimal
  const numericValue = cleanValue.replace(/[^\d.]/g, '');
  return parseFloat(numericValue) || 0;
};

const formatCpfCnpj = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 11) {
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
};

// AIDEV-NOTE: Animações do Motion.dev para microinterações
const modalVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95,
    y: 20
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    y: 20,
    transition: {
      duration: 0.2
    }
  }
};

const fieldVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      type: "spring",
      stiffness: 300,
      damping: 30
    }
  })
};

const buttonVariants = {
  hover: { 
    scale: 1.02,
    transition: { type: "spring", stiffness: 400, damping: 10 }
  },
  tap: { 
    scale: 0.98,
    transition: { type: "spring", stiffness: 400, damping: 10 }
  }
};

// AIDEV-NOTE: Componente principal EditModal
export function EditModal<T = any>({
  isOpen,
  onClose,
  onSave,
  title,
  data,
  entityType,
  fields: customFields,
  validationSchema: customValidation,
  isLoading = false,
  onCodeValidation
}: EditModalProps<T>) {
  const [isSaving, setIsSaving] = useState(false);
  const [isTaxSectionOpen, setIsTaxSectionOpen] = useState(false);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  
  // AIDEV-NOTE: Referência para timeout de debounce na validação de código
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // AIDEV-NOTE: Obter configuração baseada no tipo de entidade ou usar campos customizados
  const config = entityType ? getEditConfig(entityType) : null;
  const fields = customFields || config?.fields || [];
  const validationSchema = customValidation || config?.validation;

  // AIDEV-NOTE: Configuração do formulário com React Hook Form + Zod
  const form = useForm({
    resolver: validationSchema ? zodResolver(validationSchema) : undefined,
    defaultValues: data || {},
    mode: 'onChange' // Habilita validação em tempo real
  });

  // AIDEV-NOTE: Reset form quando data muda
  useEffect(() => {
    if (data) {
      // Processa valores null/undefined para campos opcionais
      const processedData = Object.keys(data).reduce((acc, key) => {
        const value = data[key];
        // Converte null para string vazia para campos de texto
        acc[key] = value === null ? '' : value;
        return acc;
      }, {} as any);
      
      form.reset(processedData);
    }
  }, [data, form]);

  // AIDEV-NOTE: Limpeza do timeout quando o modal fecha
  useEffect(() => {
    if (!isOpen && validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
      validationTimeoutRef.current = null;
    }
  }, [isOpen]);

  // AIDEV-NOTE: Função de submit com tratamento de erro
  const handleSubmit = async (formData: any) => {
    try {
      console.log('🚀 Iniciando submit do formulário:', formData);
      
      // AIDEV-NOTE: Verificar se há erros de validação antes de prosseguir
      const hasCodeError = form.formState.errors.code;
      if (hasCodeError) {
        console.log('❌ Erro de código detectado, impedindo submit:', hasCodeError);
        return; // Não prosseguir se há erro de código
      }
      
      setIsSaving(true);
      await onSave(formData);
      console.log('✅ Dados salvos com sucesso');
      onClose();
    } catch (error: any) {
      console.error('❌ Erro ao salvar:', error);
      
      // AIDEV-NOTE: Tratamento específico para erro de código duplicado (PostgreSQL)
      if (error?.code === '23505' || error?.message?.includes('duplicate key')) {
        console.log('🔄 Erro de código duplicado detectado no backend');
        form.setError('code', {
          type: 'manual',
          message: 'Este código já está sendo usado por outro registro'
        });
      } else {
        // AIDEV-NOTE: Erro genérico para outros casos
        form.setError('root', {
          type: 'manual',
          message: error?.message || 'Erro ao salvar. Tente novamente.'
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // AIDEV-NOTE: Agrupamento de campos por categoria
  const groupedFields = fields.reduce((acc, field) => {
    const group = field.group || 'default';
    if (!acc[group]) acc[group] = [];
    acc[group].push(field);
    return acc;
  }, {} as Record<string, FieldConfig[]>);

  // AIDEV-NOTE: Função para renderizar conteúdo das abas
  const renderTabContent = (groupNames: string[]) => {
    return groupNames.map(groupName => {
      const groupFields = groupedFields[groupName];
      if (!groupFields || groupFields.length === 0) return null;

      return (
        <div key={groupName} className="space-y-4">
          {groupName !== 'default' && (
            <>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {groupName === 'basic' && 'Informações Básicas'}
                  {groupName === 'details' && 'Detalhes'}
                  {groupName === 'advanced' && 'Avançado'}
                  {groupName === 'contact' && 'Contato'}
                  {groupName === 'address' && 'Endereço'}
                  {groupName === 'financial' && 'Financeiro'}
                  {groupName === 'inventory' && 'Estoque'}
                  {groupName === 'personal' && 'Dados Pessoais'}
                </Badge>
              </div>
              <Separator />
            </>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groupFields.map((field, index) => renderField(field, index))}
          </div>
        </div>
      );
    }).filter(Boolean);
  };

  // AIDEV-NOTE: Renderização de campo baseado no tipo
  const renderField = (field: FieldConfig, index: number) => {
    return (
      <motion.div
        key={field.name}
        custom={index}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
      >
        <FormField
          control={form.control}
          name={field.name}
          render={({ field: formField }) => (
            <FormItem className="space-y-2">
              <FormLabel className="flex items-center gap-2 text-sm font-medium">
                {field.icon}
                {field.label}
                {field.required && <span className="text-red-500">*</span>}
              </FormLabel>
              <FormControl>
                {renderFieldInput(field, formField)}
              </FormControl>
              {field.description && (
                <FormDescription className="text-xs text-muted-foreground">
                  {field.description}
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      </motion.div>
    );
  };

  // AIDEV-NOTE: Renderização específica por tipo de input
  const renderFieldInput = (field: FieldConfig, formField: any) => {
    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            {...formField}
            placeholder={field.placeholder}
            className="min-h-[80px] resize-none"
          />
        );

      case 'select':
        return (
          <Select onValueChange={formField.onChange} value={formField.value}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'switch':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={formField.value}
              onCheckedChange={formField.onChange}
            />
            <span className="text-sm text-muted-foreground">
              {formField.value ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        );

      case 'currency':
        return (
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder={field.placeholder}
              className="pl-10"
              value={formField.value || ''}
              onChange={(e) => {
                // AIDEV-NOTE: Campo numérico simples, sem formatação complexa
                const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                formField.onChange(value);
              }}
            />
          </div>
        );

      case 'cpf_cnpj':
        return (
          <Input
            {...formField}
            type="text"
            placeholder={field.placeholder}
            onChange={(e) => {
              const formatted = formatCpfCnpj(e.target.value);
              formField.onChange(formatted);
            }}
            maxLength={18}
          />
        );

      case 'phone':
        return (
          <Input
            {...formField}
            type="text"
            placeholder={field.placeholder}
            onChange={(e) => {
              const formatted = formatPhone(e.target.value);
              formField.onChange(formatted);
            }}
            maxLength={15}
          />
        );

      case 'number':
        return (
          <Input
            {...formField}
            type="number"
            placeholder={field.placeholder}
            onChange={(e) => formField.onChange(parseFloat(e.target.value) || 0)}
          />
        );

      default:
        // AIDEV-NOTE: Validação especial para campo de código
        if (field.name === 'code' && onCodeValidation) {
          return (
            <div className="relative">
              <Input
                {...formField}
                type={field.type}
                placeholder={field.placeholder}
                value={formField.value || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  formField.onChange(value);
                  
                  // AIDEV-NOTE: Limpar erro anterior primeiro
                  form.clearErrors('code');
                  
                  // AIDEV-NOTE: Debounce para validação de código duplicado
                  if (validationTimeoutRef.current) {
                    clearTimeout(validationTimeoutRef.current);
                  }
                  
                  if (value && value.length >= 2) {
                    setIsValidatingCode(true);
                    
                    validationTimeoutRef.current = setTimeout(async () => {
                      try {
                        console.log('🔍 [VALIDAÇÃO] Iniciando validação de código:', { 
                          code: value, 
                          currentId: data?.id,
                          timestamp: new Date().toISOString()
                        });
                        
                        console.log('🔍 [ESTADO ANTES] Estado do formulário:', { 
                          errors: form.formState.errors, 
                          isValid: form.formState.isValid,
                          errorCount: Object.keys(form.formState.errors).length,
                          isDirty: form.formState.isDirty
                        });
                        
                        const isDuplicate = await onCodeValidation(value, data?.id);
                        console.log('📊 [RESULTADO] Validação concluída:', { 
                          code: value,
                          isDuplicate,
                          timestamp: new Date().toISOString()
                        });
                        
                        if (isDuplicate) {
                          console.log('❌ [ERRO] Definindo erro de código duplicado');
                          form.setError('code', {
                            type: 'manual',
                            message: 'Este código já está sendo usado por outro registro'
                          });
                          
                          // AIDEV-NOTE: Forçar re-render do estado do formulário
                          setTimeout(() => {
                            console.log('🔍 [ESTADO APÓS ERRO] Estado do formulário:', { 
                              errors: form.formState.errors, 
                              isValid: form.formState.isValid,
                              errorCount: Object.keys(form.formState.errors).length,
                              hasCodeError: !!form.formState.errors.code,
                              codeErrorMessage: form.formState.errors.code?.message
                            });
                          }, 50);
                        } else {
                          console.log('✅ [SUCESSO] Código válido, limpando erros');
                          form.clearErrors('code');
                        }
                      } catch (error) {
                        console.error('❌ [ERRO VALIDAÇÃO] Erro na validação de código:', error);
                        form.setError('code', {
                          type: 'manual',
                          message: 'Erro ao validar código. Tente novamente.'
                        });
                      } finally {
                        setIsValidatingCode(false);
                      }
                    }, 500); // Debounce de 500ms
                  } else {
                    setIsValidatingCode(false);
                  }
                }}
                className={cn(
                  isValidatingCode && "pr-10",
                  form.formState.errors.code && "border-red-500 focus:border-red-500"
                )}
              />
              {isValidatingCode && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          );
        }
        
        return (
          <Input
            {...formField}
            type={field.type}
            placeholder={field.placeholder}
            value={formField.value || ''}
            onChange={(e) => formField.onChange(e.target.value)}
          />
        );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-2xl max-h-[90vh] p-0">
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col h-full"
            >
              {/* AIDEV-NOTE: Header com título e botão fechar */}
              <DialogHeader className="px-6 py-4 border-b">
                <DialogTitle className="text-xl font-semibold">
                  {title}
                </DialogTitle>
                <DialogDescription>
                  Preencha os campos abaixo para {data ? 'editar' : 'criar'} o registro.
                </DialogDescription>
              </DialogHeader>

              {/* AIDEV-NOTE: Formulário com abas e scroll */}
              <ScrollArea className="flex-1 px-6 py-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                    <Tabs defaultValue="basic" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="basic">Informações Básicas</TabsTrigger>
                        <TabsTrigger value="details">Detalhes</TabsTrigger>
                        <TabsTrigger value="advanced">Avançado</TabsTrigger>
                      </TabsList>

                      {/* AIDEV-NOTE: Aba de Informações Básicas */}
                      <TabsContent value="basic" className="space-y-6 mt-6">
                        {renderTabContent(['basic', 'contact', 'personal'])}
                      </TabsContent>

                      {/* AIDEV-NOTE: Aba de Detalhes */}
                      <TabsContent value="details" className="space-y-6 mt-6">
                        {renderTabContent(['details', 'financial', 'inventory', 'address'])}
                      </TabsContent>

                      {/* AIDEV-NOTE: Aba Avançado com seção de impostos colapsável */}
                      <TabsContent value="advanced" className="space-y-6 mt-6">
                        {renderTabContent(['advanced', 'default'])}
                        
                        {/* AIDEV-NOTE: Seção de Impostos e Relacionados - Colapsável */}
                        <Collapsible open={isTaxSectionOpen} onOpenChange={setIsTaxSectionOpen}>
                          <div className="border rounded-lg p-4 bg-muted/20">
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                className="w-full flex items-center justify-center gap-2 p-4 hover:bg-muted/40"
                              >
                                <span className="font-medium">Impostos e Relacionados</span>
                                <motion.div
                                  animate={{ rotate: isTaxSectionOpen ? 180 : 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </motion.div>
                              </Button>
                            </CollapsibleTrigger>
                            
                            <CollapsibleContent className="space-y-4 pt-4">
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ 
                                  opacity: isTaxSectionOpen ? 1 : 0, 
                                  height: isTaxSectionOpen ? 'auto' : 0 
                                }}
                                transition={{ duration: 0.3 }}
                              >
                                <Separator className="mb-4" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* AIDEV-NOTE: Aqui renderizaremos campos específicos de impostos quando necessário */}
                                  <div className="col-span-full text-center text-muted-foreground py-8">
                                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>Configurações de impostos serão implementadas em breve</p>
                                  </div>
                                </div>
                              </motion.div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      </TabsContent>
                    </Tabs>
                  </form>
                </Form>
              </ScrollArea>

              {/* AIDEV-NOTE: Footer com botões de ação */}
              <DialogFooter className="px-6 py-4 border-t bg-muted/20">
                <div className="flex gap-3 w-full sm:w-auto">
                  <motion.div
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    className="flex-1 sm:flex-none"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      disabled={isSaving}
                      className="w-full sm:w-auto"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  </motion.div>
                  
                  <motion.div
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    className="flex-1 sm:flex-none"
                  >
                    <Button
                      type="submit"
                      onClick={form.handleSubmit(handleSubmit)}
                      disabled={isSaving || isLoading || Object.keys(form.formState.errors).length > 0}
                      className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Salvar
                        </>
                      )}
                    </Button>
                  </motion.div>
                </div>
              </DialogFooter>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}