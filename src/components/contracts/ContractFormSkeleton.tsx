import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton específico para o formulário de contratos
 * Replica a estrutura visual do ContractForm com header, sidebar vertical e conteúdo
 */
export function ContractFormSkeleton() {
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header do formulário - com gradiente similar ao real */}
      <div className="border-b bg-gradient-to-r from-primary/10 via-primary/8 to-primary/5 p-4 flex-shrink-0 min-h-[60px]">
        <div className="flex items-center gap-3">
          <Skeleton height={20} width={20} borderRadius={6} />
          <div className="flex items-center gap-3">
            <Skeleton height={40} width={40} borderRadius={8} />
            <div className="space-y-2">
              <Skeleton height={18} width={280} />
              <Skeleton height={12} width={220} />
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal com sidebar vertical e área de conteúdo */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar vertical de navegação */}
        <div className="w-[90px] bg-card shadow-md flex flex-col items-center border-r border-border/30 flex-shrink-0">
          {/* Botão de Salvar no topo */}
          <div className="py-3 flex-shrink-0 w-full flex justify-center">
            <Skeleton height={36} width={64} borderRadius={8} />
          </div>
          
          {/* Botões de navegação vertical */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-1.5 py-2 w-full">
            <nav className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 7].map((item) => (
                <div key={item} className="flex flex-col items-center justify-center w-12 h-12 rounded-lg">
                  <Skeleton height={16} width={16} circle />
                  <Skeleton height={9} width={40} className="mt-1" />
                </div>
              ))}
            </nav>
          </div>
          
          {/* Ações do contrato na parte inferior */}
          <div className="flex-shrink-0 w-full min-h-[200px]">
            <div className="px-1.5 py-2 border-t border-border/20">
              <div className="text-center mb-2">
                <Skeleton height={7} width={32} className="mx-auto" />
              </div>
              <div className="space-y-1.5">
                <Skeleton height={40} width={64} borderRadius={6} />
                <Skeleton height={40} width={64} borderRadius={6} />
                <Skeleton height={40} width={64} borderRadius={6} />
              </div>
            </div>
            <div className="p-2 border-t border-border/20 w-full flex justify-center">
              <Skeleton height={32} width={64} borderRadius={6} />
            </div>
          </div>
        </div>

        {/* Área principal de conteúdo */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="min-h-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 pb-20">
              {/* Coluna principal (2/3) */}
              <div className="col-span-1 lg:col-span-2 space-y-6">
                {/* Card de Informações Básicas */}
                <div className="bg-card rounded-lg border border-border/50 p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Skeleton height={16} width={16} circle />
                    <Skeleton height={20} width={180} />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Skeleton height={14} width={80} />
                        <Skeleton height={40} width="100%" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton height={14} width={100} />
                        <Skeleton height={40} width="100%" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Skeleton height={14} width={60} />
                        <Skeleton height={40} width="100%" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton height={14} width={70} />
                        <Skeleton height={40} width="100%" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton height={14} width={80} />
                        <Skeleton height={40} width="100%" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Skeleton height={14} width={90} />
                        <Skeleton height={40} width="100%" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton height={14} width={100} />
                        <Skeleton height={40} width="100%" />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Card de conteúdo da aba ativa */}
                <div className="bg-card rounded-lg border border-border/50 p-6 shadow-sm min-h-[500px]">
                  <div className="flex items-center gap-2 mb-4">
                    <Skeleton height={16} width={16} circle />
                    <Skeleton height={20} width={200} />
                  </div>
                  
                  <div className="space-y-4">
                    {/* Lista de serviços/produtos */}
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <Skeleton height={16} width={120} />
                          <div className="flex gap-2">
                            <Skeleton height={32} width={32} circle />
                            <Skeleton height={32} width={32} circle />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <Skeleton height={14} width="100%" />
                          <Skeleton height={14} width="100%" />
                          <Skeleton height={14} width="100%" />
                          <Skeleton height={14} width="100%" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Sidebar de resumo (1/3) */}
              <div className="col-span-1 lg:col-span-1">
                <div className="bg-card sticky top-4 rounded-lg border border-border/50 shadow-sm p-6 mb-8">
                  <div className="space-y-6">
                    {/* Resumo financeiro */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 pb-3">
                        <Skeleton height={32} width={32} borderRadius={8} />
                        <Skeleton height={18} width={140} />
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <Skeleton height={14} width={60} />
                          <Skeleton height={16} width={100} />
                        </div>
                        <div className="flex justify-between items-center">
                          <Skeleton height={14} width={50} />
                          <Skeleton height={14} width={80} />
                        </div>
                        <div className="flex justify-between items-center">
                          <Skeleton height={14} width={70} />
                          <Skeleton height={14} width={90} />
                        </div>
                        <div className="flex justify-between items-center">
                          <Skeleton height={14} width={60} />
                          <Skeleton height={14} width={80} />
                        </div>
                        <div className="border-t pt-2">
                          <div className="flex justify-between items-center">
                            <Skeleton height={16} width={40} />
                            <Skeleton height={20} width={120} />
                          </div>
                        </div>
                      </div>
                      
                      {/* Margem de Lucro */}
                      <div className="mt-4 p-3 bg-muted/40 rounded-lg border border-border/40">
                        <div className="flex justify-between items-center mb-1">
                          <Skeleton height={14} width={100} />
                          <Skeleton height={20} width={50} borderRadius={999} />
                        </div>
                        <Skeleton height={12} width={120} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton simplificado para carregamento rápido
 */
export function ContractFormSkeletonSimple() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton height={32} width={256} />
          <Skeleton height={16} width={192} />
        </div>
        <div className="flex gap-2">
          <Skeleton height={36} width={80} />
          <Skeleton height={36} width={96} />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <Skeleton height={24} width={128} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton height={40} width="100%" />
              <Skeleton height={40} width="100%" />
            </div>
          </div>
          
          <div className="space-y-4">
            <Skeleton height={24} width={112} />
            <Skeleton height={128} width="100%" />
          </div>
        </div>
        
        <div className="space-y-4">
          <Skeleton height={24} width={96} />
          <div className="bg-card rounded-lg border border-border/50 p-4">
            <div className="space-y-3">
              <Skeleton height={16} width="100%" />
              <Skeleton height={16} width="75%" />
              <Skeleton height={16} width="50%" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
