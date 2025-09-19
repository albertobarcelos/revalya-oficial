import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TemplateSearchProps {
  searchTerm: string;
  onSearch: (term: string) => void;
}

export function TemplateSearch({ searchTerm, onSearch }: TemplateSearchProps) {
  return (
    <div className="flex items-center space-x-2">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Buscar templates..."
          value={searchTerm}
          onChange={(e) => onSearch(e.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  );
}
