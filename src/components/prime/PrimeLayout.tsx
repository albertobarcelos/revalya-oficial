import React, { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { PrimeButton, IconButton } from './PrimeButton';
import { SidebarMenu, TopNavMenu, BreadcrumbWrapper, type ExtendedMenuItem } from './PrimeMenu';
import { Card } from './PrimeCard';
import { useToast } from './PrimeToast';
import { usePrimeReactTheme } from '@/providers/PrimeReactProvider';

// Tipos para configuração do layout
export interface LayoutConfig {
  showSidebar?: boolean;
  showTopNav?: boolean;
  showBreadcrumb?: boolean;
  sidebarCollapsible?: boolean;
  sidebarDefaultCollapsed?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  background?: 'default' | 'gray' | 'white';
}

export interface PageHeaderConfig {
  title: string;
  subtitle?: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumb?: Array<{ label: string; href?: string; icon?: string }>;
  tabs?: Array<{ label: string; value: string; icon?: string; disabled?: boolean }>;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

// Contexto do layout
interface LayoutContextType {
  config: LayoutConfig;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

const LayoutContext = createContext<LayoutContextType | null>(null);

// Hook para usar o contexto do layout
export const usePrimeLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('usePrimeLayout deve ser usado dentro de um PrimeLayout');
  }
  return context;
};

// Componente de cabeçalho da página
interface PageHeaderProps {
  config: PageHeaderConfig;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ config, className }) => {
  const { title, subtitle, description, actions, breadcrumb, tabs, activeTab, onTabChange } = config;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Breadcrumb */}
      {breadcrumb && breadcrumb.length > 0 && (
        <BreadcrumbWrapper
          items={breadcrumb.map(item => ({
            label: item.label,
            url: item.href,
            icon: item.icon
          }))}
        />
      )}
      
      {/* Título e ações */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-2xl">
              {description}
            </p>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
      
      {/* Tabs */}
      {tabs && tabs.length > 0 && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => onTabChange?.(tab.value)}
                disabled={tab.disabled}
                className={cn(
                  'flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                  activeTab === tab.value
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300',
                  tab.disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {tab.icon && <i className={tab.icon} />}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
};

// Componente de sidebar
interface SidebarProps {
  menuItems: ExtendedMenuItem[];
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ menuItems, collapsed, onToggle, className }) => {
  return (
    <div className={cn(
      'bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300',
      collapsed ? 'w-16' : 'w-64',
      className
    )}>
      {/* Header do sidebar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <i className="pi pi-home text-white text-sm" />
            </div>
            <span className="font-semibold text-gray-900 dark:text-gray-100">Revalya</span>
          </div>
        )}
        
        <IconButton
          icon={collapsed ? 'pi pi-angle-right' : 'pi pi-angle-left'}
          variant="ghost"
          size="sm"
          onClick={onToggle}
          tooltip={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
        />
      </div>
      
      {/* Menu */}
      <div className="p-2">
        <SidebarMenu
          items={menuItems}
          collapsed={collapsed}
        />
      </div>
    </div>
  );
};

// Componente de top navigation
interface TopNavProps {
  menuItems: ExtendedMenuItem[];
  userMenu?: ExtendedMenuItem[];
  notifications?: number;
  onNotificationClick?: () => void;
  className?: string;
}

export const TopNav: React.FC<TopNavProps> = ({
  menuItems,
  userMenu,
  notifications,
  onNotificationClick,
  className
}) => {
  const { toggleTheme, isDarkMode } = usePrimeReactTheme();

  return (
    <div className={cn(
      'bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3',
      className
    )}>
      <div className="flex items-center justify-between">
        {/* Menu principal */}
        <div className="flex items-center gap-4">
          <TopNavMenu items={menuItems} />
        </div>
        
        {/* Ações do usuário */}
        <div className="flex items-center gap-2">
          {/* Toggle de tema */}
          <IconButton
            icon={isDarkMode ? 'pi pi-sun' : 'pi pi-moon'}
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            tooltip={isDarkMode ? 'Modo claro' : 'Modo escuro'}
          />
          
          {/* Notificações */}
          {onNotificationClick && (
            <div className="relative">
              <IconButton
                icon="pi pi-bell"
                variant="ghost"
                size="sm"
                onClick={onNotificationClick}
                tooltip="Notificações"
              />
              {notifications && notifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notifications > 99 ? '99+' : notifications}
                </span>
              )}
            </div>
          )}
          
          {/* Menu do usuário */}
          {userMenu && (
            <TopNavMenu
              items={userMenu}
              trigger={
                <IconButton
                  icon="pi pi-user"
                  variant="ghost"
                  size="sm"
                  tooltip="Menu do usuário"
                />
              }
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Componente de conteúdo principal
interface MainContentProps {
  children: React.ReactNode;
  config: LayoutConfig;
  className?: string;
}

export const MainContent: React.FC<MainContentProps> = ({ children, config, className }) => {
  const { maxWidth, padding, background } = config;
  
  return (
    <main className={cn(
      'flex-1 overflow-auto',
      background === 'gray' && 'bg-gray-50 dark:bg-gray-900',
      background === 'white' && 'bg-white dark:bg-gray-800',
      className
    )}>
      <div className={cn(
        'mx-auto',
        maxWidth === 'sm' && 'max-w-sm',
        maxWidth === 'md' && 'max-w-md',
        maxWidth === 'lg' && 'max-w-4xl',
        maxWidth === 'xl' && 'max-w-6xl',
        maxWidth === '2xl' && 'max-w-7xl',
        maxWidth === 'full' && 'max-w-full',
        padding === 'sm' && 'p-4',
        padding === 'md' && 'p-6',
        padding === 'lg' && 'p-8',
        padding === 'none' && 'p-0'
      )}>
        {children}
      </div>
    </main>
  );
};

// Componente principal do layout
interface PrimeLayoutProps {
  config?: Partial<LayoutConfig>;
  sidebarItems?: ExtendedMenuItem[];
  topNavItems?: ExtendedMenuItem[];
  userMenuItems?: ExtendedMenuItem[];
  notifications?: number;
  onNotificationClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const PrimeLayout: React.FC<PrimeLayoutProps> = ({
  config = {},
  sidebarItems = [],
  topNavItems = [],
  userMenuItems,
  notifications,
  onNotificationClick,
  children,
  className
}) => {
  const defaultConfig: LayoutConfig = {
    showSidebar: true,
    showTopNav: true,
    showBreadcrumb: true,
    sidebarCollapsible: true,
    sidebarDefaultCollapsed: false,
    maxWidth: 'full',
    padding: 'md',
    background: 'gray',
    ...config
  };

  const [sidebarCollapsed, setSidebarCollapsed] = useState(defaultConfig.sidebarDefaultCollapsed || false);
  const [currentPage, setCurrentPage] = useState('');

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  const contextValue: LayoutContextType = {
    config: defaultConfig,
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar,
    currentPage,
    setCurrentPage
  };

  return (
    <LayoutContext.Provider value={contextValue}>
      <div className={cn('min-h-screen flex flex-col', className)}>
        {/* Top Navigation */}
        {defaultConfig.showTopNav && (
          <TopNav
            menuItems={topNavItems}
            userMenu={userMenuItems}
            notifications={notifications}
            onNotificationClick={onNotificationClick}
          />
        )}
        
        {/* Layout principal */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          {defaultConfig.showSidebar && (
            <Sidebar
              menuItems={sidebarItems}
              collapsed={sidebarCollapsed}
              onToggle={toggleSidebar}
            />
          )}
          
          {/* Conteúdo principal */}
          <MainContent config={defaultConfig}>
            {children}
          </MainContent>
        </div>
      </div>
    </LayoutContext.Provider>
  );
};

// Componente de página completa
interface PageProps {
  header?: PageHeaderConfig;
  layout?: Partial<LayoutConfig>;
  sidebarItems?: ExtendedMenuItem[];
  topNavItems?: ExtendedMenuItem[];
  userMenuItems?: ExtendedMenuItem[];
  notifications?: number;
  onNotificationClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const Page: React.FC<PageProps> = ({
  header,
  layout,
  sidebarItems,
  topNavItems,
  userMenuItems,
  notifications,
  onNotificationClick,
  children,
  className
}) => {
  return (
    <PrimeLayout
      config={layout}
      sidebarItems={sidebarItems}
      topNavItems={topNavItems}
      userMenuItems={userMenuItems}
      notifications={notifications}
      onNotificationClick={onNotificationClick}
      className={className}
    >
      <div className="space-y-6">
        {header && <PageHeader config={header} />}
        {children}
      </div>
    </PrimeLayout>
  );
};

// Utilitários para criação de layouts
export const layoutUtils = {
  // Configurações de layout pré-definidas
  configs: {
    dashboard: {
      showSidebar: true,
      showTopNav: true,
      maxWidth: 'full',
      padding: 'md',
      background: 'gray' as const
    },
    form: {
      showSidebar: false,
      showTopNav: true,
      maxWidth: 'lg',
      padding: 'lg',
      background: 'white' as const
    },
    report: {
      showSidebar: true,
      showTopNav: true,
      maxWidth: 'full',
      padding: 'sm',
      background: 'white' as const
    },
    minimal: {
      showSidebar: false,
      showTopNav: false,
      maxWidth: 'md',
      padding: 'lg',
      background: 'white' as const
    }
  },
  
  // Criar item de menu
  createMenuItem: (label: string, icon: string, url?: string, options: Partial<ExtendedMenuItem> = {}): ExtendedMenuItem => ({
    label,
    icon,
    url,
    ...options
  }),
  
  // Criar grupo de menu
  createMenuGroup: (label: string, items: ExtendedMenuItem[], icon?: string): ExtendedMenuItem => ({
    label,
    icon,
    items
  }),
  
  // Criar breadcrumb
  createBreadcrumb: (items: Array<{ label: string; href?: string; icon?: string }>) => items,
  
  // Criar ações de cabeçalho
  createHeaderActions: (...actions: React.ReactNode[]) => (
    <div className="flex items-center gap-2">
      {actions}
    </div>
  )
};

export default PrimeLayout;
