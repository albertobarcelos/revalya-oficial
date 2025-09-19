import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  const sizeMap = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  const pixelSize = sizeMap[size];

  return (
    <Loader2
      className={cn("animate-spin text-primary", className)}
      size={pixelSize}
    />
  );
} 
