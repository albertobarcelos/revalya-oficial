/**
 * Componente Dialog padronizado usando PrimeReact
 * Substitui os dialogs do Shadcn UI com design consistente
 */

import React from 'react';
import { Dialog as PrimeDialog, DialogProps as PrimeDialogProps } from 'primereact/dialog';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Sidebar } from 'primereact/sidebar';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { ProgressSpinner } from 'primereact/progressspinner';
import { cn } from '@/lib/utils';
import { usePrimeReactTheme } from '@/providers/PrimeReactProvider';

// Tipos base
interface BaseDialogProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge' | 'fullscreen';
  loading?: boolean;
  className?: string;
  children?: React.ReactNode;
}

// Dialog principal
interface DialogProps extends Omit<PrimeDialogProps, 'className'>, BaseDialogProps {
  title?: string;
  subtitle?: string;
  icon?: string;
  actions?: DialogAction[];
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnClickOutside?: boolean;
  onClose?: () => void;
}

// Ações do dialog
export interface DialogAction {
  label: string;
  icon?: string;
  onClick: () => void;
  severity?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  tooltip?: string;
  autoFocus?: boolean;
}

const Dialog = React.forwardRef<HTMLDivElement, DialogProps>((
  {
    size = 'medium',
    loading = false,
    title,
    subtitle,
    icon,
    actions = [],
    showCloseButton = true,
    closeOnEscape = true,
    closeOnClickOutside = true,
    onClose,
    className,
    children,
    visible,
    onHide,
    ...props
  },
  ref
) => {
  const { theme } = usePrimeReactTheme();

  // Configurações de tamanho
  const getSizeConfig = () => {
    const sizes = {
      small: { width: '400px', height: 'auto' },
      medium: { width: '600px', height: 'auto' },
      large: { width: '800px', height: 'auto' },
      xlarge: { width: '1200px', height: 'auto' },
      fullscreen: { width: '100vw', height: '100vh' }
    };
    return sizes[size];
  };

  // Header customizado
  const renderHeader = () => {
    if (!title && !subtitle && !icon) return undefined;

    return (
      <div className="flex items-center gap-3 pb-4">
        {icon && (
          <div className="flex-shrink-0">
            <i className={cn('text-2xl text-primary', icon)} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {title && (
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    );
  };

  // Footer customizado
  const renderFooter = () => {
    if (actions.length === 0) return undefined;

    return (
      <div className="flex gap-2 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        {actions.map((action, index) => (
          <Button
            key={index}
            label={action.label}
            icon={action.icon}
            severity={action.severity}
            onClick={action.onClick}
            disabled={action.disabled || loading}
            loading={action.loading}
            tooltip={action.tooltip}
            autoFocus={action.autoFocus}
          />
        ))}
      </div>
    );
  };

  const sizeConfig = getSizeConfig();
  const dialogClasses = cn(
    'border-0 shadow-xl',
    {
      'rounded-lg': size !== 'fullscreen',
      'rounded-none': size === 'fullscreen'
    },
    className
  );

  const handleHide = () => {
    if (onHide) onHide();
    if (onClose) onClose();
  };

  return (
    <PrimeDialog
      ref={ref}
      visible={visible}
      onHide={handleHide}
      header={renderHeader()}
      footer={renderFooter()}
      closable={showCloseButton}
      closeOnEscape={closeOnEscape}
      modal={closeOnClickOutside}
      dismissableMask={closeOnClickOutside}
      style={sizeConfig}
      className={dialogClasses}
      contentClassName="p-0"
      {...props}
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <ProgressSpinner size="50" strokeWidth="4" />
        </div>
      ) : (
        <div className="p-6">
          {children}
        </div>
      )}
    </PrimeDialog>
  );
});

Dialog.displayName = 'Dialog';

// Dialog de confirmação
interface ConfirmDialogProps {
  title?: string;
  message: string;
  icon?: string;
  severity?: 'info' | 'warning' | 'error' | 'success';
  acceptLabel?: string;
  rejectLabel?: string;
  onAccept?: () => void;
  onReject?: () => void;
}

const useConfirmDialog = () => {
  const showConfirm = ({
    title = 'Confirmação',
    message,
    icon,
    severity = 'warning',
    acceptLabel = 'Confirmar',
    rejectLabel = 'Cancelar',
    onAccept,
    onReject
  }: ConfirmDialogProps) => {
    const iconMap = {
      info: 'pi pi-info-circle',
      warning: 'pi pi-exclamation-triangle',
      error: 'pi pi-times-circle',
      success: 'pi pi-check-circle'
    };

    confirmDialog({
      message,
      header: title,
      icon: icon || iconMap[severity],
      acceptLabel,
      rejectLabel,
      accept: onAccept,
      reject: onReject,
      acceptClassName: cn({
        'p-button-danger': severity === 'error',
        'p-button-warning': severity === 'warning',
        'p-button-success': severity === 'success',
        'p-button-info': severity === 'info'
      }),
      rejectClassName: 'p-button-text'
    });
  };

  return { showConfirm };
};

