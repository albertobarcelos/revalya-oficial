/**
 * Provider centralizado para configuração do PrimeReact
 * Gerencia tema, localização e configurações globais
 * 
 * AIDEV-NOTE: Integrado com ThemeProvider para fonte única de verdade
 * O tema é gerenciado pelo ThemeProvider, este provider apenas sincroniza
 */

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
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
import { useTheme } from './ThemeProvider';

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
  isDarkMode: boolean;
}

const PrimeReactThemeContext = createContext<PrimeReactThemeContextType | undefined>(undefined);

interface PrimeReactProviderProps {
  children: React.ReactNode;
}

export function PrimeReactProvider({ children }: PrimeReactProviderProps) {
  // AIDEV-NOTE: Usa ThemeProvider como fonte única de verdade
  // Sincroniza o tema do PrimeReact com o ThemeProvider
  const { theme: themeFromProvider, setTheme: setThemeFromProvider } = useTheme();
  
  // Converte tema do ThemeProvider ('light' | 'dark' | 'system') para tema efetivo
  const effectiveTheme = useMemo<'light' | 'dark'>(() => {
    if (themeFromProvider === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return themeFromProvider;
  }, [themeFromProvider]);

  // Tema atual do PrimeReact (light ou dark)
  const [currentTheme, setCurrentTheme] = useState(lightTheme);

  // Sincronizar currentTheme com effectiveTheme
  useEffect(() => {
    setCurrentTheme(effectiveTheme === 'dark' ? darkTheme : lightTheme);
  }, [effectiveTheme]);

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

  // Toggle de tema sincronizado com ThemeProvider
  const toggleTheme = () => {
    // Se está em modo system, alterna para dark
    if (themeFromProvider === 'system') {
      setThemeFromProvider('dark');
      return;
    }
    
    // Alterna entre light e dark
    const newTheme = effectiveTheme === 'light' ? 'dark' : 'light';
    setThemeFromProvider(newTheme);
  };

  // isDarkMode calculado
  const isDark = effectiveTheme === 'dark';

  const contextValue: PrimeReactThemeContextType = {
    theme: effectiveTheme,
    toggleTheme,
    currentTheme,
    isDarkMode: isDark
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
