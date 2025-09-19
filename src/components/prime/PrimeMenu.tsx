/**
 * Componente Menu padronizado usando PrimeReact
 * Sistema de navegação e menus contextuais consistente
 */

import React from 'react';
import { Menu, MenuProps } from 'primereact/menu';
import { Menubar, MenubarProps } from 'primereact/menubar';
import { TieredMenu } from 'primereact/tieredmenu';
import { ContextMenu } from 'primereact/contextmenu';
import { MegaMenu } from 'primereact/megamenu';
import { TabMenu } from 'primereact/tabmenu';
import { PanelMenu } from 'primereact/panelmenu';
import { Breadcrumb } from 'primereact/breadcrumb';
import { Steps } from 'primereact/steps';
import { MenuItem } from 'primereact/menuitem';
import { Badge } from 'primereact/badge';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import { cn } from '@/lib/utils';
import { usePrimeReactTheme } from '@/providers/PrimeReactProvider';

// Tipos estendidos para menu items
export interface ExtendedMenuItem extends MenuItem {
  badge?: {
    value: string | number;
    severity?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'danger';
  };
  avatar?: {
    image?: string;
    icon?: string;
    label?: string;
    shape?: 'square' | 'circle';
    size?: 'normal' | 'large' | 'xlarge';
  };
  description?: string;
  shortcut?: string;
  divider?: boolean;
  group?: string;
  visible?: boolean;
  permissions?: string[];
}

// Menu lateral (Sidebar)
interface SidebarMenuProps {
  items: ExtendedMenuItem[];
  collapsed?: boolean;
  onToggle?: () => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  width?: string;
  position?: 'left' | 'right';
}

const SidebarMenu: React.FC<SidebarMenuProps> = ({
  items,
  collapsed = false,
  onToggle,
  header,
  footer,
  className,
  width = '280px',
  position = 'left'
}) => {
  const { theme } = usePrimeReactTheme();

  // Processa items para PanelMenu
  const processMenuItems = (menuItems: ExtendedMenuItem[]): MenuItem[] => {
    return menuItems
      .filter(item => item.visible !== false)
      .map(item => {
        const processedItem: MenuItem = {
          ...item,
          template: item.template || ((menuItem, options) => (
            <div className={cn(
              'flex items-center gap-3 p-3 cursor-pointer transition-colors',
              'hover:bg-gray-100 dark:hover:bg-gray-700',
              {
                'justify-center': collapsed,
                'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400': menuItem.className?.includes('active')
              }
            )}>
              {/* Avatar */}
              {item.avatar && (
                <Avatar
                  image={item.avatar.image}
                  icon={item.avatar.icon}
                  label={item.avatar.label}
                  shape={item.avatar.shape}
                  size={item.avatar.size}
                  className="flex-shrink-0"
                />
              )}
              
              {/* Ícone */}
              {!item.avatar && menuItem.icon && (
                <i className={cn('text-lg flex-shrink-0', menuItem.icon)} />
              )}
              
              {/* Conteúdo */}
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">
                      {menuItem.label}
                    </span>
                    
                    {/* Badge */}
                    {item.badge && (
                      <Badge
                        value={item.badge.value}
                        severity={item.badge.severity}
                        size="small"
                      />
                    )}
                    
                    {/* Shortcut */}
                    {item.shortcut && (
                      <span className="text-xs text-gray-500 ml-2">
                        {item.shortcut}
                      </span>
                    )}
                  </div>
                  
                  {/* Descrição */}
                  {item.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                      {item.description}
                    </p>
                  )}
                </div>
              )}
              
              {/* Seta para submenu */}
              {menuItem.items && !collapsed && (
                <i className="pi pi-chevron-right text-sm text-gray-400" />
              )}
            </div>
          ))
        };

        // Processa subitems recursivamente
        if (item.items) {
          processedItem.items = processMenuItems(item.items);
        }

        return processedItem;
      });
  };

  const processedItems = processMenuItems(items);

  return (
    <div
      className={cn(
        'h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300',
        className
      )}
      style={{ width: collapsed ? '64px' : width }}
    >
      {/* Header */}
      {header && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          {header}
        </div>
      )}
      
      {/* Toggle Button */}
      {onToggle && (
        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
          <Button
            icon={collapsed ? 'pi pi-angle-right' : 'pi pi-angle-left'}
            text
            className="w-full"
            onClick={onToggle}
          />
        </div>
      )}
      
      {/* Menu */}
      <div className="flex-1 overflow-auto">
        <PanelMenu
          model={processedItems}
          className="border-0"
        />
      </div>
      
      {/* Footer */}
      {footer && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {footer}
        </div>
      )}
    </div>
  );
};

