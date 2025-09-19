import { useContext } from 'react';
import { SupabaseContext } from '../contexts/SupabaseProvider';

/**
 * Hook para acessar o contexto do Supabase
 * Separado do provider para evitar problemas com Fast Refresh
 */
export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  
  if (!context) {
    throw new Error('useSupabase deve ser usado dentro de um SupabaseProvider');
  }
  
  return context;
};