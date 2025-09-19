import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserCheck } from "lucide-react";
import { Profile } from "@/types/database";

interface ActiveUsersTableProps {
  profiles: Profile[];
  formatDate: (date: string) => string;
}

export function ActiveUsersTable({ profiles, formatDate }: ActiveUsersTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Data de Cadastro</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {profiles.map((profile) => (
          <TableRow key={profile.id}>
            <TableCell>{profile.name || '-'}</TableCell>
            <TableCell>{profile.email}</TableCell>
            <TableCell>{formatDate(profile.created_at)}</TableCell>
            <TableCell>
              <Badge variant="secondary">
                <UserCheck className="w-3 h-3 mr-1" />
                Ativo
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