// Dialog lateral (Sidebar)
interface SideDialogProps {
  visible: boolean;
  onHide: () => void;
  position?: 'left' | 'right' | 'top' | 'bottom';
  size?: 'small' | 'medium' | 'large';
  title?: string;
  subtitle?: string;
  icon?: string;
  actions?: DialogAction[];
  showCloseButton?: boolean;
  loading?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const SideDialog = React.forwardRef<HTMLDivElement, SideDialogProps>((
  {
    visible,
    onHide,
    position = 'right',
    size = 'medium',
    title,
    subtitle,
    icon,
    actions = [],
    showCloseButton = true,
    loading = false,
    className,
    children,
    ...props
  },
  ref
) => {
  // Configurações de tamanho para sidebar
  const getSidebarSize = () => {
    if (position === 'top' || position === 'bottom') {
      const heights = {
        small: '300px',
        medium: '500px',
        large: '700px'
      };
      return heights[size];
    } else {
      const widths = {
        small: '400px',
        medium: '600px',
        large: '800px'
      };
      return widths[size];
    }
  };

  // Header para sidebar
  const renderSidebarHeader = () => {
    if (!title && !subtitle && !icon && !showCloseButton) return undefined;

    return (
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {icon && (
            <div className="flex-shrink-0">
              <i className={cn('text-xl text-primary', icon)} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            {title && (
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        
        {showCloseButton && (
          <Button
            icon="pi pi-times"
            text
            severity="secondary"
            onClick={onHide}
            className="ml-2"
          />
        )}
      </div>
    );
  };

  // Footer para sidebar
  const renderSidebarFooter = () => {
    if (actions.length === 0) return undefined;

    return (
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2 justify-end">
          {actions.map((action, index) => (
            <Button
              key={index}
              label={action.label}
              icon={action.icon}
              severity={action.severity}
              onClick={action.onClick}
              disabled={action.disabled || loading}
              loading={action.loading}
              tooltip={action.tooltip}
              autoFocus={action.autoFocus}
            />
          ))}
        </div>
      </div>
    );
  };

  const sidebarClasses = cn(
    'border-0 shadow-xl',
    className
  );

  return (
    <Sidebar
      ref={ref}
      visible={visible}
      onHide={onHide}
      position={position}
      className={sidebarClasses}
      style={{
        width: position === 'left' || position === 'right' ? getSidebarSize() : undefined,
        height: position === 'top' || position === 'bottom' ? getSidebarSize() : undefined
      }}
      showCloseIcon={false}
      {...props}
    >
      <div className="h-full flex flex-col">
        {renderSidebarHeader()}
        
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <ProgressSpinner size="50" strokeWidth="4" />
            </div>
          ) : (
            <div className="p-4">
              {children}
            </div>
          )}
        </div>
        
        {renderSidebarFooter()}
      </div>
    </Sidebar>
  );
});

SideDialog.displayName = 'SideDialog';

// Dialog de formulário
interface FormDialogProps extends DialogProps {
  onSubmit?: (data: any) => void;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  submitDisabled?: boolean;
  submitLoading?: boolean;
  form?: React.ReactElement;
}

const FormDialog = React.forwardRef<HTMLDivElement, FormDialogProps>((
  {
    onSubmit,
    onCancel,
    submitLabel = 'Salvar',
    cancelLabel = 'Cancelar',
    submitDisabled = false,
    submitLoading = false,
    form,
    children,
    ...props
  },
  ref
) => {
  const defaultActions: DialogAction[] = [
    {
      label: cancelLabel,
      severity: 'secondary',
      onClick: onCancel || (() => {})
    },
    {
      label: submitLabel,
      severity: 'primary',
      onClick: onSubmit || (() => {}),
      disabled: submitDisabled,
      loading: submitLoading,
      autoFocus: true
    }
  ];

  return (
    <Dialog
      ref={ref}
      actions={defaultActions}
      {...props}
    >
      {form || children}
    </Dialog>
  );
});

FormDialog.displayName = 'FormDialog';

// Utilitários para dialogs
export const dialogUtils = {
  /**
   * Cria ações comuns para dialogs
   */
  createActions: {
    save: (onClick: () => void, loading = false): DialogAction => ({
      label: 'Salvar',
      icon: 'pi pi-check',
      onClick,
      severity: 'primary',
      loading,
      autoFocus: true
    }),
    cancel: (onClick: () => void): DialogAction => ({
      label: 'Cancelar',
      icon: 'pi pi-times',
      onClick,
      severity: 'secondary'
    }),
    delete: (onClick: () => void, loading = false): DialogAction => ({
      label: 'Excluir',
      icon: 'pi pi-trash',
      onClick,
      severity: 'danger',
      loading
    }),
    confirm: (onClick: () => void, loading = false): DialogAction => ({
      label: 'Confirmar',
      icon: 'pi pi-check',
      onClick,
      severity: 'primary',
      loading,
      autoFocus: true
    })
  },

  /**
   * Configurações de tamanho responsivo
   */
  responsiveSize: (breakpoint: 'sm' | 'md' | 'lg' = 'md') => {
    const sizes = {
      sm: { width: '90vw', maxWidth: '400px' },
      md: { width: '90vw', maxWidth: '600px' },
      lg: { width: '90vw', maxWidth: '800px' }
    };
    return sizes[breakpoint];
  },

  /**
   * Configurações de confirmação por tipo
   */
  confirmTypes: {
    delete: {
      title: 'Confirmar Exclusão',
      severity: 'error' as const,
      icon: 'pi pi-trash',
      acceptLabel: 'Excluir',
      rejectLabel: 'Cancelar'
    },
    save: {
      title: 'Confirmar Alterações',
      severity: 'warning' as const,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Salvar',
      rejectLabel: 'Cancelar'
    },
    discard: {
      title: 'Descartar Alterações',
      severity: 'warning' as const,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Descartar',
      rejectLabel: 'Continuar Editando'
    }
  }
};

export {
  Dialog,
  SideDialog,
  FormDialog,
  ConfirmDialog,
  useConfirmDialog
};

export type {
  DialogProps,
  SideDialogProps,
  FormDialogProps,
  ConfirmDialogProps
};
