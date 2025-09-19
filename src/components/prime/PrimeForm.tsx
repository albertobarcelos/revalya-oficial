import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useForm, FormProvider, useFormContext, FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { PrimeButton } from './PrimeButton';
import { TextInput, NumberInput, Textarea, PasswordInput, MaskedInput } from './PrimeInput';
import { Select, MultiSelect, AutoComplete } from './PrimeSelect';
import { Card } from './PrimeCard';
import { useToast } from './PrimeToast';

// Tipos para configuração de campos do formulário
export interface FormFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'password' | 'masked' | 'select' | 'multiselect' | 'autocomplete';
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  mask?: string;
  options?: Array<{ label: string; value: any; disabled?: boolean }>;
  multiple?: boolean;
  suggestions?: string[];
  validation?: z.ZodSchema;
  gridCols?: number;
  dependencies?: string[];
  conditional?: (values: any) => boolean;
}

export interface FormSectionConfig {
  title: string;
  description?: string;
  fields: FormFieldConfig[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
  gridCols?: number;
}

export interface FormConfig {
  title?: string;
  description?: string;
  sections: FormSectionConfig[];
  schema: z.ZodSchema;
  submitText?: string;
  cancelText?: string;
  resetText?: string;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

// Contexto do formulário
interface FormContextType {
  config: FormConfig;
  isSubmitting: boolean;
  isDirty: boolean;
  errors: Record<string, any>;
  onSubmit: (data: any) => Promise<void> | void;
  onCancel?: () => void;
  onReset?: () => void;
}

const FormContext = createContext<FormContextType | null>(null);

// Hook para usar o contexto do formulário
export const usePrimeForm = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('usePrimeForm deve ser usado dentro de um PrimeForm');
  }
  return context;
};

// Componente de campo individual
interface FormFieldProps {
  config: FormFieldConfig;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({ config, className }) => {
  const { control, formState: { errors }, watch } = useFormContext();
  const { name, type, label, placeholder, description, required, disabled, mask, options, suggestions, conditional, dependencies } = config;
  
  // Observa dependências para campos condicionais
  const watchedValues = watch(dependencies || []);
  const shouldShow = useMemo(() => {
    if (!conditional) return true;
    const values = dependencies?.reduce((acc, dep, index) => {
      acc[dep] = watchedValues[index];
      return acc;
    }, {} as any) || {};
    return conditional(values);
  }, [conditional, dependencies, watchedValues]);

  if (!shouldShow) return null;

  const error = errors[name]?.message as string;
  const commonProps = {
    name,
    label,
    placeholder,
    description,
    required,
    disabled,
    error,
    className: cn('w-full', className)
  };

  switch (type) {
    case 'text':
      return <TextInput {...commonProps} />;
    
    case 'number':
      return <NumberInput {...commonProps} />;
    
    case 'textarea':
      return <Textarea {...commonProps} />;
    
    case 'password':
      return <PasswordInput {...commonProps} />;
    
    case 'masked':
      return <MaskedInput {...commonProps} mask={mask || ''} />;
    
    case 'select':
      return <Select {...commonProps} options={options || []} />;
    
    case 'multiselect':
      return <MultiSelect {...commonProps} options={options || []} />;
    
    case 'autocomplete':
      return <AutoComplete {...commonProps} suggestions={suggestions || []} />;
    
    default:
      return <TextInput {...commonProps} />;
  }
};

// Componente de seção do formulário
interface FormSectionProps {
  config: FormSectionConfig;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({ config, className }) => {
  const { title, description, fields, collapsible, defaultExpanded = true, gridCols = 1 } = config;
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  const content = (
    <div className={cn(
      'grid gap-4 w-full',
      gridCols === 1 && 'grid-cols-1',
      gridCols === 2 && 'grid-cols-1 sm:grid-cols-2',
      gridCols === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      gridCols === 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
    )}>
      {fields.map((field) => (
        <div
          key={field.name}
          className={cn(
            field.gridCols === 2 && 'md:col-span-2',
            field.gridCols === 3 && 'md:col-span-2 lg:col-span-3',
            field.gridCols === 4 && 'md:col-span-2 lg:col-span-4'
          )}
        >
          <FormField config={field} />
        </div>
      ))}
    </div>
  );

  if (collapsible) {
    return (
      <Card
        title={title}
        subtitle={description}
        className={className}
        collapsible
        collapsed={!expanded}
        onToggle={() => setExpanded(!expanded)}
      >
        {content}
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {title && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
          )}
        </div>
      )}
      {content}
    </div>
  );
};

