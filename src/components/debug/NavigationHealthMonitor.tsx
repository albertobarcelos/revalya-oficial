import React, { useEffect, useState } from 'react';
import { useAppInitialization } from '@/contexts/AppInitializationContext';
import { usePortal } from '@/contexts/PortalContext';
import { useTenant } from '@/features/tenant';
import { useCacheManager } from '@/hooks/useCacheManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

/**
 * Componente para monitorar a saúde da navegação e sistemas de recuperação
 * Útil para desenvolvimento e debugging
 */
export function NavigationHealthMonitor() {
  const {
    isInitializing,
    isPageReactivating,
    initializationLock,
    resetInitialization
  } = useAppInitialization();
  
  const { portalType, tenantId, isInitialized: portalInitialized } = usePortal();
  const { currentTenant, isInitialized: tenantInitialized } = useTenant();
  const { cacheSize, cacheVersion, clearCache, invalidateCriticalCaches } = useCacheManager();
  
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [healthScore, setHealthScore] = useState(100);
  
  // Calcular score de saúde
  useEffect(() => {
    let score = 100;
    
    // Penalizar se estiver inicializando por muito tempo
    if (isInitializing) score -= 20;
    if (isPageReactivating) score -= 15;
    if (initializationLock) score -= 10;
    
    // Penalizar se contextos não estão inicializados
    if (!portalInitialized) score -= 25;
    if (!tenantInitialized) score -= 25;
    
    // Penalizar cache muito grande
    if (cacheSize > 50) score -= 10;
    
    setHealthScore(Math.max(0, score));
    setLastUpdate(Date.now());
  }, [isInitializing, isPageReactivating, initializationLock, portalInitialized, tenantInitialized, cacheSize]);
  
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getHealthIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (score >= 60) return <Clock className="h-4 w-4 text-yellow-600" />;
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  };
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 bg-white/95 backdrop-blur-sm border shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          {getHealthIcon(healthScore)}
          Navigation Health Monitor
          <Badge variant={healthScore >= 80 ? 'default' : healthScore >= 60 ? 'secondary' : 'destructive'}>
            {healthScore}%
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3 text-xs">
        {/* Estados de Inicialização */}
        <div className="space-y-1">
          <div className="font-medium">Initialization States:</div>
          <div className="grid grid-cols-2 gap-1">
            <Badge variant={isInitializing ? 'destructive' : 'outline'} className="text-xs">
              Init: {isInitializing ? 'Yes' : 'No'}
            </Badge>
            <Badge variant={isPageReactivating ? 'destructive' : 'outline'} className="text-xs">
              Reactivating: {isPageReactivating ? 'Yes' : 'No'}
            </Badge>
            <Badge variant={initializationLock ? 'secondary' : 'outline'} className="text-xs">
              Lock: {initializationLock ? 'Yes' : 'No'}
            </Badge>
            <Badge variant={portalInitialized && tenantInitialized ? 'default' : 'destructive'} className="text-xs">
              Ready: {portalInitialized && tenantInitialized ? 'Yes' : 'No'}
            </Badge>
          </div>
        </div>
        
        {/* Estados dos Contextos */}
        <div className="space-y-1">
          <div className="font-medium">Context States:</div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Portal:</span>
              <Badge variant={portalInitialized ? 'default' : 'destructive'} className="text-xs">
                {portalType || 'None'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Tenant:</span>
              <Badge variant={tenantInitialized ? 'default' : 'destructive'} className="text-xs">
                {currentTenant?.name || 'None'}
              </Badge>
            </div>
          </div>
        </div>
        
        {/* Cache Info */}
        <div className="space-y-1">
          <div className="font-medium">Cache Status:</div>
          <div className="flex justify-between">
            <span>Entries:</span>
            <Badge variant={cacheSize > 50 ? 'secondary' : 'outline'} className="text-xs">
              {cacheSize}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span>Version:</span>
            <Badge variant="outline" className="text-xs">
              {cacheVersion}
            </Badge>
          </div>
        </div>
        
        {/* Ações de Recuperação */}
        <div className="space-y-2 pt-2 border-t">
          <div className="font-medium">Recovery Actions:</div>
          <div className="grid grid-cols-2 gap-1">
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7"
              onClick={() => clearCache()}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Clear Cache
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7"
              onClick={() => invalidateCriticalCaches()}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              Invalidate
            </Button>
          </div>
          <Button
            size="sm"
            variant="destructive"
            className="text-xs h-7 w-full"
            onClick={() => resetInitialization()}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Reset All
          </Button>
        </div>
        
        {/* Timestamp */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          Last update: {new Date(lastUpdate).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
}
