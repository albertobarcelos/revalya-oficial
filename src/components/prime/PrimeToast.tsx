/**
 * Componente Toast padronizado usando PrimeReact
 * Sistema de notificações centralizado e consistente
 */

import React from 'react';
import { Toast, ToastMessage } from 'primereact/toast';
import { Button } from 'primereact/button';
import { cn } from '@/lib/utils';
import { usePrimeReactTheme } from '@/providers/PrimeReactProvider';

// Tipos para notificações
export interface NotificationOptions {
  title?: string;
  message: string;
  severity?: 'success' | 'info' | 'warn' | 'error';
  life?: number;
  sticky?: boolean;
  closable?: boolean;
  icon?: string;
  actions?: NotificationAction[];
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  group?: string;
}

export interface NotificationAction {
  label: string;
  icon?: string;
  onClick: () => void;
  severity?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'danger';
}

// Context para gerenciar toasts globalmente
interface ToastContextType {
  showToast: (options: NotificationOptions) => void;
  showSuccess: (message: string, title?: string, options?: Partial<NotificationOptions>) => void;
  showError: (message: string, title?: string, options?: Partial<NotificationOptions>) => void;
  showWarning: (message: string, title?: string, options?: Partial<NotificationOptions>) => void;
  showInfo: (message: string, title?: string, options?: Partial<NotificationOptions>) => void;
  clear: (group?: string) => void;
  clearAll: () => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

// Provider para toasts
interface ToastProviderProps {
  children: React.ReactNode;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  className?: string;
}

const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  position = 'top-right',
  className
}) => {
  const toastRef = React.useRef<Toast>(null);
  const { theme } = usePrimeReactTheme();

  const showToast = React.useCallback((options: NotificationOptions) => {
    if (!toastRef.current) return;

    const {
      title,
      message,
      severity = 'info',
      life = 5000,
      sticky = false,
      closable = true,
      icon,
      actions = [],
      group
    } = options;

    // Template customizado para ações
    const contentTemplate = actions.length > 0 ? (toastMessage: ToastMessage) => (
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          {icon && (
            <i className={cn('text-lg flex-shrink-0 mt-0.5', icon)} />
          )}
          <div className="flex-1 min-w-0">
            {title && (
              <div className="font-semibold text-sm mb-1">
                {title}
              </div>
            )}
            <div className="text-sm">
              {message}
            </div>
          </div>
          {closable && (
            <Button
              icon="pi pi-times"
              text
              size="small"
              className="p-1 w-6 h-6"
              onClick={() => toastRef.current?.clear()}
            />
          )}
        </div>
        
        {actions.length > 0 && (
          <div className="flex gap-2 justify-end pt-2 border-t border-white/20">
            {actions.map((action, index) => (
              <Button
                key={index}
                label={action.label}
                icon={action.icon}
                size="small"
                severity={action.severity}
                onClick={() => {
                  action.onClick();
                  toastRef.current?.clear();
                }}
                className="text-xs"
              />
            ))}
          </div>
        )}
      </div>
    ) : undefined;

    const toastMessage: ToastMessage = {
      severity,
      summary: title,
      detail: message,
      life: sticky ? undefined : life,
      closable,
      group,
      contentTemplate
    };

    toastRef.current.show(toastMessage);
  }, []);

  const showSuccess = React.useCallback((message: string, title?: string, options?: Partial<NotificationOptions>) => {
    showToast({
      message,
      title: title || 'Sucesso',
      severity: 'success',
      icon: 'pi pi-check-circle',
      ...options
    });
  }, [showToast]);

  const showError = React.useCallback((message: string, title?: string, options?: Partial<NotificationOptions>) => {
    showToast({
      message,
      title: title || 'Erro',
      severity: 'error',
      icon: 'pi pi-times-circle',
      life: 8000, // Erros ficam mais tempo
      ...options
    });
  }, [showToast]);

  const showWarning = React.useCallback((message: string, title?: string, options?: Partial<NotificationOptions>) => {
    showToast({
      message,
      title: title || 'Atenção',
      severity: 'warn',
      icon: 'pi pi-exclamation-triangle',
      life: 6000,
      ...options
    });
  }, [showToast]);

  const showInfo = React.useCallback((message: string, title?: string, options?: Partial<NotificationOptions>) => {
    showToast({
      message,
      title: title || 'Informação',
      severity: 'info',
      icon: 'pi pi-info-circle',
      ...options
    });
  }, [showToast]);

  const clear = React.useCallback((group?: string) => {
    if (!toastRef.current) return;
    if (group) {
      toastRef.current.clear();
    } else {
      toastRef.current.clear();
    }
  }, []);

  const clearAll = React.useCallback(() => {
    if (!toastRef.current) return;
    toastRef.current.clear();
  }, []);

  const contextValue: ToastContextType = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clear,
    clearAll
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <Toast
        ref={toastRef}
        position={position}
        className={cn('z-50', className)}
      />
    </ToastContext.Provider>
  );
};

// Hook para usar toasts
const useToast = (): ToastContextType => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider');
  }
  return context;
};

// Hook para notificações de operações assíncronas
interface AsyncToastOptions {
  loadingMessage?: string;
  successMessage?: string;
  errorMessage?: string;
  successTitle?: string;
  errorTitle?: string;
}

