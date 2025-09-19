/**
 * Componente Input padronizado usando PrimeReact
 * Substitui os inputs do Shadcn UI com design consistente
 */

import React from 'react';
import { InputText, InputTextProps } from 'primereact/inputtext';
import { InputNumber, InputNumberProps } from 'primereact/inputnumber';
import { InputTextarea, InputTextareaProps } from 'primereact/inputtextarea';
import { Password, PasswordProps } from 'primereact/password';
import { InputMask, InputMaskProps } from 'primereact/inputmask';
import { FloatLabel } from 'primereact/floatlabel';
import { Tooltip } from 'primereact/tooltip';
import { cn } from '@/lib/utils';
import { usePrimeReactTheme } from '@/providers/PrimeReactProvider';

// Tipos base
interface BaseInputProps {
  label?: string;
  error?: string;
  helper?: string;
  tooltip?: string;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
  required?: boolean;
  fullWidth?: boolean;
  floatingLabel?: boolean;
  size?: 'small' | 'normal' | 'large';
}

// Input de texto
interface TextInputProps extends Omit<InputTextProps, 'size'>, BaseInputProps {
  type?: 'text' | 'email' | 'url' | 'search';
}

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>((
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
    className,
    type = 'text',
    ...props
  },
  ref
) => {
  const { theme } = usePrimeReactTheme();
  const inputId = React.useId();

  const getSizeClass = () => {
    const sizes = {
      small: 'p-inputtext-sm',
      normal: '',
      large: 'p-inputtext-lg'
    };
    return sizes[size];
  };

  const inputClasses = cn(
    'transition-all duration-200',
    {
      'w-full': fullWidth,
      'p-invalid': error,
      'border-red-500 focus:border-red-500': error
    },
    getSizeClass(),
    className
  );

  const InputComponent = (
    <InputText
      ref={ref}
      id={inputId}
      type={type}
      className={inputClasses}
      invalid={!!error}
      {...props}
    />
  );

  const WrappedInput = floatingLabel && label ? (
    <FloatLabel>
      {InputComponent}
      <label htmlFor={inputId}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    </FloatLabel>
  ) : (
    <>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {InputComponent}
    </>
  );

  return (
    <div className="space-y-1">
      {WrappedInput}
      {helper && !error && (
        <small className="text-gray-500 dark:text-gray-400">{helper}</small>
      )}
      {error && (
        <small className="text-red-500 dark:text-red-400">{error}</small>
      )}
      {tooltip && (
        <Tooltip
          target={`#${inputId}`}
          content={tooltip}
          position={tooltipPosition}
          className="text-sm"
        />
      )}
    </div>
  );
});

TextInput.displayName = 'TextInput';

// Input numérico
interface NumberInputProps extends Omit<InputNumberProps, 'size'>, BaseInputProps {
  currency?: boolean;
  percentage?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>((
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
    currency = false,
    percentage = false,
    className,
    ...props
  },
  ref
) => {
  const inputId = React.useId();

  const getSizeClass = () => {
    const sizes = {
      small: 'p-inputtext-sm',
      normal: '',
      large: 'p-inputtext-lg'
    };
    return sizes[size];
  };

  const inputClasses = cn(
    'transition-all duration-200',
    {
      'w-full': fullWidth,
      'p-invalid': error
    },
    getSizeClass(),
    className
  );

  const formatProps = currency
    ? {
        mode: 'currency' as const,
        currency: 'BRL',
        locale: 'pt-BR'
      }
    : percentage
    ? {
        mode: 'decimal' as const,
        suffix: '%',
        min: 0,
        max: 100
      }
    : {
        mode: 'decimal' as const,
        locale: 'pt-BR'
      };

  const InputComponent = (
    <InputNumber
      ref={ref}
      id={inputId}
      className={inputClasses}
      invalid={!!error}
      {...formatProps}
      {...props}
    />
  );

  const WrappedInput = floatingLabel && label ? (
    <FloatLabel>
      {InputComponent}
      <label htmlFor={inputId}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    </FloatLabel>
  ) : (
    <>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {InputComponent}
    </>
  );

  return (
    <div className="space-y-1">
      {WrappedInput}
      {helper && !error && (
        <small className="text-gray-500 dark:text-gray-400">{helper}</small>
      )}
      {error && (
        <small className="text-red-500 dark:text-red-400">{error}</small>
      )}
      {tooltip && (
        <Tooltip
          target={`#${inputId}`}
          content={tooltip}
          position={tooltipPosition}
          className="text-sm"
        />
      )}
    </div>
  );
});

NumberInput.displayName = 'NumberInput';

