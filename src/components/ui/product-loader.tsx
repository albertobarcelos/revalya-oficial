/**
 * Loader para modal de produto
 * 
 * AIDEV-NOTE: Componente de loading customizado com animação
 */

import { cn } from '@/lib/utils';

interface ProductLoaderProps {
  className?: string;
}

export function ProductLoader({ className }: ProductLoaderProps) {
  return (
    <div className={cn("loader", className)} />
  );
}

