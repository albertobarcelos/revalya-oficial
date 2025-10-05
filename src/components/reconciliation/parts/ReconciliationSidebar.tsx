import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import ReconciliationFilters from "../ReconciliationFilters";
import type { ReconciliationFilters as ReconciliationFiltersType } from "@/types/reconciliation";

// AIDEV-NOTE: Interface para props do ReconciliationSidebar
interface ReconciliationSidebarProps {
  isCollapsed: boolean;
  filters: ReconciliationFiltersType;
  onFiltersChange: (filters: ReconciliationFiltersType) => void;
  isLoading: boolean;
}

// AIDEV-NOTE: Componente extraído do painel lateral do ReconciliationModal
// Responsável por renderizar a sidebar com filtros e estado colapsado
export function ReconciliationSidebar({
  isCollapsed,
  filters,
  onFiltersChange,
  isLoading
}: ReconciliationSidebarProps) {
  return (
    <motion.div 
      className="flex-shrink-0 overflow-y-auto relative order-2 lg:order-2"
      style={{ 
        width: isCollapsed ? '60px' : '380px',
        minWidth: isCollapsed ? '60px' : '380px',
        maxWidth: isCollapsed ? '60px' : '380px',
        zIndex: 1
      }}
      animate={{ 
        width: isCollapsed ? 60 : 380 
      }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30 
      }}
    >
      {/* Background premium com gradiente sutil */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50/95 via-white/98 to-slate-50/95 backdrop-blur-md"></div>
      
      {/* Borda lateral com efeito glass */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-blue-200/30 to-transparent shadow-sm"></div>
      
      {/* Sombra interna sutil */}
      <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-slate-900/[0.02] to-transparent pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        className="relative p-6 space-y-6"
      >
        {/* Container dos filtros com design premium */}
        <motion.div 
          className="relative"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {/* Container principal com glass effect */}
          <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-500 overflow-hidden">
            {/* Highlight sutil no topo */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-300/40 to-transparent"></div>
            
            {/* Conteúdo dos filtros */}
            <div className="p-5">
              {!isCollapsed && (
                <ReconciliationFilters
                  filters={filters}
                  onFiltersChange={onFiltersChange}
                  loading={isLoading}
                />
              )}
              
              {/* Estado colapsado com ícone elegante */}
              {isCollapsed && (
                <div className="flex flex-col items-center space-y-4 py-6">
                  <motion.div
                    className="w-10 h-10 bg-gradient-to-br from-blue-500/90 to-purple-600/90 rounded-xl flex items-center justify-center shadow-lg"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <FileText className="h-5 w-5 text-white" />
                  </motion.div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}