/**
 * Componente DataTable padronizado usando PrimeReact
 * Substitui as tabelas do Shadcn UI com funcionalidades avançadas
 */

import React, { useState, useRef } from 'react';
import { DataTable, DataTableProps } from 'primereact/datatable';
import { Column, ColumnProps } from 'primereact/column';
import { Toolbar } from 'primereact/toolbar';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { Calendar } from 'primereact/calendar';
import { Tag } from 'primereact/tag';
import { Badge } from 'primereact/badge';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { Menu } from 'primereact/menu';
import { cn } from '@/lib/utils';
import { usePrimeReactTheme } from '@/providers/PrimeReactProvider';

// Tipos para colunas
export interface TableColumn extends Omit<ColumnProps, 'body'> {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'currency' | 'date' | 'boolean' | 'status' | 'actions' | 'custom';
  sortable?: boolean;
  filterable?: boolean;
  exportable?: boolean;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  align?: 'left' | 'center' | 'right';
  format?: (value: any, row: any) => React.ReactNode;
  filterType?: 'text' | 'dropdown' | 'multiselect' | 'date' | 'daterange';
  filterOptions?: { label: string; value: any }[];
  actions?: TableAction[];
}

// Tipos para ações
export interface TableAction {
  label: string;
  icon: string;
  onClick: (row: any) => void;
  visible?: (row: any) => boolean;
  disabled?: (row: any) => boolean;
  severity?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'danger';
  tooltip?: string;
}

// Props do componente
interface PrimeDataTableProps extends Omit<DataTableProps, 'children'> {
  data: any[];
  columns: TableColumn[];
  loading?: boolean;
  title?: string;
  subtitle?: string;
  searchable?: boolean;
  exportable?: boolean;
  selectable?: boolean;
  multiSelect?: boolean;
  paginated?: boolean;
  rowsPerPage?: number;
  rowsPerPageOptions?: number[];
  globalActions?: TableAction[];
  onSelectionChange?: (selection: any[]) => void;
  onRowSelect?: (row: any) => void;
  onRowDoubleClick?: (row: any) => void;
  emptyMessage?: string;
  className?: string;
  tableClassName?: string;
  headerClassName?: string;
  rowClassName?: string | ((row: any) => string);
  cellClassName?: string | ((value: any, row: any, column: TableColumn) => string);
  showGridlines?: boolean;
  stripedRows?: boolean;
  responsiveLayout?: 'stack' | 'scroll';
  breakpoint?: string;
  resizableColumns?: boolean;
  reorderableColumns?: boolean;
  scrollable?: boolean;
  scrollHeight?: string;
  virtualScrolling?: boolean;
  lazy?: boolean;
  totalRecords?: number;
  onLazyLoad?: (event: any) => void;
}