// Componente principal do formulário
interface PrimeFormProps {
  config: FormConfig;
  defaultValues?: any;
  onSubmit: (data: any) => Promise<void> | void;
  onCancel?: () => void;
  onReset?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const PrimeForm: React.FC<PrimeFormProps> = ({
  config,
  defaultValues,
  onSubmit,
  onCancel,
  onReset,
  className,
  children
}) => {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = React.useState<NodeJS.Timeout | null>(null);

  const form = useForm({
    resolver: zodResolver(config.schema),
    defaultValues,
    mode: 'onChange'
  });

  const { handleSubmit, reset, formState: { isDirty, errors }, watch } = form;

  // Auto-save functionality
  const watchedValues = watch();
  React.useEffect(() => {
    if (config.autoSave && isDirty) {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
      
      const timeout = setTimeout(() => {
        // Implementar lógica de auto-save aqui
        console.log('Auto-saving form data:', watchedValues);
        toast.info('Formulário salvo automaticamente');
      }, config.autoSaveDelay || 2000);
      
      setAutoSaveTimeout(timeout);
    }
    
    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [watchedValues, isDirty, config.autoSave, config.autoSaveDelay]);

  const handleFormSubmit = useCallback(async (data: any) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
      toast.success('Formulário enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar formulário:', error);
      toast.error('Erro ao enviar formulário. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit, toast]);

  const handleReset = useCallback(() => {
    reset(defaultValues);
    onReset?.();
    toast.info('Formulário resetado');
  }, [reset, defaultValues, onReset, toast]);

  const contextValue: FormContextType = {
    config,
    isSubmitting,
    isDirty,
    errors,
    onSubmit: handleFormSubmit,
    onCancel,
    onReset: handleReset
  };

  return (
    <FormContext.Provider value={contextValue}>
      <FormProvider {...form}>
        <form onSubmit={handleSubmit(handleFormSubmit)} className={cn('space-y-6', className)}>
          {config.title && (
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 break-words">{config.title}</h2>
              {config.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 break-words">{config.description}</p>
              )}
            </div>
          )}
          
          <div className="space-y-6">
            {config.sections.map((section, index) => (
              <FormSection key={index} config={section} />
            ))}
          </div>
          
          {children}
          
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            {onReset && (
              <PrimeButton
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isSubmitting || !isDirty}
                className="w-full sm:w-auto sm:min-w-[120px]"
              >
                {config.resetText || 'Resetar'}
              </PrimeButton>
            )}
            
            {onCancel && (
              <PrimeButton
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
                className="w-full sm:w-auto sm:min-w-[120px]"
              >
                {config.cancelText || 'Cancelar'}
              </PrimeButton>
            )}
            
            <PrimeButton
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={isSubmitting}
              className="w-full sm:w-auto sm:min-w-[120px]"
            >
              {config.submitText || 'Salvar'}
            </PrimeButton>
          </div>
        </form>
      </FormProvider>
    </FormContext.Provider>
  );
};

// Utilitários para criação de formulários
export const formUtils = {
  // Criar campo de texto
  textField: (name: string, label: string, options: Partial<FormFieldConfig> = {}): FormFieldConfig => ({
    name,
    label,
    type: 'text',
    ...options
  }),
  
  // Criar campo de número
  numberField: (name: string, label: string, options: Partial<FormFieldConfig> = {}): FormFieldConfig => ({
    name,
    label,
    type: 'number',
    ...options
  }),
  
  // Criar campo de seleção
  selectField: (name: string, label: string, options: Array<{ label: string; value: any }>, config: Partial<FormFieldConfig> = {}): FormFieldConfig => ({
    name,
    label,
    type: 'select',
    options,
    ...config
  }),
  
  // Criar campo de email
  emailField: (name: string, label: string = 'Email', options: Partial<FormFieldConfig> = {}): FormFieldConfig => ({
    name,
    label,
    type: 'text',
    placeholder: 'exemplo@email.com',
    validation: z.string().email('Email inválido'),
    ...options
  }),
  
  // Criar campo de telefone
  phoneField: (name: string, label: string = 'Telefone', options: Partial<FormFieldConfig> = {}): FormFieldConfig => ({
    name,
    label,
    type: 'masked',
    mask: '(99) 99999-9999',
    placeholder: '(11) 99999-9999',
    ...options
  }),
  
  // Criar campo de CPF
  cpfField: (name: string, label: string = 'CPF', options: Partial<FormFieldConfig> = {}): FormFieldConfig => ({
    name,
    label,
    type: 'masked',
    mask: '999.999.999-99',
    placeholder: '000.000.000-00',
    ...options
  }),
  
  // Criar campo de CNPJ
  cnpjField: (name: string, label: string = 'CNPJ', options: Partial<FormFieldConfig> = {}): FormFieldConfig => ({
    name,
    label,
    type: 'masked',
    mask: '99.999.999/9999-99',
    placeholder: '00.000.000/0000-00',
    ...options
  }),
  
  // Criar seção
  section: (title: string, fields: FormFieldConfig[], options: Partial<FormSectionConfig> = {}): FormSectionConfig => ({
    title,
    fields,
    ...options
  }),
  
  // Validações comuns
  validations: {
    required: (message: string = 'Campo obrigatório') => z.string().min(1, message),
    email: (message: string = 'Email inválido') => z.string().email(message),
    phone: (message: string = 'Telefone inválido') => z.string().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, message),
    cpf: (message: string = 'CPF inválido') => z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, message),
    cnpj: (message: string = 'CNPJ inválido') => z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, message),
    minLength: (min: number, message?: string) => z.string().min(min, message || `Mínimo de ${min} caracteres`),
    maxLength: (max: number, message?: string) => z.string().max(max, message || `Máximo de ${max} caracteres`),
    number: (message: string = 'Deve ser um número') => z.number({ invalid_type_error: message }),
    positiveNumber: (message: string = 'Deve ser um número positivo') => z.number().positive(message),
    currency: (message: string = 'Valor monetário inválido') => z.number().min(0, message)
  }
};

// Schemas comuns
export const commonSchemas = {
  // Schema para dados pessoais
  personalData: z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().email('Email inválido'),
    phone: z.string().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, 'Telefone inválido'),
    cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido').optional()
  }),
  
  // Schema para endereço
  address: z.object({
    street: z.string().min(1, 'Logradouro é obrigatório'),
    number: z.string().min(1, 'Número é obrigatório'),
    complement: z.string().optional(),
    neighborhood: z.string().min(1, 'Bairro é obrigatório'),
    city: z.string().min(1, 'Cidade é obrigatória'),
    state: z.string().min(2, 'Estado é obrigatório').max(2, 'Estado deve ter 2 caracteres'),
    zipCode: z.string().regex(/^\d{5}-\d{3}$/, 'CEP inválido')
  }),
  
  // Schema para dados da empresa
  companyData: z.object({
    name: z.string().min(1, 'Razão social é obrigatória'),
    tradeName: z.string().optional(),
    cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido'),
    email: z.string().email('Email inválido'),
    phone: z.string().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, 'Telefone inválido')
  })
};

export default PrimeForm;
