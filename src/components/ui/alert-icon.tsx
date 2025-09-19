import { cn } from "@/lib/utils";
import { AlertTriangle, AlertCircle, Info, CheckCircle, XCircle } from "lucide-react";

export type AlertIconVariant = "default" | "success" | "warning" | "error" | "info";

interface AlertIconProps {
  variant?: AlertIconVariant;
  className?: string;
  size?: number;
}

export function AlertIcon({ variant = "default", className, size = 24 }: AlertIconProps) {
  const iconProps = {
    className: cn(className),
    size,
  };

  switch (variant) {
    case "success":
      return <CheckCircle {...iconProps} className={cn("text-success", className)} />;
    case "warning":
      return <AlertTriangle {...iconProps} className={cn("text-amber-500", className)} />;
    case "error":
      return <XCircle {...iconProps} className={cn("text-danger", className)} />;
    case "info":
      return <Info {...iconProps} className={cn("text-primary", className)} />;
    default:
      return <AlertCircle {...iconProps} className={cn("text-gray-500", className)} />;
  }
}