const useAsyncToast = () => {
  const toast = useToast();
  const [loading, setLoading] = React.useState(false);

  const executeWithToast = React.useCallback(async <T>(
    asyncFn: () => Promise<T>,
    options: AsyncToastOptions = {}
  ): Promise<T | null> => {
    const {
      loadingMessage = 'Processando...',
      successMessage = 'Operação realizada com sucesso',
      errorMessage = 'Erro ao realizar operação',
      successTitle = 'Sucesso',
      errorTitle = 'Erro'
    } = options;

    setLoading(true);
    
    // Mostra toast de loading se especificado
    if (loadingMessage) {
      toast.showInfo(loadingMessage, 'Aguarde', { sticky: true, group: 'async-operation' });
    }

    try {
      const result = await asyncFn();
      
      // Limpa toast de loading
      toast.clear('async-operation');
      
      // Mostra sucesso
      toast.showSuccess(successMessage, successTitle);
      
      return result;
    } catch (error) {
      // Limpa toast de loading
      toast.clear('async-operation');
      
      // Mostra erro
      const errorMsg = error instanceof Error ? error.message : errorMessage;
      toast.showError(errorMsg, errorTitle);
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    executeWithToast,
    loading
  };
};

// Componente para toasts inline (não globais)
interface InlineToastProps {
  severity: 'success' | 'info' | 'warn' | 'error';
  title?: string;
  message: string;
  icon?: string;
  closable?: boolean;
  onClose?: () => void;
  actions?: NotificationAction[];
  className?: string;
}

const InlineToast: React.FC<InlineToastProps> = ({
  severity,
  title,
  message,
  icon,
  closable = true,
  onClose,
  actions = [],
  className
}) => {
  const severityClasses = {
    success: 'bg-success/10 border-success/20 text-success dark:bg-success/10 dark:border-success/20 dark:text-success',
    info: 'bg-primary/10 border-primary/20 text-primary dark:bg-primary/10 dark:border-primary/20 dark:text-primary',
    warn: 'bg-warning/10 border-warning/20 text-warning dark:bg-warning/10 dark:border-warning/20 dark:text-warning',
    error: 'bg-danger/10 border-danger/20 text-danger dark:bg-danger/10 dark:border-danger/20 dark:text-danger'
  };

  const defaultIcons = {
    success: 'pi pi-check-circle',
    info: 'pi pi-info-circle',
    warn: 'pi pi-exclamation-triangle',
    error: 'pi pi-times-circle'
  };

  const displayIcon = icon || defaultIcons[severity];

  return (
    <div className={cn(
      'border rounded-lg p-4',
      severityClasses[severity],
      className
    )}>
      <div className="flex items-start gap-3">
        <i className={cn('text-lg flex-shrink-0 mt-0.5', displayIcon)} />
        
        <div className="flex-1 min-w-0">
          {title && (
            <div className="font-semibold text-sm mb-1">
              {title}
            </div>
          )}
          <div className="text-sm">
            {message}
          </div>
          
          {actions.length > 0 && (
            <div className="flex gap-2 mt-3">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  label={action.label}
                  icon={action.icon}
                  size="small"
                  severity={action.severity}
                  onClick={action.onClick}
                  className="text-xs"
                />
              ))}
            </div>
          )}
        </div>
        
        {closable && (
          <Button
            icon="pi pi-times"
            text
            size="small"
            className="p-1 w-6 h-6 opacity-70 hover:opacity-100"
            onClick={onClose}
          />
        )}
      </div>
    </div>
  );
};

// Utilitários para toasts
export const toastUtils = {
  /**
   * Mensagens padrão do sistema
   */
  messages: {
    save: {
      success: 'Dados salvos com sucesso',
      error: 'Erro ao salvar dados'
    },
    delete: {
      success: 'Item excluído com sucesso',
      error: 'Erro ao excluir item'
    },
    create: {
      success: 'Item criado com sucesso',
      error: 'Erro ao criar item'
    },
    update: {
      success: 'Item atualizado com sucesso',
      error: 'Erro ao atualizar item'
    },
    load: {
      error: 'Erro ao carregar dados'
    },
    network: {
      error: 'Erro de conexão. Verifique sua internet.'
    },
    validation: {
      error: 'Verifique os dados informados'
    },
    permission: {
      error: 'Você não tem permissão para esta ação'
    }
  },

  /**
   * Cria ações comuns para toasts
   */
  createActions: {
    retry: (onRetry: () => void): NotificationAction => ({
      label: 'Tentar Novamente',
      icon: 'pi pi-refresh',
      onClick: onRetry,
      severity: 'primary'
    }),
    undo: (onUndo: () => void): NotificationAction => ({
      label: 'Desfazer',
      icon: 'pi pi-undo',
      onClick: onUndo,
      severity: 'secondary'
    }),
    view: (onView: () => void): NotificationAction => ({
      label: 'Visualizar',
      icon: 'pi pi-eye',
      onClick: onView,
      severity: 'info'
    }),
    edit: (onEdit: () => void): NotificationAction => ({
      label: 'Editar',
      icon: 'pi pi-pencil',
      onClick: onEdit,
      severity: 'warning'
    })
  },

  /**
   * Configurações por contexto
   */
  contexts: {
    form: {
      position: 'top-center' as const,
      life: 4000
    },
    operation: {
      position: 'top-right' as const,
      life: 5000
    },
    system: {
      position: 'bottom-right' as const,
      life: 8000,
      sticky: true
    }
  }
};

export {
  ToastProvider,
  useToast,
  useAsyncToast,
  InlineToast
};

export type {
  NotificationOptions,
  NotificationAction,
  AsyncToastOptions,
  InlineToastProps
};
