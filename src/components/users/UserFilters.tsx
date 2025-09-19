import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { X, Search, Filter, CheckCircle } from "lucide-react";

interface UserFiltersProps {
  searchTerm: string;
  roleFilter: string | null;
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (value: string | null) => void;
  onClearFilters: () => void;
}

export function UserFilters({
  searchTerm,
  roleFilter,
  onSearchChange,
  onRoleFilterChange,
  onClearFilters
}: UserFiltersProps) {
  const [inputValue, setInputValue] = useState(searchTerm);

  // Roles disponíveis no sistema
  const roles = [
    { id: "TENANT_ADMIN", label: "Administrador" },
    { id: "TENANT_USER", label: "Usuário" },
    { id: "ANALYST", label: "Analista" },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(inputValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    // Se quiser busca em tempo real, descomente abaixo
    // onSearchChange(e.target.value);
  };

  const handleClearSearch = () => {
    setInputValue("");
    onSearchChange("");
  };

  return (
    <div className="flex flex-col gap-3 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-base">Usuários</h3>
          {(searchTerm || roleFilter) && (
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
              Filtros ativos
            </Badge>
          )}
        </div>

        {(searchTerm || roleFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-8 gap-1 text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
            Limpar filtros
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Campo de busca */}
        <div className="flex-1 min-w-[200px]">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email..."
              value={inputValue}
              onChange={handleInputChange}
              className="pl-8 pr-8 h-9"
            />
            {inputValue && (
              <X
                className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={handleClearSearch}
              />
            )}
          </form>
        </div>

        {/* Dropdown de filtro de papel */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1"
            >
              <Filter size={14} />
              <span>Papel</span>
              {roleFilter && <Badge variant="outline" className="ml-1 py-0 h-5">1</Badge>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Filtrar por papel</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {roles.map((role) => (
                <DropdownMenuItem 
                  key={role.id}
                  onClick={() => onRoleFilterChange(role.id)}
                  className={cn(
                    "flex justify-between cursor-pointer",
                    roleFilter === role.id && "bg-primary/10"
                  )}
                >
                  {role.label}
                  {roleFilter === role.id && (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
              {roleFilter && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onRoleFilterChange(null)}
                    className="text-muted-foreground justify-center"
                  >
                    Limpar filtro
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
