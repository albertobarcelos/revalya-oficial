import { ReactNode } from 'react';
import { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

interface SkeletonProviderProps {
  children: ReactNode;
}

export function SkeletonProvider({ children }: SkeletonProviderProps) {
  return (
    <SkeletonTheme
      baseColor="#1e293b" // slate-800
      highlightColor="#334155" // slate-700
      borderRadius="0.5rem"
      duration={1.2}
    >
      {children}
    </SkeletonTheme>
  );
} 
