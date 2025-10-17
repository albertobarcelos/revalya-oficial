import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';

// AIDEV-NOTE: Interface para props do botão de toggle da sidebar
interface SidebarToggleButtonProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

// AIDEV-NOTE: Componente extraído do botão de toggle da sidebar do ReconciliationModal
// Responsável por controlar a expansão/colapso da sidebar com animações elegantes
export default function SidebarToggleButton({
  isCollapsed,
  onToggle
}: SidebarToggleButtonProps) {
  return (
    <motion.div 
      className="absolute z-[999999]"
      style={{
        top: '50%',
        transform: 'translateY(-50%)',
        right: isCollapsed ? '20px' : '380px',
      }}
      animate={{
        right: isCollapsed ? 20 : 380,
      }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30,
        duration: 0.4
      }}
    >
      {/* Container com glassmorphism */}
      <motion.div
        className="relative group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Background com glassmorphism - mais sutil */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-slate-50/90 to-white/80 backdrop-blur-lg rounded-xl border border-slate-200/60 shadow-lg"></div>
        
        {/* Glow effect sutil */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 via-slate-300/5 to-blue-400/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
        
        {/* Botão principal */}
        <motion.button
          onClick={onToggle}
          className="relative w-10 h-8 flex items-center justify-center rounded-xl transition-all duration-300 group-hover:bg-slate-100/50"
          animate={{ 
            backgroundColor: isCollapsed ? "rgba(59, 130, 246, 0.08)" : "rgba(255, 255, 255, 0.1)"
          }}
          transition={{ duration: 0.3 }}
        >
          {/* Ícone com animação suave */}
          <motion.div
            animate={{ 
              rotate: isCollapsed ? 180 : 0,
              color: isCollapsed ? "rgb(59, 130, 246)" : "rgb(100, 116, 139)"
            }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 25 
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </motion.div>
        </motion.button>
        
        {/* Tooltip discreto */}
        <motion.div
          className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 bg-slate-700/90 text-white text-xs rounded-md backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-[999999]"
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 0, y: -3 }}
          whileHover={{ opacity: 1, y: 0 }}
        >
          {isCollapsed ? 'Expandir' : 'Recolher'}
          <div className="absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-slate-700/90 rotate-45"></div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}