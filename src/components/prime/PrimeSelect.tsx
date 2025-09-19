/**
 * Componente Select padronizado usando PrimeReact
 * Substitui os selects do Shadcn UI com design consistente
 */

import React from 'react';
import { Dropdown, DropdownProps } from 'primereact/dropdown';
import { MultiSelect, MultiSelectProps } from 'primereact/multiselect';
import { AutoComplete, AutoCompleteProps } from 'primereact/autocomplete';
import { TreeSelect, TreeSelectProps } from 'primereact/treeselect';
import { FloatLabel } from 'primereact/floatlabel';
import { Tooltip } from 'primereact/tooltip';
import { cn } from '@/lib/utils';
import { usePrimeReactTheme } from '@/providers/PrimeReactProvider';

// Tipos base
interface BaseSelectProps {
  label?: string;
  error?: string;
  helper?: string;
  tooltip?: string;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
  required?: boolean;
  fullWidth?: boolean;
  floatingLabel?: boolean;
  size?: 'small' | 'normal' | 'large';
  loading?: boolean;
}

// Opção padrão
export interface SelectOption {
  label: string;
  value: any;
  disabled?: boolean;
  icon?: string;
  description?: string;
  group?: string;
}

// Select simples
interface SelectProps extends Omit<DropdownProps, 'options' | 'size'>, BaseSelectProps {
  options: SelectOption[];
  placeholder?: string;
  clearable?: boolean;
  searchable?: boolean;
  emptyMessage?: string;
}

const Select = React.forwardRef<HTMLDivElement, SelectProps>((
  {
    label,
    error,
    helper,
    tooltip,
    tooltipPosition = 'top',
    required = false,
    fullWidth = true,
    floatingLabel = false,
    size = 'normal',
    loading = false,
    options,
    placeholder = 'Selecione...',
    clearable = false,
    searchable = false,
    emptyMessage = 'Nenhuma opção encontrada',
    className,
    ...props
  },
  ref
) => {
  const { theme } = usePrimeReactTheme();
  const selectId = React.useId();

  const getSizeClass = () => {
    const sizes = {
      small: 'p-inputtext-sm',
      normal: '',
      large: 'p-inputtext-lg'
    };
    return sizes[size];
  };

  const selectClasses = cn(
    'transition-all duration-200',
    {
      'w-full': fullWidth,
      'p-invalid': error
    },
    getSizeClass(),
    className
  );

  // Template para opções com ícone
  const optionTemplate = (option: SelectOption) => {
    if (!option) return null;
    
    return (
      <div className="flex items-center gap-2">
        {option.icon && <i className={option.icon} />}
        <div className="flex flex-col">
          <span>{option.label}</span>
          {option.description && (
            <small className="text-gray-500">{option.description}</small>
          )}
        </div>
      </div>
    );
  };

  // Template para valor selecionado
  const valueTemplate = (option: SelectOption) => {
    if (!option) return placeholder;
    
    return (
      <div className="flex items-center gap-2">
        {option.icon && <i className={option.icon} />}
        <span>{option.label}</span>
      </div>
    );
  };

  const SelectComponent = (
    <Dropdown
      ref={ref}
      id={selectId}
      options={options}
      placeholder={placeholder}
      className={selectClasses}
      invalid={!!error}
      showClear={clearable}
      filter={searchable}
      filterPlaceholder="Buscar..."
      emptyMessage={emptyMessage}
      loading={loading}
      optionLabel="label"
      optionValue="value"
      optionDisabled="disabled"
      itemTemplate={optionTemplate}
      valueTemplate={valueTemplate}
      {...props}
    />
  );

  const WrappedSelect = floatingLabel && label ? (
    <FloatLabel>
      {SelectComponent}
      <label htmlFor={selectId}>
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
    </FloatLabel>
  ) : (
    <>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </label>
      )}
      {SelectComponent}
    </>
  );

  return (
    <div className="space-y-1">
      {WrappedSelect}
      {helper && !error && (
        <small className="text-gray-500 dark:text-gray-400">{helper}</small>
      )}
      {error && (
        <small className="text-danger dark:text-danger">{error}</small>
      )}
      {tooltip && (
        <Tooltip
          target={`#${selectId}`}
          content={tooltip}
          position={tooltipPosition}
          className="text-sm"
        />
      )}
    </div>
  );
});

Select.displayName = 'Select';

// Multi Select
interface MultiSelectComponentProps extends Omit<MultiSelectProps, 'options' | 'size'>, BaseSelectProps {
  options: SelectOption[];
  placeholder?: string;
  maxSelectedLabels?: number;
  selectedItemsLabel?: string;
  searchable?: boolean;
  emptyMessage?: string;
}

