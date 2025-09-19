/**
 * AIDEV-NOTE: Página de Configurações Administrativas
 * 
 * Esta página implementa as configurações globais do sistema administrativo
 * seguindo o padrão de design estabelecido com Shadcn/UI + Tailwind CSS.
 * 
 * Funcionalidades:
 * - Configurações gerais do sistema
 * - Configurações de segurança
 * - Configurações de notificações
 * - Configurações de integração
 * - Logs de auditoria
 * 
 * UI/UX:
 * - Design responsivo mobile-first
 * - Microinterações com Motion.dev
 * - Componentes Shadcn/UI
 * - Bordas arredondadas e sombras suaves
 * - Feedback visual para ações do usuário
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Shield, 
  Bell, 
  Zap, 
  Database, 
  Users, 
  Mail,
  Key,
  Globe,
  Save,
  RefreshCw
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuditLogger } from '@/hooks/useAuditLogger';

/**
 * AIDEV-NOTE: Página principal de configurações administrativas
 * Implementa tabs para organizar diferentes categorias de configurações
 */
export default function AdminSettingsPage() {
  const { toast } = useToast();
  const { logAction } = useAuditLogger();
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados para as configurações
  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'Revalya Platform',
    siteUrl: 'https://app.revalya.com',
    adminEmail: 'admin@revalya.com',
    maintenanceMode: false,
    debugMode: false
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorRequired: true,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    requirePasswordChange: false
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    auditAlerts: true,
    systemAlerts: true
  });

  // AIDEV-NOTE: Função para salvar configurações com feedback visual
  const handleSaveSettings = async (category: string) => {
    setIsLoading(true);
    
    try {
      // Simular salvamento (aqui você implementaria a lógica real)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Log da ação para auditoria
      await logAction('ADMIN_SETTINGS_UPDATE', {
        category,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Configurações salvas",
        description: `As configurações de ${category} foram atualizadas com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar as configurações. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* AIDEV-NOTE: Header da página com título e descrição */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-2"
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Configurações Administrativas</h1>
            <p className="text-muted-foreground">
              Gerencie as configurações globais do sistema e políticas de segurança
            </p>
          </div>
        </div>
      </motion.div>

      {/* AIDEV-NOTE: Tabs para organizar as configurações em categorias */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general" className="flex items-center space-x-2">
              <Globe className="h-4 w-4" />
              <span>Geral</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Segurança</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center space-x-2">
              <Bell className="h-4 w-4" />
              <span>Notificações</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Integrações</span>
            </TabsTrigger>
          </TabsList>

          {/* AIDEV-NOTE: Tab de Configurações Gerais */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="h-5 w-5" />
                  <span>Configurações Gerais</span>
                </CardTitle>
                <CardDescription>
                  Configure as informações básicas da plataforma
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="siteName">Nome da Plataforma</Label>
                    <Input
                      id="siteName"
                      value={generalSettings.siteName}
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, siteName: e.target.value }))}
                      placeholder="Nome da sua plataforma"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="siteUrl">URL da Plataforma</Label>
                    <Input
                      id="siteUrl"
                      value={generalSettings.siteUrl}
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, siteUrl: e.target.value }))}
                      placeholder="https://sua-plataforma.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Email do Administrador</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      value={generalSettings.adminEmail}
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, adminEmail: e.target.value }))}
                      placeholder="admin@sua-plataforma.com"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Configurações do Sistema</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Modo de Manutenção</Label>
                        <p className="text-sm text-muted-foreground">
                          Ativar modo de manutenção para todos os usuários
                        </p>
                      </div>
                      <Switch
                        checked={generalSettings.maintenanceMode}
                        onCheckedChange={(checked) => 
                          setGeneralSettings(prev => ({ ...prev, maintenanceMode: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Modo Debug</Label>
                        <p className="text-sm text-muted-foreground">
                          Ativar logs detalhados para desenvolvimento
                        </p>
                      </div>
                      <Switch
                        checked={generalSettings.debugMode}
                        onCheckedChange={(checked) => 
                          setGeneralSettings(prev => ({ ...prev, debugMode: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={() => handleSaveSettings('geral')}
                    disabled={isLoading}
                    className="flex items-center space-x-2"
                  >
                    {isLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>Salvar Configurações</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AIDEV-NOTE: Tab de Configurações de Segurança */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Configurações de Segurança</span>
                </CardTitle>
                <CardDescription>
                  Configure políticas de segurança e autenticação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Timeout de Sessão (minutos)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => setSecuritySettings(prev => ({ 
                        ...prev, 
                        sessionTimeout: parseInt(e.target.value) || 30 
                      }))}
                      min="5"
                      max="480"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxLoginAttempts">Máximo de Tentativas de Login</Label>
                    <Input
                      id="maxLoginAttempts"
                      type="number"
                      value={securitySettings.maxLoginAttempts}
                      onChange={(e) => setSecuritySettings(prev => ({ 
                        ...prev, 
                        maxLoginAttempts: parseInt(e.target.value) || 5 
                      }))}
                      min="3"
                      max="10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passwordMinLength">Tamanho Mínimo da Senha</Label>
                    <Input
                      id="passwordMinLength"
                      type="number"
                      value={securitySettings.passwordMinLength}
                      onChange={(e) => setSecuritySettings(prev => ({ 
                        ...prev, 
                        passwordMinLength: parseInt(e.target.value) || 8 
                      }))}
                      min="6"
                      max="32"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Políticas de Autenticação</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Autenticação de Dois Fatores Obrigatória</Label>
                        <p className="text-sm text-muted-foreground">
                          Exigir 2FA para todos os usuários administrativos
                        </p>
                      </div>
                      <Switch
                        checked={securitySettings.twoFactorRequired}
                        onCheckedChange={(checked) => 
                          setSecuritySettings(prev => ({ ...prev, twoFactorRequired: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Forçar Troca de Senha</Label>
                        <p className="text-sm text-muted-foreground">
                          Exigir troca de senha no próximo login
                        </p>
                      </div>
                      <Switch
                        checked={securitySettings.requirePasswordChange}
                        onCheckedChange={(checked) => 
                          setSecuritySettings(prev => ({ ...prev, requirePasswordChange: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={() => handleSaveSettings('segurança')}
                    disabled={isLoading}
                    className="flex items-center space-x-2"
                  >
                    {isLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>Salvar Configurações</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AIDEV-NOTE: Tab de Configurações de Notificações */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Configurações de Notificações</span>
                </CardTitle>
                <CardDescription>
                  Configure como e quando receber notificações do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Canais de Notificação</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Notificações por Email</Label>
                        <p className="text-sm text-muted-foreground">
                          Receber notificações importantes por email
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.emailNotifications}
                        onCheckedChange={(checked) => 
                          setNotificationSettings(prev => ({ ...prev, emailNotifications: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Notificações por SMS</Label>
                        <p className="text-sm text-muted-foreground">
                          Receber alertas críticos por SMS
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.smsNotifications}
                        onCheckedChange={(checked) => 
                          setNotificationSettings(prev => ({ ...prev, smsNotifications: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Notificações Push</Label>
                        <p className="text-sm text-muted-foreground">
                          Receber notificações push no navegador
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.pushNotifications}
                        onCheckedChange={(checked) => 
                          setNotificationSettings(prev => ({ ...prev, pushNotifications: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Tipos de Alerta</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Alertas de Auditoria</Label>
                        <p className="text-sm text-muted-foreground">
                          Notificar sobre atividades suspeitas ou violações de segurança
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.auditAlerts}
                        onCheckedChange={(checked) => 
                          setNotificationSettings(prev => ({ ...prev, auditAlerts: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Alertas do Sistema</Label>
                        <p className="text-sm text-muted-foreground">
                          Notificar sobre problemas de performance ou disponibilidade
                        </p>
                      </div>
                      <Switch
                        checked={notificationSettings.systemAlerts}
                        onCheckedChange={(checked) => 
                          setNotificationSettings(prev => ({ ...prev, systemAlerts: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={() => handleSaveSettings('notificações')}
                    disabled={isLoading}
                    className="flex items-center space-x-2"
                  >
                    {isLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>Salvar Configurações</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AIDEV-NOTE: Tab de Configurações de Integrações */}
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>Configurações de Integrações</span>
                </CardTitle>
                <CardDescription>
                  Configure integrações com serviços externos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* AIDEV-NOTE: Cards de integração com status visual */}
                  <div className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">Email Service</span>
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Conectado
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Serviço de envio de emails transacionais
                    </p>
                    <Button variant="outline" size="sm">
                      Configurar
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Database className="h-5 w-5 text-purple-600" />
                        <span className="font-medium">Backup Service</span>
                      </div>
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                        Pendente
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Backup automático dos dados
                    </p>
                    <Button variant="outline" size="sm">
                      Configurar
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Key className="h-5 w-5 text-red-600" />
                        <span className="font-medium">API Gateway</span>
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Ativo
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Gateway de APIs e autenticação
                    </p>
                    <Button variant="outline" size="sm">
                      Configurar
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Users className="h-5 w-5 text-indigo-600" />
                        <span className="font-medium">User Analytics</span>
                      </div>
                      <Badge variant="outline" className="text-gray-600 border-gray-600">
                        Desconectado
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Analytics e métricas de usuários
                    </p>
                    <Button variant="outline" size="sm">
                      Configurar
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={() => handleSaveSettings('integrações')}
                    disabled={isLoading}
                    className="flex items-center space-x-2"
                  >
                    {isLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>Salvar Configurações</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}