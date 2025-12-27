import React from 'react';
import { Button } from '@/components/ui/button';
import { X, FileText, Sparkles, ArrowLeft, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalHeaderProps {
  handleClose: () => void;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({ handleClose }) => {
  return (
    <div className={cn(
      "relative overflow-hidden",
      "bg-gradient-to-r from-primary via-primary/85 to-primary/60",
      "border-b border-white/10"
    )}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-white/8 animate-pulse" />
      
      <div className="relative flex items-center justify-between p-4 z-10 h-[66.5px]">
        <div className="flex items-center gap-3">
          <Button 
              variant="ghost" 
              size="sm" 
              className="text-white/90 hover:text-white hover:bg-white/10 transition-all duration-200"
              onClick={handleClose}
          >
              <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white flex items-center gap-2">
                Nova conta a pagar
              </h1>
              <p className="text-xs text-white/70 flex items-center gap-1">
                <Hash className="h-3 w-3" />
                Preencha as informações da nova conta
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
