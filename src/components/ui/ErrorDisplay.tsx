import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertCircle, 
  Copy, 
  AlertTriangle, 
  Shield, 
  Wifi,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
  Edit,
  Eye,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DetailedError, ErrorCategory, ERROR_CONFIG } from '@/types/bulkInsertTypes';

// AIDEV-NOTE: Componente avançado para exibição de erros categorizados
// Design moderno com ações contextuais e feedback visual claro

interface ErrorDisplayProps {
  errors: DetailedError[];
  onRetry?: (error: DetailedError) => void;
  onIgnore?: (error: DetailedError) => void;
  onEdit?: (error: DetailedError) => void;
  onViewDetails?: (error: DetailedError) => void;
  onExportErrors?: () => void;
  className?: string;
}

const ICON_MAP = {
  AlertCircle,
  Copy,
  AlertTriangle,
  Shield,
  Wifi
};

export function ErrorDisplay({
  errors,
  onRetry,
  onIgnore,
  onEdit,
  onViewDetails,
  onExportErrors,
  className = ''
}: ErrorDisplayProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<ErrorCategory>>(new Set());
  const [showAllErrors, setShowAllErrors] = useState(false);

  if (!errors || errors.length === 0) {
    return null;
  }

  // Agrupar erros por categoria
  const errorsByCategory = errors.reduce((acc, error) => {
    if (!acc[error.category]) {
      acc[error.category] = [];
    }
    acc[error.category].push(error);
    return acc;
  }, {} as Record<ErrorCategory, DetailedError[]>);

  const toggleCategory = (category: ErrorCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const renderErrorActions = (error: DetailedError) => (
    <div className="flex gap-2 mt-2">
      {error.canRetry && onRetry && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRetry(error)}
          className="h-7 px-2 text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Tentar Novamente
        </Button>
      )}
      
      {error.canIgnore && onIgnore && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onIgnore(error)}
          className="h-7 px-2 text-xs"
        >
          <X className="h-3 w-3 mr-1" />
          Ignorar
        </Button>
      )}
      
      {onEdit && error.originalData && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onEdit(error)}
          className="h-7 px-2 text-xs"
        >
          <Edit className="h-3 w-3 mr-1" />
          Corrigir
        </Button>
      )}
      
      {onViewDetails && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onViewDetails(error)}
          className="h-7 px-2 text-xs"
        >
          <Eye className="h-3 w-3 mr-1" />
          Detalhes
        </Button>
      )}
    </div>
  );

  const renderErrorItem = (error: DetailedError, index: number) => {
    // AIDEV-NOTE: Validação defensiva para evitar config undefined
    const config = ERROR_CONFIG[error.category] || ERROR_CONFIG.system;
    const IconComponent = ICON_MAP[config.icon as keyof typeof ICON_MAP] || AlertCircle;

    return (
      <motion.div
        key={error.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={`p-3 rounded-lg border ${config.bgColor} ${config.borderColor}`}
      >
        <div className="flex items-start gap-3">
          <IconComponent className={`h-4 w-4 mt-0.5 ${config.color} flex-shrink-0`} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-body font-medium text-gray-900">
                {error.userMessage}
              </p>
              {error.field && (
                <Badge variant="outline" className="text-xs">
                  {error.field}
                </Badge>
              )}
              {error.rowIndex !== undefined && (
                <Badge variant="secondary" className="text-xs">
                  Linha {error.rowIndex + 1}
                </Badge>
              )}
            </div>
            
            {error.suggestedAction && (
              <p className="text-xs text-gray-600 mb-2">
                💡 {error.suggestedAction}
              </p>
            )}
            
            {renderErrorActions(error)}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderCategorySection = (category: ErrorCategory, categoryErrors: DetailedError[]) => {
    // AIDEV-NOTE: Validação defensiva para evitar config undefined
    const config = ERROR_CONFIG[category] || ERROR_CONFIG.system;
    const IconComponent = ICON_MAP[config.icon as keyof typeof ICON_MAP] || AlertCircle;
    const isExpanded = expandedCategories.has(category);
    const displayErrors = showAllErrors ? categoryErrors : categoryErrors.slice(0, 3);

    return (
      <Card key={category} className="border-2">
        <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category)}>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <IconComponent className={`h-5 w-5 ${config.color}`} />
                  <div>
                    <h3 className="font-semibold text-gray-900">{config.title}</h3>
                    <p className="text-body text-gray-600">
                      {categoryErrors.length} erro{categoryErrors.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="secondary" 
                    className={`${config.bgColor} ${config.color} border-0`}
                  >
                    {categoryErrors.length}
                  </Badge>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <AnimatePresence>
                  {displayErrors.map((error, index) => renderErrorItem(error, index))}
                </AnimatePresence>
                
                {!showAllErrors && categoryErrors.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllErrors(true)}
                    className="w-full text-xs"
                  >
                    Ver mais {categoryErrors.length - 3} erro{categoryErrors.length - 3 !== 1 ? 's' : ''}
                  </Button>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`space-y-4 ${className}`}
    >
      {/* Header com resumo e ações globais */}
      <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <div>
            <h2 className="font-semibold text-red-900">
              {errors.length} erro{errors.length !== 1 ? 's' : ''} encontrado{errors.length !== 1 ? 's' : ''}
            </h2>
            <p className="text-body text-red-700">
              Revise os erros abaixo e tome as ações necessárias
            </p>
          </div>
        </div>
        
        {onExportErrors && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExportErrors}
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar Erros
          </Button>
        )}
      </div>

      {/* Seções por categoria */}
      <div className="space-y-3">
        {Object.entries(errorsByCategory).map(([category, categoryErrors]) =>
          renderCategorySection(category as ErrorCategory, categoryErrors)
        )}
      </div>
    </motion.div>
  );
}

export default ErrorDisplay;