// Menu de contexto
interface ContextMenuWrapperProps {
  items: ExtendedMenuItem[];
  children: React.ReactNode;
  className?: string;
}

const ContextMenuWrapper: React.FC<ContextMenuWrapperProps> = ({
  items,
  children,
  className
}) => {
  const contextMenuRef = React.useRef<ContextMenu>(null);

  const processedItems = items.map(item => ({
    ...item,
    template: item.template || ((menuItem, options) => (
      <div className="flex items-center gap-3 p-2">
        {item.avatar && (
          <Avatar
            image={item.avatar.image}
            icon={item.avatar.icon}
            label={item.avatar.label}
            shape={item.avatar.shape}
            size="small"
          />
        )}
        
        {!item.avatar && menuItem.icon && (
          <i className={cn('text-sm', menuItem.icon)} />
        )}
        
        <div className="flex-1">
          <span className="text-sm font-medium">
            {menuItem.label}
          </span>
          {item.description && (
            <p className="text-xs text-gray-500 mt-0.5">
              {item.description}
            </p>
          )}
        </div>
        
        {item.badge && (
          <Badge
            value={item.badge.value}
            severity={item.badge.severity}
            size="small"
          />
        )}
        
        {item.shortcut && (
          <span className="text-xs text-gray-400">
            {item.shortcut}
          </span>
        )}
      </div>
    ))
  }));

  return (
    <div
      className={className}
      onContextMenu={(e) => contextMenuRef.current?.show(e)}
    >
      {children}
      <ContextMenu
        ref={contextMenuRef}
        model={processedItems}
        className="shadow-lg border"
      />
    </div>
  );
};

// Menu de navegação superior
interface TopNavMenuProps extends Omit<MenubarProps, 'model'> {
  items: ExtendedMenuItem[];
  logo?: React.ReactNode;
  actions?: React.ReactNode;
  user?: {
    name: string;
    avatar?: string;
    role?: string;
    menu?: ExtendedMenuItem[];
  };
}

const TopNavMenu: React.FC<TopNavMenuProps> = ({
  items,
  logo,
  actions,
  user,
  className,
  ...props
}) => {
  const userMenuRef = React.useRef<Menu>(null);

  const processedItems = items.map(item => ({
    ...item,
    template: item.template || ((menuItem, options) => (
      <div className="flex items-center gap-2 px-3 py-2">
        {menuItem.icon && (
          <i className={cn('text-sm', menuItem.icon)} />
        )}
        <span className="font-medium">
          {menuItem.label}
        </span>
        {item.badge && (
          <Badge
            value={item.badge.value}
            severity={item.badge.severity}
            size="small"
          />
        )}
      </div>
    ))
  }));

  const startTemplate = (
    <div className="flex items-center gap-4">
      {logo}
    </div>
  );

  const endTemplate = (
    <div className="flex items-center gap-3">
      {actions}
      
      {user && (
        <div className="flex items-center gap-2">
          <Button
            className="p-0"
            text
            onClick={(e) => userMenuRef.current?.toggle(e)}
          >
            <div className="flex items-center gap-2 px-3 py-2">
              <Avatar
                image={user.avatar}
                icon={!user.avatar ? 'pi pi-user' : undefined}
                label={!user.avatar && !user.avatar ? user.name.charAt(0) : undefined}
                shape="circle"
                size="normal"
              />
              <div className="text-left hidden md:block">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {user.name}
                </div>
                {user.role && (
                  <div className="text-xs text-gray-500">
                    {user.role}
                  </div>
                )}
              </div>
              <i className="pi pi-chevron-down text-xs text-gray-400" />
            </div>
          </Button>
          
          {user.menu && (
            <Menu
              ref={userMenuRef}
              model={user.menu}
              popup
              className="mt-2"
            />
          )}
        </div>
      )}
    </div>
  );

  return (
    <Menubar
      model={processedItems}
      start={startTemplate}
      end={endTemplate}
      className={cn(
        'border-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800',
        className
      )}
      {...props}
    />
  );
};

// Menu de abas
interface TabMenuWrapperProps {
  items: ExtendedMenuItem[];
  activeIndex?: number;
  onTabChange?: (index: number) => void;
  className?: string;
}

