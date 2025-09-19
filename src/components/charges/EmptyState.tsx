import { TableRow, TableCell } from "@/components/ui/table";

export const EmptyState = ({ message }: { message: string }) => (
  <TableRow>
    <TableCell colSpan={8} className="text-center py-4">
      {message}
    </TableCell>
  </TableRow>
);