const PrimeDataTable = React.forwardRef<DataTable, PrimeDataTableProps>((
  {
    data,
    columns,
    loading = false,
    title,
    subtitle,
    searchable = true,
    exportable = false,
    selectable = false,
    multiSelect = false,
    paginated = true,
    rowsPerPage = 10,
    rowsPerPageOptions = [5, 10, 25, 50],
    globalActions = [],
    onSelectionChange,
    onRowSelect,
    onRowDoubleClick,
    emptyMessage = 'Nenhum registro encontrado',
    className,
    tableClassName,
    headerClassName,
    rowClassName,
    cellClassName,
    showGridlines = true,
    stripedRows = true,
    responsiveLayout = 'scroll',
    breakpoint = '960px',
    resizableColumns = false,
    reorderableColumns = false,
    scrollable = false,
    scrollHeight,
    virtualScrolling = false,
    lazy = false,
    totalRecords,
    onLazyLoad,
    ...props
  },
  ref
) => {
  const { theme } = usePrimeReactTheme();
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [globalFilter, setGlobalFilter] = useState<string>('');
  const [filters, setFilters] = useState<any>({});
  const toast = useRef<Toast>(null);
  const dt = useRef<DataTable>(null);

  // Manipular seleção
  const handleSelectionChange = (e: any) => {
    setSelectedRows(e.value);
    onSelectionChange?.(e.value);
  };

  // Exportar dados
  const exportCSV = () => {
    dt.current?.exportCSV();
  };

  const exportPDF = () => {
    // Implementar exportação PDF
    toast.current?.show({
      severity: 'info',
      summary: 'Exportação',
      detail: 'Funcionalidade de PDF em desenvolvimento'
    });
  };

  const exportExcel = () => {
    // Implementar exportação Excel
    toast.current?.show({
      severity: 'info',
      summary: 'Exportação',
      detail: 'Funcionalidade de Excel em desenvolvimento'
    });
  };

  // Renderizar célula baseada no tipo
  const renderCell = (column: TableColumn) => {
    return (rowData: any) => {
      const value = rowData[column.key];
      
      if (column.format) {
        return column.format(value, rowData);
      }

      switch (column.type) {
        case 'currency':
          return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(value || 0);
        
        case 'date':
          return value ? new Date(value).toLocaleDateString('pt-BR') : '-';
        
        case 'boolean':
          return (
            <Tag
              value={value ? 'Sim' : 'Não'}
              severity={value ? 'success' : 'danger'}
              icon={value ? 'pi pi-check' : 'pi pi-times'}
            />
          );
        
        case 'status':
          const statusConfig = getStatusConfig(value);
          return (
            <Tag
              value={statusConfig.label}
              severity={statusConfig.severity}
              icon={statusConfig.icon}
            />
          );
        
        case 'actions':
          return (
            <div className="flex gap-1">
              {column.actions?.map((action, index) => {
                if (action.visible && !action.visible(rowData)) return null;
                
                return (
                  <Button
                    key={index}
                    icon={action.icon}
                    tooltip={action.tooltip || action.label}
                    severity={action.severity || 'secondary'}
                    size="small"
                    text
                    onClick={() => action.onClick(rowData)}
                    disabled={action.disabled?.(rowData)}
                  />
                );
              })}
            </div>
          );
        
        case 'number':
          return new Intl.NumberFormat('pt-BR').format(value || 0);
        
        default:
          return value || '-';
      }
    };
  };

  // Configuração de status
  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; severity: any; icon: string }> = {
      active: { label: 'Ativo', severity: 'success', icon: 'pi pi-check-circle' },
      inactive: { label: 'Inativo', severity: 'danger', icon: 'pi pi-times-circle' },
      pending: { label: 'Pendente', severity: 'warning', icon: 'pi pi-clock' },
      draft: { label: 'Rascunho', severity: 'info', icon: 'pi pi-file-edit' },
      completed: { label: 'Concluído', severity: 'success', icon: 'pi pi-check' },
      cancelled: { label: 'Cancelado', severity: 'danger', icon: 'pi pi-ban' }
    };
    
    return configs[status] || { label: status, severity: 'info', icon: 'pi pi-info-circle' };
  };

  // Header da tabela
  const renderHeader = () => {
    return (
      <div className="flex flex-col gap-4">
        {/* Título e subtítulo */}
        {(title || subtitle) && (
          <div>
            {title && <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>}
            {subtitle && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>}
          </div>
        )}
        
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          {/* Busca global */}
          {searchable && (
            <div className="flex-1 max-w-md">
              <span className="p-input-icon-left w-full">
                <i className="pi pi-search" />
                <InputText
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full"
                />
              </span>
            </div>
          )}
          
          {/* Ações globais */}
          <div className="flex gap-2">
            {/* Ações customizadas */}
            {globalActions.map((action, index) => (
              <Button
                key={index}
                label={action.label}
                icon={action.icon}
                severity={action.severity}
                onClick={() => action.onClick(selectedRows)}
                disabled={selectable && selectedRows.length === 0}
                tooltip={action.tooltip}
              />
            ))}
            
            {/* Exportação */}
            {exportable && (
              <>
                <Button
                  label="CSV"
                  icon="pi pi-file"
                  severity="help"
                  onClick={exportCSV}
                  tooltip="Exportar CSV"
                />
                <Button
                  label="PDF"
                  icon="pi pi-file-pdf"
                  severity="danger"
                  onClick={exportPDF}
                  tooltip="Exportar PDF"
                />
                <Button
                  label="Excel"
                  icon="pi pi-file-excel"
                  severity="success"
                  onClick={exportExcel}
                  tooltip="Exportar Excel"
                />
              </>
            )}
          </div>
        </div>
        
        {/* Informações de seleção */}
        {selectable && selectedRows.length > 0 && (
          <div className="bg-primary/10 dark:bg-primary/10 p-3 rounded-lg">
          <span className="text-primary dark:text-primary">
              {selectedRows.length} {selectedRows.length === 1 ? 'item selecionado' : 'itens selecionados'}
            </span>
          </div>
        )}
      </div>
    );
  };

  // Classes da tabela
  const tableClasses = cn(
    'p-datatable-custom',
    {
      'p-datatable-gridlines': showGridlines,
      'p-datatable-striped': stripedRows,
      'p-datatable-sm': false // Adicionar prop size se necessário
    },
    tableClassName
  );

  return (
    <div className={cn('space-y-4', className)}>
      <Toast ref={toast} />
      <ConfirmDialog />
      
      <DataTable
        ref={ref || dt}
        value={data}
        selection={selectedRows}
        onSelectionChange={handleSelectionChange}
        selectionMode={selectable ? (multiSelect ? 'multiple' : 'single') : undefined}
        onRowSelect={onRowSelect ? (e) => onRowSelect(e.data) : undefined}
        onRowDoubleClick={onRowDoubleClick ? (e) => onRowDoubleClick(e.data) : undefined}
        dataKey="id"
        paginator={paginated}
        rows={rowsPerPage}
        rowsPerPageOptions={rowsPerPageOptions}
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} registros"
        globalFilter={globalFilter}
        filters={filters}
        onFilter={(e) => setFilters(e.filters)}
        emptyMessage={emptyMessage}
        loading={loading}
        loadingIcon={<ProgressSpinner style={{ width: '2rem', height: '2rem' }} />}
        header={renderHeader()}
        className={tableClasses}
        responsiveLayout={responsiveLayout}
        breakpoint={breakpoint}
        resizableColumns={resizableColumns}
        reorderableColumns={reorderableColumns}
        scrollable={scrollable}
        scrollHeight={scrollHeight}
        virtualScrolling={virtualScrolling}
        lazy={lazy}
        totalRecords={totalRecords}
        onLazyLoad={onLazyLoad}
        rowClassName={typeof rowClassName === 'function' ? rowClassName : () => rowClassName || ''}
        {...props}
      >
        {/* Coluna de seleção */}
        {selectable && (
          <Column
            selectionMode={multiSelect ? 'multiple' : undefined}
            headerStyle={{ width: '3rem' }}
            exportable={false}
          />
        )}
        
        {/* Colunas dinâmicas */}
        {columns.map((column) => (
          <Column
            key={column.key}
            field={column.key}
            header={column.label}
            body={renderCell(column)}
            sortable={column.sortable}
            filter={column.filterable}
            filterField={column.key}
            filterPlaceholder={`Filtrar por ${column.label.toLowerCase()}`}
            style={{
              width: column.width,
              minWidth: column.minWidth,
              maxWidth: column.maxWidth,
              textAlign: column.align
            }}
            headerClassName={headerClassName}
            bodyClassName={typeof cellClassName === 'function' 
              ? (options) => cellClassName(options.rowData[column.key], options.rowData, column)
              : cellClassName
            }
            exportable={column.exportable !== false}
            {...column}
          />
        ))}
      </DataTable>
    </div>
  );
});