const MultiSelectComponent = React.forwardRef<HTMLDivElement, MultiSelectComponentProps>((
  {
    label,
    error,
    helper,
    tooltip,
    tooltipPosition = 'top',
    required = false,
    fullWidth = true,
    floatingLabel = false,
    size = 'normal',
    loading = false,
    options,
    placeholder = 'Selecione...',
    maxSelectedLabels = 3,
    selectedItemsLabel = '{0} itens selecionados',
    searchable = true,
    emptyMessage = 'Nenhuma opção encontrada',
    className,
    ...props
  },
  ref
) => {
  const selectId = React.useId();

  const getSizeClass = () => {
    const sizes = {
      small: 'p-inputtext-sm',
      normal: '',
      large: 'p-inputtext-lg'
    };
    return sizes[size];
  };

  const selectClasses = cn(
    'transition-all duration-200',
    {
      'w-full': fullWidth,
      'p-invalid': error
    },
    getSizeClass(),
    className
  );

  const optionTemplate = (option: SelectOption) => {
    return (
      <div className="flex items-center gap-2">
        {option.icon && <i className={option.icon} />}
        <div className="flex flex-col">
          <span>{option.label}</span>
          {option.description && (
            <small className="text-gray-500">{option.description}</small>
          )}
        </div>
      </div>
    );
  };

  const SelectComponent = (
    <MultiSelect
      ref={ref}
      id={selectId}
      options={options}
      placeholder={placeholder}
      className={selectClasses}
      invalid={!!error}
      filter={searchable}
      filterPlaceholder="Buscar..."
      emptyMessage={emptyMessage}
      loading={loading}
      maxSelectedLabels={maxSelectedLabels}
      selectedItemsLabel={selectedItemsLabel}
      optionLabel="label"
      optionValue="value"
      optionDisabled="disabled"
      itemTemplate={optionTemplate}
      {...props}
    />
  );

  const WrappedSelect = floatingLabel && label ? (
    <FloatLabel>
      {SelectComponent}
      <label htmlFor={selectId}>
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
    </FloatLabel>
  ) : (
    <>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </label>
      )}
      {SelectComponent}
    </>
  );

  return (
    <div className="space-y-1">
      {WrappedSelect}
      {helper && !error && (
        <small className="text-gray-500 dark:text-gray-400">{helper}</small>
      )}
      {error && (
        <small className="text-danger dark:text-danger">{error}</small>
      )}
      {tooltip && (
        <Tooltip
          target={`#${selectId}`}
          content={tooltip}
          position={tooltipPosition}
          className="text-sm"
        />
      )}
    </div>
  );
});

MultiSelectComponent.displayName = 'MultiSelect';

// AutoComplete
interface AutoCompleteComponentProps extends Omit<AutoCompleteProps, 'suggestions' | 'size'>, BaseSelectProps {
  suggestions: SelectOption[];
  onSearch: (query: string) => void;
  placeholder?: string;
  minLength?: number;
  delay?: number;
  emptyMessage?: string;
}

const AutoCompleteComponent = React.forwardRef<HTMLInputElement, AutoCompleteComponentProps>((
  {
    label,
    error,
    helper,
    tooltip,
    tooltipPosition = 'top',
    required = false,
    fullWidth = true,
    floatingLabel = false,
    size = 'normal',
    loading = false,
    suggestions,
    onSearch,
    placeholder = 'Digite para buscar...',
    minLength = 1,
    delay = 300,
    emptyMessage = 'Nenhum resultado encontrado',
    className,
    ...props
  },
  ref
) => {
  const selectId = React.useId();

  const getSizeClass = () => {
    const sizes = {
      small: 'p-inputtext-sm',
      normal: '',
      large: 'p-inputtext-lg'
    };
    return sizes[size];
  };

  const selectClasses = cn(
    'transition-all duration-200',
    {
      'w-full': fullWidth,
      'p-invalid': error
    },
    getSizeClass(),
    className
  );

  const itemTemplate = (item: SelectOption) => {
    return (
      <div className="flex items-center gap-2">
        {item.icon && <i className={item.icon} />}
        <div className="flex flex-col">
          <span>{item.label}</span>
          {item.description && (
            <small className="text-gray-500">{item.description}</small>
          )}
        </div>
      </div>
    );
  };

  const SelectComponent = (
    <AutoComplete
      ref={ref}
      id={selectId}
      suggestions={suggestions}
      completeMethod={(e) => onSearch(e.query)}
      placeholder={placeholder}
      className={selectClasses}
      invalid={!!error}
      minLength={minLength}
      delay={delay}
      emptyMessage={emptyMessage}
      loading={loading}
      field="label"
      itemTemplate={itemTemplate}
      {...props}
    />
  );

  const WrappedSelect = floatingLabel && label ? (
    <FloatLabel>
      {SelectComponent}
      <label htmlFor={selectId}>
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
    </FloatLabel>
  ) : (
    <>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </label>
      )}
      {SelectComponent}
    </>
  );

  return (
    <div className="space-y-1">
      {WrappedSelect}
      {helper && !error && (
        <small className="text-gray-500 dark:text-gray-400">{helper}</small>
      )}
      {error && (
        <small className="text-danger dark:text-danger">{error}</small>
      )}
      {tooltip && (
        <Tooltip
          target={`#${selectId}`}
          content={tooltip}
          position={tooltipPosition}
          className="text-sm"
        />
      )}
    </div>
  );
});

AutoCompleteComponent.displayName = 'AutoComplete';

