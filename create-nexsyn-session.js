// Script para criar sessão do tenant 'nexsyn' no navegador
// Execute este código no console do navegador (F12)

(async function createNexsynSession() {
  try {
    console.log('🚀 Iniciando criação de sessão para tenant nexsyn...');
    
    // Verificar se o usuário está autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ Usuário não autenticado');
      return;
    }
    
    console.log('✅ Usuário autenticado:', user.email);
    
    // Buscar dados do tenant 'nexsyn'
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, slug, active')
      .eq('slug', 'nexsyn')
      .single();
    
    if (tenantError || !tenantData) {
      console.error('❌ Erro ao buscar tenant nexsyn:', tenantError);
      return;
    }
    
    console.log('✅ Tenant encontrado:', tenantData);
    
    // Verificar se o tenant está ativo
    if (!tenantData.active) {
      console.error('❌ Tenant nexsyn está inativo');
      return;
    }
    
    // Criar sessão usando TenantSessionManager
    const session = await TenantSessionManager.createTenantSession(
      tenantData.id,
      tenantData.slug,
      user.id,
      user.email
    );
    
    if (session) {
      console.log('✅ Sessão criada com sucesso para tenant nexsyn!');
      console.log('📝 Dados da sessão:', {
        tenantId: session.tenantId,
        tenantSlug: session.tenantSlug,
        userId: session.userId,
        userEmail: session.userEmail,
        expiresAt: new Date(session.expiresAt).toLocaleString()
      });
      
      // Definir como sessão atual
      TenantSessionManager.setCurrentSession('nexsyn');
      
      console.log('🎉 Agora você pode acessar: http://localhost:8081/nexsyn/recebimentos');
    } else {
      console.error('❌ Falha ao criar sessão');
    }
    
  } catch (error) {
    console.error('❌ Erro durante criação da sessão:', error);
  }
})();

// Função auxiliar para verificar sessões existentes
function checkExistingSessions() {
  const sessions = TenantSessionManager.getAllSessions();
  console.log('📋 Sessões existentes:', sessions);
  
  Object.entries(sessions).forEach(([key, session]) => {
    const isExpired = TenantSessionManager.isTokenExpired(session.expiresAt);
    console.log(`${isExpired ? '❌' : '✅'} ${session.tenantSlug}: ${isExpired ? 'EXPIRADA' : 'VÁLIDA'}`);
  });
}

// Executar verificação
checkExistingSessions();