// =====================================================
// PÁGINA SEGURA DE NOTIFICAÇÕES
// Implementa todas as 5 camadas de segurança multi-tenant
// UI/UX: Shadcn/UI + UIverse + Motion.dev
// =====================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSecureNotifications, useNotificationStats } from '@/hooks/useSecureNotifications';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Bell, 
  BellRing, 
  Check, 
  CheckCheck, 
  Trash2, 
  Filter,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// AIDEV-NOTE: Componente principal da página de notificações segura
export default function Notifications() {
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // 🛡️ HOOK SEGURO COM TODAS AS VALIDAÇÕES
  const {
    notifications,
    loading,
    error,
    hasAccess,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    unreadCount,
    totalCount
  } = useSecureNotifications({
    // AIDEV-NOTE: Campo 'read' removido - não existe na tabela notifications
    type: typeFilter === 'all' ? undefined : typeFilter,
    limit: 50
  });

  // 📊 ESTATÍSTICAS SEGURAS
  const { data: stats } = useNotificationStats();

  // 🎨 ANIMAÇÕES MOTION.DEV
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    },
    exit: {
      x: -100,
      opacity: 0,
      transition: {
        duration: 0.2
      }
    }
  };

  // 🎨 FUNÇÃO PARA ÍCONE POR TIPO (UIverse style)
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  // 🎨 FUNÇÃO PARA COR DO BADGE POR TIPO
  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'success':
        return 'default';
      case 'info':
      default:
        return 'outline';
    }
  };

  // 🚫 GUARD DE ACESSO
  if (!hasAccess) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Acesso Negado
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Você não tem permissão para acessar as notificações.
            </p>
          </motion.div>
        </div>
      </Layout>
    );
  }

  // ❌ TRATAMENTO DE ERRO
  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Erro ao Carregar Notificações
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error.message}
            </p>
            <Button onClick={() => window.location.reload()}>
              Tentar Novamente
            </Button>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* 🎨 HEADER COM ANIMAÇÃO */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 15 }}
                whileTap={{ scale: 0.9 }}
                className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-2xl"
              >
                {unreadCount > 0 ? (
                  <BellRing className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                ) : (
                  <Bell className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                )}
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Notificações
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {totalCount} notificações • {unreadCount} não lidas
                </p>
              </div>
            </div>
            
            {/* 🎨 BOTÕES DE AÇÃO (UIverse style) */}
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={markAllAsRead}
                    variant="outline"
                    size="sm"
                    className="gap-2 hover:bg-green-50 hover:border-green-200 hover:text-green-700 dark:hover:bg-green-900/20"
                  >
                    <CheckCheck className="h-4 w-4" />
                    Marcar Todas como Lidas
                  </Button>
                </motion.div>
              )}
            </div>
          </div>

          {/* 📊 ESTATÍSTICAS RÁPIDAS */}
          {stats && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
            >
              <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</div>
                  <div className="text-sm text-blue-600/70 dark:text-blue-400/70">Total</div>
                </div>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.unread}</div>
                  <div className="text-sm text-red-600/70 dark:text-red-400/70">Não Lidas</div>
                </div>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.recent}</div>
                  <div className="text-sm text-green-600/70 dark:text-green-400/70">Recentes</div>
                </div>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {Object.keys(stats.byType).length}
                  </div>
                  <div className="text-sm text-purple-600/70 dark:text-purple-400/70">Tipos</div>
                </div>
              </Card>
            </motion.div>
          )}
        </motion.div>

        {/* 🎛️ FILTROS */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <Tabs value={filter} onValueChange={(value) => setFilter(value as any)} className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="all" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Todas
                </TabsTrigger>
                <TabsTrigger value="unread" className="gap-2">
                  <BellRing className="h-4 w-4" />
                  Não Lidas
                </TabsTrigger>
                <TabsTrigger value="read" className="gap-2">
                  <Check className="h-4 w-4" />
                  Lidas
                </TabsTrigger>
              </TabsList>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="info">Informação</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="warning">Aviso</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Tabs>
        </motion.div>

        {/* 📋 LISTA DE NOTIFICAÇÕES */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          {loading ? (
            // 💀 SKELETON LOADING
            Array.from({ length: 5 }).map((_, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card className="w-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-4 w-[100px]" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-[80%]" />
                  </CardContent>
                </Card>
              </motion.div>
            ))
          ) : notifications.length === 0 ? (
            // 🚫 ESTADO VAZIO
            <motion.div variants={itemVariants}>
              <Card className="w-full">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="text-gray-500 dark:text-gray-400 text-center"
                  >
                    <Bell className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Nenhuma notificação</h3>
                    <p>Você não possui notificações {filter !== 'all' ? filter === 'read' ? 'lidas' : 'não lidas' : ''} no momento.</p>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            // 📋 LISTA DE NOTIFICAÇÕES
            <AnimatePresence>
              {notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  variants={itemVariants}
                  layout
                  exit="exit"
                >
                  <Card className={cn(
                    "w-full transition-all duration-200 hover:shadow-lg",
                    !notification.read && "border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10"
                  )}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getNotificationIcon(notification.type)}
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              {notification.title || notification.type}
                              {!notification.read && (
                                <Badge variant="secondary" className="text-xs">
                                  Nova
                                </Badge>
                              )}
                            </CardTitle>
                            <Badge variant={getBadgeVariant(notification.type)} className="text-xs mt-1">
                              {notification.type}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                          
                          {/* 🎨 BOTÕES DE AÇÃO (UIverse style) */}
                          <div className="flex items-center gap-1">
                            {!notification.read && (
                              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                <Button
                                  onClick={() => markAsRead(notification.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900/20"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              </motion.div>
                            )}
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                              <Button
                                onClick={() => deleteNotification(notification.id)}
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </motion.div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 dark:text-gray-300">
                        {notification.message || notification.content}
                      </p>
                      {notification.metadata && (
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
                            {JSON.stringify(notification.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}
