/**
 * Componente Button padronizado usando PrimeReact
 * Substitui o Button do Shadcn UI com design consistente
 */

import React from 'react';
import { Button as PrimeButton, ButtonProps as PrimeButtonProps } from 'primereact/button';
import { Tooltip } from 'primereact/tooltip';
import { cn } from '@/lib/utils';
import { usePrimeReactTheme } from '@/providers/PrimeReactProvider';

interface ButtonProps extends Omit<PrimeButtonProps, 'size'> {
  variant?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'danger' | 'help' | 'outlined' | 'text' | 'link';
  size?: 'small' | 'normal' | 'large';
  fullWidth?: boolean;
  loading?: boolean;
  tooltip?: string;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
  children?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((
  {
    variant = 'primary',
    size = 'normal',
    fullWidth = false,
    loading = false,
    tooltip,
    tooltipPosition = 'top',
    className,
    disabled,
    children,
    label,
    icon,
    ...props
  },
  ref
) => {
  const { theme } = usePrimeReactTheme();
  const buttonId = React.useId();

  // Mapear variantes para classes do PrimeReact
  const getVariantClass = () => {
    const variants = {
      primary: '',
      secondary: 'p-button-secondary',
      success: 'p-button-success',
      info: 'p-button-info',
      warning: 'p-button-warning',
      danger: 'p-button-danger',
      help: 'p-button-help',
      outlined: 'p-button-outlined',
      text: 'p-button-text',
      link: 'p-button-link'
    };
    return variants[variant];
  };

  // Mapear tamanhos
  const getSizeClass = () => {
    const sizes = {
      small: 'p-button-sm',
      normal: '',
      large: 'p-button-lg'
    };
    return sizes[size];
  };

  // Classes customizadas
  const customClasses = cn(
    'transition-all duration-200 ease-in-out',
    'focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
    'hover:transform hover:-translate-y-0.5',
    'active:transform active:translate-y-0',
    {
      'w-full': fullWidth,
      'opacity-60 cursor-not-allowed': disabled && !loading,
      'cursor-wait': loading
    },
    getVariantClass(),
    getSizeClass(),
    className
  );

  // Ícone de loading
  const loadingIcon = loading ? 'pi pi-spin pi-spinner' : icon;

  return (
    <>
      <PrimeButton
        ref={ref}
        id={buttonId}
        label={children || label}
        icon={loadingIcon}
        className={customClasses}
        disabled={disabled || loading}
        loading={loading}
        {...props}
      />
      {tooltip && (
        <Tooltip
          target={`#${buttonId}`}
          content={tooltip}
          position={tooltipPosition}
          className="text-sm"
        />
      )}
    </>
  );
});

Button.displayName = 'Button';

export { Button };
export type { ButtonProps };

// Componentes especializados
export const IconButton = React.forwardRef<HTMLButtonElement, ButtonProps & { iconOnly?: boolean }>((
  { iconOnly = true, size = 'normal', ...props },
  ref
) => {
  return (
    <Button
      ref={ref}
      size={size}
      className={cn(
        {
          'p-button-rounded': iconOnly,
          'aspect-square': iconOnly
        },
        props.className
      )}
      {...props}
    />
  );
});

IconButton.displayName = 'IconButton';

export const LoadingButton = React.forwardRef<HTMLButtonElement, ButtonProps & { isLoading?: boolean }>((
  { isLoading = false, children, ...props },
  ref
) => {
  return (
    <Button
      ref={ref}
      loading={isLoading}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {children}
    </Button>
  );
});

LoadingButton.displayName = 'LoadingButton';

export const ButtonGroup = ({ children, className, ...props }: { children: React.ReactNode; className?: string }) => {
  return (
    <div
      className={cn(
        'flex',
        'divide-x divide-gray-200 dark:divide-gray-700',
        '[&>*:first-child]:rounded-l-md [&>*:last-child]:rounded-r-md',
        '[&>*:not(:first-child):not(:last-child)]:rounded-none',
        '[&>*]:border-r-0 [&>*:last-child]:border-r',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

ButtonGroup.displayName = 'ButtonGroup';

// Utilitários para botões
export const buttonUtils = {
  /**
   * Cria um botão de ação com ícone e tooltip
   */
  createActionButton: ({
    icon,
    tooltip,
    onClick,
    variant = 'text',
    size = 'small'
  }: {
    icon: string;
    tooltip: string;
    onClick: () => void;
    variant?: ButtonProps['variant'];
    size?: ButtonProps['size'];
  }) => {
    return (
      <IconButton
        icon={icon}
        tooltip={tooltip}
        variant={variant}
        size={size}
        onClick={onClick}
      />
    );
  },

  /**
   * Cria um botão de confirmação com loading
   */
  createConfirmButton: ({
    label,
    isLoading,
    onClick,
    variant = 'primary'
  }: {
    label: string;
    isLoading: boolean;
    onClick: () => void;
    variant?: ButtonProps['variant'];
  }) => {
    return (
      <LoadingButton
        isLoading={isLoading}
        variant={variant}
        onClick={onClick}
      >
        {label}
      </LoadingButton>
    );
  },

  /**
   * Cria um grupo de botões de ação (Salvar/Cancelar)
   */
  createActionGroup: ({
    onSave,
    onCancel,
    isSaving = false,
    saveLabel = 'Salvar',
    cancelLabel = 'Cancelar'
  }: {
    onSave: () => void;
    onCancel: () => void;
    isSaving?: boolean;
    saveLabel?: string;
    cancelLabel?: string;
  }) => {
    return (
      <ButtonGroup>
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={isSaving}
        >
          {cancelLabel}
        </Button>
        <LoadingButton
          variant="primary"
          isLoading={isSaving}
          onClick={onSave}
        >
          {saveLabel}
        </LoadingButton>
      </ButtonGroup>
    );
  }
};
