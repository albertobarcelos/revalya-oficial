import { useQuery } from '@tanstack/react-query'
import { useAuditLogger } from '@/hooks/useAuditLogger'
import { useSupabase } from '@/hooks/useSupabase'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Users, DollarSign, ArrowUpRight, ArrowDownRight, Shield, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { z } from 'zod'
import { useMemo } from 'react'

// AIDEV-NOTE: Dashboard administrativo com acesso global
// Verificação baseada apenas em user_role ADMIN, sem dependência de tenant

// Schema de validação para dados do dashboard (CAMADA 5)
const dashboardStatsSchema = z.object({
  tenants: z.number().min(0),
  resellers: z.number().min(0),
  users: z.number().min(0),
  revenue: z.number().min(0),
  growth: z.number()
})

type DashboardStats = z.infer<typeof dashboardStatsSchema>

export default function AdminDashboard() {
  // AIDEV-NOTE: Verificação de usuário autenticado e role admin
  const { user } = useSupabase();
  
  // Hook de auditoria
  const { logAction } = useAuditLogger()

  // 🛡️ CAMADA 1: Query para verificar role do usuário na tabela public.users
  const { data: userRoleData, isLoading: isLoadingRole } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      console.log('🔍 [ADMIN ACCESS CHECK] Consultando role na tabela public.users:', user.id);
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('user_role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('❌ [ADMIN ACCESS CHECK] Erro ao consultar public.users:', error);
          // Fallback para metadados em caso de erro
          const fallbackRole = user.app_metadata?.user_role || user.user_metadata?.role;
          console.log('🔄 [ADMIN ACCESS CHECK] Usando fallback dos metadados:', fallbackRole);
          return { user_role: fallbackRole };
        }

        console.log('✅ [ADMIN ACCESS CHECK] Role obtido da public.users:', data);
        return data;
      } catch (error) {
        console.error('❌ [ADMIN ACCESS CHECK] Erro na consulta:', error);
        // Fallback para metadados em caso de erro
        const fallbackRole = user.app_metadata?.user_role || user.user_metadata?.role;
        console.log('🔄 [ADMIN ACCESS CHECK] Usando fallback dos metadados:', fallbackRole);
        return { user_role: fallbackRole };
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    retry: 1
  });

  // 🛡️ CAMADA 2: Verificação de acesso admin global baseada na consulta
  const { hasAccess, accessError, userRole } = useMemo(() => {
    // Verificar se usuário está autenticado
    if (!user) {
      return {
        hasAccess: false,
        accessError: 'Usuário não autenticado',
        userRole: null
      };
    }

    // Aguardar carregamento do role
    if (isLoadingRole) {
      return {
        hasAccess: false,
        accessError: 'Carregando permissões...',
        userRole: null
      };
    }

    const userRole = userRoleData?.user_role;
    const isAdmin = userRole === 'ADMIN';

    console.log(`🔍 [ADMIN ACCESS CHECK] Verificando acesso admin:`, {
      userId: user.id,
      userRole,
      isAdmin,
      source: 'public.users'
    });

    return {
      hasAccess: isAdmin,
      accessError: isAdmin ? null : 'Acesso negado - role de administrador necessária',
      userRole
    };
  }, [user, userRoleData, isLoadingRole]);

  // 🔍 CAMADA 2: Query global de dados administrativos (acesso admin global)
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard-stats-global'],
    queryFn: async (): Promise<DashboardStats> => {
      try {
        // Log de auditoria para acesso ao dashboard admin global
        await logAction({
          action: 'ADMIN_DASHBOARD_ACCESS',
          resource: 'admin_dashboard_global',
          details: { 
            userRole,
            timestamp: new Date().toISOString(),
            globalAccess: true,
            adminUserId: user?.id
          }
        })

        console.log('🔍 [ADMIN DASHBOARD] Executando queries globais administrativas...');

        // Queries administrativas globais (sem filtro de tenant)
        const [tenantsResult, usersResult] = await Promise.all([
          // Query global de todos os tenants
          supabase
            .from('tenants')
            .select('id, active, created_at')
            .order('created_at', { ascending: false }),
          
          // Query global de todos os usuários na tabela public.users
          supabase
            .from('users')
            .select('id, user_role, created_at')
            .order('created_at', { ascending: false })
        ])

        if (tenantsResult.error) {
          console.error('❌ [ADMIN DASHBOARD] Erro ao buscar tenants:', tenantsResult.error);
          throw tenantsResult.error;
        }
        
        if (usersResult.error) {
          console.error('❌ [ADMIN DASHBOARD] Erro ao buscar usuários:', usersResult.error);
          throw usersResult.error;
        }

        const tenants = tenantsResult.data?.length || 0
        const users = usersResult.data?.length || 0
        const resellers = usersResult.data?.filter(u => u.user_role === 'RESELLER').length || 0

        // Calcular receita baseada em tenants ativos
        const activeTenants = tenantsResult.data?.filter(t => t.active === true).length || 0
        const revenue = activeTenants * 1000 // Placeholder - implementar lógica real
        const growth = 15.5 // Placeholder - calcular crescimento real

        const result = {
          tenants,
          resellers,
          users,
          revenue,
          growth
        }

        console.log('✅ [ADMIN DASHBOARD] Estatísticas globais carregadas:', result);

        // 🛡️ CAMADA 5: Validação de schema dos dados retornados
        return dashboardStatsSchema.parse(result)

      } catch (error) {
        console.error('❌ [ADMIN DASHBOARD] Erro ao buscar estatísticas globais:', error)
        toast.error('Erro ao carregar estatísticas do dashboard admin')
        throw error
      }
    },
    enabled: hasAccess && !!user && userRole === 'ADMIN',
    refetchInterval: 30000, // Atualizar a cada 30 segundos
    staleTime: 10000 // Considerar dados obsoletos após 10 segundos
  })

  // 🚨 CAMADA 4: Tratamento de erros de acesso admin
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-red-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8 bg-white rounded-2xl shadow-xl border border-red-200"
        >
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-700 mb-2">Acesso Negado</h2>
          <p className="text-red-600 mb-4">
            {accessError || 'Você não tem permissão para acessar o dashboard administrativo global.'}
          </p>
          <p className="text-sm text-red-500">
            Role atual: {userRole || 'Não definida'} | Necessário: ADMIN
          </p>
          <p className="text-xs text-red-400 mt-2">
            Dashboard Admin Global - Acesso a todos os dados sem restrição de tenant
          </p>
        </motion.div>
      </div>
    )
  }

  // 🔄 Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando estatísticas administrativas globais...</p>
          <p className="text-xs text-gray-400 mt-2">Acesso global - todos os tenants</p>
        </motion.div>
      </div>
    )
  }

  // ❌ Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-red-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8 bg-white rounded-2xl shadow-xl border border-red-200"
        >
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-700 mb-2">Erro ao Carregar Dashboard Admin</h2>
          <p className="text-red-600 mb-4">
            Não foi possível carregar as estatísticas administrativas globais.
          </p>
          <p className="text-sm text-red-500 font-mono">
            {error instanceof Error ? error.message : 'Erro desconhecido'}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Tentar Novamente
          </button>
        </motion.div>
      </div>
    )
  }

  // AIDEV-NOTE: Configuração dos cards de estatísticas do dashboard
  const statCards = [
    {
      title: 'Total de Tenants',
      value: stats?.tenants || 0,
      icon: Building2,
      description: 'Empresas ativas na plataforma',
      trend: 'up',
      trendValue: '+5.2%',
    },
    {
      title: 'Revendedores',
      value: stats?.resellers || 0,
      icon: Users,
      description: 'Parceiros ativos',
      trend: 'up',
      trendValue: '+12.3%',
    },
    {
      title: 'Receita Mensal',
      value: stats?.revenue ? `R$ ${stats.revenue.toLocaleString()}` : 'R$ 0',
      icon: DollarSign,
      description: 'Total do mês atual',
      trend: 'down',
      trendValue: '-2.1%',
    },
    {
      title: 'Crescimento',
      value: stats?.growth ? `${stats.growth}%` : '0%',
      icon: ArrowUpRight,
      description: 'Comparado ao mês anterior',
      trend: 'up',
      trendValue: '+8.4%',
    },
  ]



  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Administrativo Global</h1>
          <p className="text-muted-foreground">
            Visão geral de todos os tenants e estatísticas globais do sistema
          </p>
          <div className="flex items-center space-x-2 mt-2">
            <Shield className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-600 font-medium">Acesso Admin Global</span>
            <span className="text-xs text-gray-400">• Role: {userRole}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground bg-green-50 px-3 py-2 rounded-lg border border-green-200">
          <Shield className="h-4 w-4 text-green-600" />
          <span className="text-green-700 font-medium">Admin Global</span>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -2 }}
            >
              <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </motion.div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                  <motion.div 
                    className={cn(
                      "mt-2 flex items-center text-xs",
                      stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    )}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    {stat.trend === 'up' ? (
                      <ArrowUpRight className="mr-1 h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="mr-1 h-3 w-3" />
                    )}
                    {stat.trendValue}
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* TODO: Adicionar seções futuras como:
          - Gráficos de crescimento seguros
          - Logs de auditoria recentes
          - Alertas de segurança
          - Lista dos últimos tenants cadastrados
          - Atividades recentes
          - etc. */}
    </div>
  )
}