// TreeSelect
interface TreeSelectComponentProps extends Omit<TreeSelectProps, 'options' | 'size'>, BaseSelectProps {
  options: any[];
  placeholder?: string;
  emptyMessage?: string;
}

const TreeSelectComponent = React.forwardRef<HTMLDivElement, TreeSelectComponentProps>((
  {
    label,
    error,
    helper,
    tooltip,
    tooltipPosition = 'top',
    required = false,
    fullWidth = true,
    floatingLabel = false,
    size = 'normal',
    loading = false,
    options,
    placeholder = 'Selecione...',
    emptyMessage = 'Nenhuma opção encontrada',
    className,
    ...props
  },
  ref
) => {
  const selectId = React.useId();

  const getSizeClass = () => {
    const sizes = {
      small: 'p-inputtext-sm',
      normal: '',
      large: 'p-inputtext-lg'
    };
    return sizes[size];
  };

  const selectClasses = cn(
    'transition-all duration-200',
    {
      'w-full': fullWidth,
      'p-invalid': error
    },
    getSizeClass(),
    className
  );

  const SelectComponent = (
    <TreeSelect
      ref={ref}
      id={selectId}
      options={options}
      placeholder={placeholder}
      className={selectClasses}
      invalid={!!error}
      emptyMessage={emptyMessage}
      loading={loading}
      {...props}
    />
  );

  const WrappedSelect = floatingLabel && label ? (
    <FloatLabel>
      {SelectComponent}
      <label htmlFor={selectId}>
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
    </FloatLabel>
  ) : (
    <>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </label>
      )}
      {SelectComponent}
    </>
  );

  return (
    <div className="space-y-1">
      {WrappedSelect}
      {helper && !error && (
        <small className="text-gray-500 dark:text-gray-400">{helper}</small>
      )}
      {error && (
        <small className="text-danger dark:text-danger">{error}</small>
      )}
      {tooltip && (
        <Tooltip
          target={`#${selectId}`}
          content={tooltip}
          position={tooltipPosition}
          className="text-sm"
        />
      )}
    </div>
  );
});

TreeSelectComponent.displayName = 'TreeSelect';

// Utilitários para selects
export const selectUtils = {
  /**
   * Converte array simples em opções
   */
  fromArray: (items: string[]): SelectOption[] => {
    return items.map(item => ({
      label: item,
      value: item
    }));
  },

  /**
   * Converte objeto em opções
   */
  fromObject: (obj: Record<string, string>): SelectOption[] => {
    return Object.entries(obj).map(([value, label]) => ({
      label,
      value
    }));
  },

  /**
   * Agrupa opções
   */
  groupOptions: (options: SelectOption[]): any[] => {
    const groups = options.reduce((acc, option) => {
      const group = option.group || 'Outros';
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(option);
      return acc;
    }, {} as Record<string, SelectOption[]>);

    return Object.entries(groups).map(([label, items]) => ({
      label,
      items
    }));
  },

  /**
   * Filtra opções
   */
  filterOptions: (options: SelectOption[], query: string): SelectOption[] => {
    const lowerQuery = query.toLowerCase();
    return options.filter(option => 
      option.label.toLowerCase().includes(lowerQuery) ||
      option.description?.toLowerCase().includes(lowerQuery)
    );
  },

  /**
   * Opções comuns para o sistema
   */
  commonOptions: {
    status: [
      { label: 'Ativo', value: 'active', icon: 'pi pi-check-circle' },
      { label: 'Inativo', value: 'inactive', icon: 'pi pi-times-circle' },
      { label: 'Pendente', value: 'pending', icon: 'pi pi-clock' }
    ],
    priority: [
      { label: 'Baixa', value: 'low', icon: 'pi pi-arrow-down' },
      { label: 'Média', value: 'medium', icon: 'pi pi-minus' },
      { label: 'Alta', value: 'high', icon: 'pi pi-arrow-up' },
      { label: 'Crítica', value: 'critical', icon: 'pi pi-exclamation-triangle' }
    ],
    paymentMethods: [
      { label: 'Dinheiro', value: 'cash', icon: 'pi pi-money-bill' },
      { label: 'Cartão', value: 'card', icon: 'pi pi-credit-card' },
      { label: 'PIX', value: 'pix', icon: 'pi pi-mobile' },
      { label: 'Transferência', value: 'transfer', icon: 'pi pi-send' }
    ],
    billingTypes: [
      { label: 'Único', value: 'one_time', description: 'Pagamento único' },
      { label: 'Recorrente', value: 'recurring', description: 'Cobrança periódica' },
      { label: 'Parcelado', value: 'installment', description: 'Dividido em parcelas' }
    ]
  }
};

export {
  Select,
  MultiSelectComponent as MultiSelect,
  AutoCompleteComponent as AutoComplete,
  TreeSelectComponent as TreeSelect
};

export type {
  SelectProps,
  MultiSelectComponentProps as MultiSelectProps,
  AutoCompleteComponentProps as AutoCompleteProps,
  TreeSelectComponentProps as TreeSelectProps
};
