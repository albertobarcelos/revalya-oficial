import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface AnimatedSpinnerProps {
  size?: number;
  className?: string;
}

export function AnimatedSpinner({ size = 24, className }: AnimatedSpinnerProps) {
  return (
    <div className="flex items-center justify-center">
      <Loader2
        className={cn("animate-spin text-primary", className)}
        size={size}
      />
    </div>
  );
} 