PrimeDataTable.displayName = 'PrimeDataTable';

// Utilitários para DataTable
export const dataTableUtils = {
  /**
   * Cria colunas básicas
   */
  createColumns: (fields: Array<{ key: string; label: string; type?: TableColumn['type'] }>): TableColumn[] => {
    return fields.map(field => ({
      key: field.key,
      label: field.label,
      type: field.type || 'text',
      sortable: true,
      filterable: true
    }));
  },

  /**
   * Cria coluna de ações
   */
  createActionsColumn: (actions: TableAction[]): TableColumn => {
    return {
      key: 'actions',
      label: 'Ações',
      type: 'actions',
      actions,
      sortable: false,
      filterable: false,
      exportable: false,
      width: `${actions.length * 40 + 20}px`,
      align: 'center'
    };
  },

  /**
   * Ações comuns
   */
  commonActions: {
    view: (onClick: (row: any) => void): TableAction => ({
      label: 'Visualizar',
      icon: 'pi pi-eye',
      onClick,
      severity: 'info',
      tooltip: 'Visualizar detalhes'
    }),
    edit: (onClick: (row: any) => void): TableAction => ({
      label: 'Editar',
      icon: 'pi pi-pencil',
      onClick,
      severity: 'warning',
      tooltip: 'Editar registro'
    }),
    delete: (onClick: (row: any) => void): TableAction => ({
      label: 'Excluir',
      icon: 'pi pi-trash',
      onClick,
      severity: 'danger',
      tooltip: 'Excluir registro'
    }),
    duplicate: (onClick: (row: any) => void): TableAction => ({
      label: 'Duplicar',
      icon: 'pi pi-copy',
      onClick,
      severity: 'secondary',
      tooltip: 'Duplicar registro'
    })
  },

  /**
   * Formatadores comuns
   */
  formatters: {
    currency: (value: number) => new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0),
    
    date: (value: string | Date) => value ? new Date(value).toLocaleDateString('pt-BR') : '-',
    
    datetime: (value: string | Date) => value ? new Date(value).toLocaleString('pt-BR') : '-',
    
    percentage: (value: number) => `${(value || 0).toFixed(2)}%`,
    
    phone: (value: string) => value?.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') || '-',
    
    cpf: (value: string) => value?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || '-',
    
    cnpj: (value: string) => value?.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') || '-'
  }
};

export { PrimeDataTable };
export type { PrimeDataTableProps, TableColumn, TableAction };
