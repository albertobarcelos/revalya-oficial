import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { UpdateValuesList } from "@/components/update-values/UpdateValuesList";

export default function UpdateValues() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between border-b pb-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Solicitações de Atualização</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Gerencie as solicitações de atualização de valores
                </p>
              </div>
              <div>
                <a
                  href="/solicitar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Link público para solicitações →
                </a>
              </div>
            </div>

            <UpdateValuesList />
          </div>
        </main>
      </div>
    </div>
  );
} 