const TabMenuWrapper: React.FC<TabMenuWrapperProps> = ({
  items,
  activeIndex = 0,
  onTabChange,
  className
}) => {
  const processedItems = items.map((item, index) => ({
    ...item,
    template: (menuItem: MenuItem, options: any) => (
      <div className="flex items-center gap-2 px-4 py-3">
        {menuItem.icon && (
          <i className={cn('text-sm', menuItem.icon)} />
        )}
        <span className="font-medium">
          {menuItem.label}
        </span>
        {item.badge && (
          <Badge
            value={item.badge.value}
            severity={item.badge.severity}
            size="small"
          />
        )}
      </div>
    )
  }));

  return (
    <TabMenu
      model={processedItems}
      activeIndex={activeIndex}
      onTabChange={(e) => onTabChange?.(e.index)}
      className={cn('border-b border-gray-200 dark:border-gray-700', className)}
    />
  );
};

// Breadcrumb personalizado
interface BreadcrumbWrapperProps {
  items: ExtendedMenuItem[];
  home?: ExtendedMenuItem;
  className?: string;
}

const BreadcrumbWrapper: React.FC<BreadcrumbWrapperProps> = ({
  items,
  home,
  className
}) => {
  const processedItems = items.map(item => ({
    ...item,
    template: (menuItem: MenuItem, options: any) => (
      <span className="flex items-center gap-1">
        {menuItem.icon && (
          <i className={cn('text-sm', menuItem.icon)} />
        )}
        {menuItem.label}
      </span>
    )
  }));

  const homeItem = home ? {
    ...home,
    template: () => (
      <span className="flex items-center gap-1">
        <i className={cn('text-sm', home.icon || 'pi pi-home')} />
        {home.label}
      </span>
    )
  } : {
    icon: 'pi pi-home',
    command: () => window.location.href = '/'
  };

  return (
    <Breadcrumb
      model={processedItems}
      home={homeItem}
      className={cn('bg-transparent border-0 p-0', className)}
    />
  );
};

// Utilitários para menus
export const menuUtils = {
  /**
   * Cria items de menu comuns
   */
  createItems: {
    dashboard: (command?: () => void): ExtendedMenuItem => ({
      label: 'Dashboard',
      icon: 'pi pi-chart-line',
      command
    }),
    profile: (command?: () => void): ExtendedMenuItem => ({
      label: 'Perfil',
      icon: 'pi pi-user',
      command
    }),
    settings: (command?: () => void): ExtendedMenuItem => ({
      label: 'Configurações',
      icon: 'pi pi-cog',
      command
    }),
    logout: (command?: () => void): ExtendedMenuItem => ({
      label: 'Sair',
      icon: 'pi pi-sign-out',
      command,
      className: 'text-red-600'
    }),
    divider: (): ExtendedMenuItem => ({
      separator: true
    })
  },

  /**
   * Filtra items por permissões
   */
  filterByPermissions: (items: ExtendedMenuItem[], userPermissions: string[]): ExtendedMenuItem[] => {
    return items.filter(item => {
      if (!item.permissions || item.permissions.length === 0) return true;
      return item.permissions.some(permission => userPermissions.includes(permission));
    }).map(item => ({
      ...item,
      items: item.items ? menuUtils.filterByPermissions(item.items, userPermissions) : undefined
    }));
  },

  /**
   * Agrupa items por categoria
   */
  groupItems: (items: ExtendedMenuItem[]): { [key: string]: ExtendedMenuItem[] } => {
    return items.reduce((groups, item) => {
      const group = item.group || 'default';
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
      return groups;
    }, {} as { [key: string]: ExtendedMenuItem[] });
  },

  /**
   * Encontra item ativo baseado na URL
   */
  findActiveItem: (items: ExtendedMenuItem[], currentPath: string): ExtendedMenuItem | null => {
    for (const item of items) {
      if (item.url === currentPath) return item;
      if (item.items) {
        const found = menuUtils.findActiveItem(item.items, currentPath);
        if (found) return found;
      }
    }
    return null;
  }
};

export {
  SidebarMenu,
  ContextMenuWrapper,
  TopNavMenu,
  TabMenuWrapper,
  BreadcrumbWrapper
};

export type {
  ExtendedMenuItem,
  SidebarMenuProps,
  ContextMenuWrapperProps,
  TopNavMenuProps,
  TabMenuWrapperProps,
  BreadcrumbWrapperProps
};