// Textarea
interface TextareaProps extends Omit<InputTextareaProps, 'size'>, BaseInputProps {
  rows?: number;
  autoResize?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>((
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
    rows = 3,
    autoResize = false,
    className,
    ...props
  },
  ref
) => {
  const inputId = React.useId();

  const getSizeClass = () => {
    const sizes = {
      small: 'p-inputtext-sm',
      normal: '',
      large: 'p-inputtext-lg'
    };
    return sizes[size];
  };

  const inputClasses = cn(
    'transition-all duration-200',
    {
      'w-full': fullWidth,
      'p-invalid': error
    },
    getSizeClass(),
    className
  );

  const InputComponent = (
    <InputTextarea
      ref={ref}
      id={inputId}
      rows={rows}
      autoResize={autoResize}
      className={inputClasses}
      invalid={!!error}
      {...props}
    />
  );

  const WrappedInput = floatingLabel && label ? (
    <FloatLabel>
      {InputComponent}
      <label htmlFor={inputId}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    </FloatLabel>
  ) : (
    <>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {InputComponent}
    </>
  );

  return (
    <div className="space-y-1">
      {WrappedInput}
      {helper && !error && (
        <small className="text-gray-500 dark:text-gray-400">{helper}</small>
      )}
      {error && (
        <small className="text-red-500 dark:text-red-400">{error}</small>
      )}
      {tooltip && (
        <Tooltip
          target={`#${inputId}`}
          content={tooltip}
          position={tooltipPosition}
          className="text-sm"
        />
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

// Input de senha
interface PasswordInputProps extends Omit<PasswordProps, 'size'>, BaseInputProps {
  showStrength?: boolean;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>((
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
    showStrength = true,
    className,
    ...props
  },
  ref
) => {
  const inputId = React.useId();

  const getSizeClass = () => {
    const sizes = {
      small: 'p-inputtext-sm',
      normal: '',
      large: 'p-inputtext-lg'
    };
    return sizes[size];
  };

  const inputClasses = cn(
    'transition-all duration-200',
    {
      'w-full': fullWidth,
      'p-invalid': error
    },
    getSizeClass(),
    className
  );

  const InputComponent = (
    <Password
      ref={ref}
      id={inputId}
      className={inputClasses}
      invalid={!!error}
      feedback={showStrength}
      toggleMask
      {...props}
    />
  );

  const WrappedInput = floatingLabel && label ? (
    <FloatLabel>
      {InputComponent}
      <label htmlFor={inputId}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    </FloatLabel>
  ) : (
    <>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {InputComponent}
    </>
  );

  return (
    <div className="space-y-1">
      {WrappedInput}
      {helper && !error && (
        <small className="text-gray-500 dark:text-gray-400">{helper}</small>
      )}
      {error && (
        <small className="text-red-500 dark:text-red-400">{error}</small>
      )}
      {tooltip && (
        <Tooltip
          target={`#${inputId}`}
          content={tooltip}
          position={tooltipPosition}
          className="text-sm"
        />
      )}
    </div>
  );
});

PasswordInput.displayName = 'PasswordInput';

// Input com máscara
interface MaskedInputProps extends Omit<InputMaskProps, 'size'>, BaseInputProps {
  mask: string;
}

const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>((
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
    className,
    mask,
    ...props
  },
  ref
) => {
  const inputId = React.useId();

  const getSizeClass = () => {
    const sizes = {
      small: 'p-inputtext-sm',
      normal: '',
      large: 'p-inputtext-lg'
    };
    return sizes[size];
  };

  const inputClasses = cn(
    'transition-all duration-200',
    {
      'w-full': fullWidth,
      'p-invalid': error
    },
    getSizeClass(),
    className
  );

  const InputComponent = (
    <InputMask
      ref={ref}
      id={inputId}
      mask={mask}
      className={inputClasses}
      invalid={!!error}
      {...props}
    />
  );

  const WrappedInput = floatingLabel && label ? (
    <FloatLabel>
      {InputComponent}
      <label htmlFor={inputId}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    </FloatLabel>
  ) : (
    <>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {InputComponent}
    </>
  );

  return (
    <div className="space-y-1">
      {WrappedInput}
      {helper && !error && (
        <small className="text-gray-500 dark:text-gray-400">{helper}</small>
      )}
      {error && (
        <small className="text-red-500 dark:text-red-400">{error}</small>
      )}
      {tooltip && (
        <Tooltip
          target={`#${inputId}`}
          content={tooltip}
          position={tooltipPosition}
          className="text-sm"
        />
      )}
    </div>
  );
});

MaskedInput.displayName = 'MaskedInput';

// Utilitários para inputs
export const inputUtils = {
  /**
   * Máscaras comuns brasileiras
   */
  masks: {
    cpf: '999.999.999-99',
    cnpj: '99.999.999/9999-99',
    phone: '(99) 99999-9999',
    cep: '99999-999',
    date: '99/99/9999',
    time: '99:99',
    currency: '999.999.999,99'
  },

  /**
   * Validadores comuns
   */
  validators: {
    email: (value: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value) || 'Email inválido';
    },
    required: (value: any) => {
      return (value !== null && value !== undefined && value !== '') || 'Campo obrigatório';
    },
    minLength: (min: number) => (value: string) => {
      return (value && value.length >= min) || `Mínimo ${min} caracteres`;
    },
    maxLength: (max: number) => (value: string) => {
      return (!value || value.length <= max) || `Máximo ${max} caracteres`;
    }
  },

  /**
   * Formatadores de valor
   */
  formatters: {
    currency: (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    },
    percentage: (value: number) => {
      return `${value}%`;
    },
    phone: (value: string) => {
      return value.replace(/\D/g, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
  }
};

export {
  TextInput,
  NumberInput,
  Textarea,
  PasswordInput,
  MaskedInput
};

export type {
  TextInputProps,
  NumberInputProps,
  TextareaProps,
  PasswordInputProps,
  MaskedInputProps
};
