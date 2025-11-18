import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const routeNames: { [key: string]: string } = {
  '': 'Início',
  'clients': 'Clientes',
  'charges': 'Cobranças',
  'cobrancas': 'Cobranças',
  'recebimentos': 'Recebimentos',
  'contas-a-pagar': 'Contas a Pagar',
  'notifications': 'Notificações',
  'settings': 'Configurações',
  'dashboard': 'Dashboard',
  'tasks': 'Tarefas',
  'templates': 'Mensagens',
  'priority': 'Regras',
  'update-values': 'Atualizar Valores',
  'messages': 'Mensagens',
  'history': 'Histórico',
  'users': 'Usuários',
  'profile': 'Perfil',
  'integrations': 'Integrações',
  'invites': 'Convites',
  'configuracoes-financeiras': 'Configurações Financeiras',
};

export function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // No novo formato, o primeiro segmento é diretamente o slug do tenant
  let filteredPathnames = pathnames;
  let tenantSlug = '';
  
  // Verificamos se temos um caminho válido e se não é uma rota de admin
  if (pathnames.length >= 1 && pathnames[0] !== 'admin' && pathnames[0] !== 'login' && pathnames[0] !== 'register') {
    tenantSlug = pathnames[0]; // O primeiro segmento é o slug do tenant
    filteredPathnames = pathnames.slice(1); // Removemos apenas o slug, não temos mais o 'gestao'
  }

  // Determinar para onde o ícone Home deve direcionar
  const homePath = tenantSlug ? `/${tenantSlug}/dashboard` : '/';

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
      <Link
        to={homePath}
        className="flex items-center hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      {filteredPathnames.map((value, index) => {
        const last = index === filteredPathnames.length - 1;

        // Construir o caminho completo incluindo os segmentos originais
        let to;
        if (tenantSlug) {
          // Se temos um slug de tenant, usamos o novo padrão /{slug}/{path}
          to = `/${tenantSlug}/${filteredPathnames.slice(0, index + 1).join('/')}`;
        } else {
          // Caso contrário, usamos o caminho normal
          to = `/${pathnames.slice(0, index + 1).join('/')}`;
        }

        return (
          <div key={to} className="flex items-center">
            <ChevronRight className="h-4 w-4 mx-1" />
            {last ? (
              <span className="font-medium text-foreground">
                {routeNames[value] || value}
              </span>
            ) : (
              <Link
                to={to}
                className="hover:text-foreground transition-colors"
              >
                {routeNames[value] || value}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
