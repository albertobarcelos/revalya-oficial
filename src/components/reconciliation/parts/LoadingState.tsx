// =====================================================
// LOADING STATE COMPONENT
// Descrição: Estado de carregamento para a tabela de conciliação
// =====================================================

import React from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// AIDEV-NOTE: Componente de loading com skeleton consistente e animações
export const LoadingState: React.FC = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25
      }
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <motion.div 
          className="space-y-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
            <motion.div 
              key={index} 
              variants={itemVariants}
              className="flex items-center space-x-4 p-4 border rounded-lg bg-gradient-to-r from-gray-50/50 to-white/50"
            >
              {/* Checkbox skeleton */}
              <Skeleton className="h-4 w-4 rounded" />
              
              {/* Data skeleton */}
              <Skeleton className="h-4 w-20" />
              
              {/* Descrição skeleton */}
              <Skeleton className="h-4 w-32 sm:w-48" />
              
              {/* Valor skeleton */}
              <Skeleton className="h-4 w-24" />
              
              {/* Status skeleton */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              
              {/* Ações skeleton */}
              <div className="flex gap-2 ml-auto">
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-8 w-20 rounded" />
                <Skeleton className="h-8 w-20 rounded" />
              </div>
            </motion.div>
          ))}
          
          {/* Paginação skeleton */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Skeleton className="h-4 w-32" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
};