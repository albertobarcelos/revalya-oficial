import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Edit, Tag, Trash2 } from "lucide-react";
import type { MessageTemplate } from "@/types/settings";

interface TemplateCardProps {
  template: MessageTemplate;
  onCopy: (template: MessageTemplate) => void;
  onEdit: (template: MessageTemplate) => void;
  onDelete: (id: string) => void;
}

export function TemplateCard({
  template,
  onCopy,
  onEdit,
  onDelete,
}: TemplateCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{template.name}</span>
          <Badge variant="secondary">{template.category}</Badge>
        </CardTitle>
        <CardDescription>{template.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground line-clamp-3">
            {template.message}
          </div>
          <div className="flex flex-wrap gap-1">
            {template.tags?.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                <Tag className="mr-1 h-3 w-3" />
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onCopy(template)}
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onEdit(template)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive"
          onClick={() => onDelete(template.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
