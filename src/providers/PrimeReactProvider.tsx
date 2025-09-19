/**
 * Provider centralizado para configuração do PrimeReact
 * Gerencia tema, localização e configurações globais
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { PrimeReactProvider as BasePrimeReactProvider, PrimeReactContext } from 'primereact/api';
import { addLocale, locale } from 'primereact/api';
import { 
  primeReactConfig, 
  lightTheme, 
  darkTheme, 
  customPrimeReactStyles,
  getCurrentTheme,
  isDarkMode
} from '@/config/primeReactTheme';

// Importações de CSS do PrimeReact
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

// Localização em português brasileiro
const ptBRLocale = {
  firstDayOfWeek: 0,
  dayNames: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  dayNamesMin: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
  monthNames: [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ],
  monthNamesShort: [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ],
  today: 'Hoje',
  clear: 'Limpar',
  dateFormat: 'dd/mm/yy',
  weekHeader: 'Sem',
  weak: 'Fraco',
  medium: 'Médio',
  strong: 'Forte',
  passwordPrompt: 'Digite uma senha',
  emptyFilterMessage: 'Nenhum resultado encontrado',
  emptyMessage: 'Nenhum dado disponível',
  aria: {
    trueLabel: 'Verdadeiro',
    falseLabel: 'Falso',
    nullLabel: 'Não selecionado',
    star: '1 estrela',
    stars: '{star} estrelas',
    selectAll: 'Todos os itens selecionados',
    unselectAll: 'Todos os itens desmarcados',
    close: 'Fechar',
    previous: 'Anterior',
    next: 'Próximo',
    navigation: 'Navegação',
    scrollTop: 'Rolar para o topo',
    moveTop: 'Mover para o topo',
    moveUp: 'Mover para cima',
    moveDown: 'Mover para baixo',
    moveBottom: 'Mover para baixo',
    moveToTarget: 'Mover para o destino',
    moveToSource: 'Mover para a origem',
    moveAllToTarget: 'Mover todos para o destino',
    moveAllToSource: 'Mover todos para a origem',
    pageLabel: 'Página {page}',
    firstPageLabel: 'Primeira página',
    lastPageLabel: 'Última página',
    nextPageLabel: 'Próxima página',
    previousPageLabel: 'Página anterior',
    rowsPerPageLabel: 'Linhas por página',
    jumpToPageDropdownLabel: 'Ir para a página',
    jumpToPageInputLabel: 'Ir para a página',
    selectRow: 'Linha selecionada',
    unselectRow: 'Linha desmarcada',
    expandRow: 'Linha expandida',
    collapseRow: 'Linha recolhida',
    showFilterMenu: 'Mostrar menu de filtro',
    hideFilterMenu: 'Ocultar menu de filtro',
    filterOperator: 'Operador de filtro',
    filterConstraint: 'Restrição de filtro',
    editRow: 'Editar linha',
    saveEdit: 'Salvar edição',
    cancelEdit: 'Cancelar edição',
    listView: 'Visualização em lista',
    gridView: 'Visualização em grade',
    slide: 'Slide',
    slideNumber: '{slideNumber}',
    zoomImage: 'Ampliar imagem',
    zoomIn: 'Ampliar',
    zoomOut: 'Reduzir',
    rotateRight: 'Girar à direita',
    rotateLeft: 'Girar à esquerda'
  }
};

interface PrimeReactThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  currentTheme: typeof lightTheme;
}

const PrimeReactThemeContext = createContext<PrimeReactThemeContextType | undefined>(undefined);

interface PrimeReactProviderProps {
  children: React.ReactNode;
}

export function PrimeReactProvider({ children }: PrimeReactProviderProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [currentTheme, setCurrentTheme] = useState(lightTheme);

  // Detectar tema inicial
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = (savedTheme as 'light' | 'dark') || systemTheme;
    
    setTheme(initialTheme);
    setCurrentTheme(initialTheme === 'dark' ? darkTheme : lightTheme);
    
    // Aplicar classe no documento
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Configurar localização do PrimeReact
  useEffect(() => {
    addLocale('pt-BR', ptBRLocale);
    locale('pt-BR');
  }, []);

  // Injetar estilos customizados
  useEffect(() => {
    const styleId = 'prime-react-custom-styles';
    let styleElement = document.getElementById(styleId);
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = customPrimeReactStyles;
    
    return () => {
      const element = document.getElementById(styleId);
      if (element) {
        element.remove();
      }
    };
  }, []);

  // Escutar mudanças no tema do sistema
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        const newTheme = e.matches ? 'dark' : 'light';
        setTheme(newTheme);
        setCurrentTheme(newTheme === 'dark' ? darkTheme : lightTheme);
        
        if (newTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    setCurrentTheme(newTheme === 'dark' ? darkTheme : lightTheme);
    localStorage.setItem('theme', newTheme);
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const contextValue: PrimeReactThemeContextType = {
    theme,
    toggleTheme,
    currentTheme
  };

  return (
    <PrimeReactThemeContext.Provider value={contextValue}>
      <BasePrimeReactProvider value={primeReactConfig}>
        {children}
      </BasePrimeReactProvider>
    </PrimeReactThemeContext.Provider>
  );
}

// Hook para usar o contexto do tema
export function usePrimeReactTheme() {
  const context = useContext(PrimeReactThemeContext);
  if (context === undefined) {
    throw new Error('usePrimeReactTheme must be used within a PrimeReactProvider');
  }
  return context;
}

// Hook para acessar configurações do PrimeReact
export function usePrimeReact() {
  const context = useContext(PrimeReactContext);
  if (context === undefined) {
    throw new Error('usePrimeReact must be used within a PrimeReactProvider');
  }
  return context;
}

// Utilitários para componentes
export const primeReactUtils = {
  /**
   * Aplica classes condicionais baseadas no tema
   */
  themeClass: (lightClass: string, darkClass: string) => {
    return isDarkMode() ? darkClass : lightClass;
  },
  
  /**
   * Retorna a configuração de severidade para componentes PrimeReact
   */
  getSeverity: (type: 'success' | 'info' | 'warn' | 'error' | 'secondary' | 'contrast') => {
    const severityMap = {
      success: 'success',
      info: 'info', 
      warn: 'warning',
      error: 'danger',
      secondary: 'secondary',
      contrast: 'contrast'
    };
    return severityMap[type] || 'info';
  },
  
  /**
   * Formata valores monetários para exibição
   */
  formatCurrency: (value: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(value);
  },
  
  /**
   * Formata datas para exibição
   */
  formatDate: (date: Date | string, format: 'short' | 'medium' | 'long' = 'medium') => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const options: Intl.DateTimeFormatOptions = {
      short: { day: '2-digit', month: '2-digit', year: 'numeric' },
      medium: { day: '2-digit', month: 'short', year: 'numeric' },
      long: { day: '2-digit', month: 'long', year: 'numeric' }
    };
    
    return new Intl.DateTimeFormat('pt-BR', options[format]).format(dateObj);
  },
  
  /**
   * Gera classes CSS responsivas para PrimeReact
   */
  responsiveClass: (base: string, sm?: string, md?: string, lg?: string, xl?: string) => {
    let classes = base;
    if (sm) classes += ` sm:${sm}`;
    if (md) classes += ` md:${md}`;
    if (lg) classes += ` lg:${lg}`;
    if (xl) classes += ` xl:${xl}`;
    return classes;
  }
};
