import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ArrowUpDown, Check, Edit, Grip, Plus, RefreshCcw, X } from "lucide-react";
import { useContractStages } from "@/hooks/useContracts";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ContractStage } from "@/types/models/contract";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Por enquanto este é apenas um componente de exemplo que será desenvolvido
// completamente em uma fase futura
export function StagesManager() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Estágios de Workflow</h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Configure o ciclo de vida dos contratos e as regras de transição entre estágios
          </p>
        </div>
        <Button className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Novo Estágio</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base md:text-lg">Estágios do Workflow de Contratos</CardTitle>
          <CardDescription className="text-sm">
            Arraste para reordenar os estágios na sequência desejada
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="rounded-md border p-4 md:p-8 text-center">
            <p className="font-medium text-sm md:text-base">Gerenciamento de Estágios em Desenvolvimento</p>
            <p className="mt-2 text-xs md:text-sm text-muted-foreground">
              Esta funcionalidade será implementada em breve. O gerenciamento de estágios
              permitirá definir o fluxo de trabalho completo dos contratos, desde a criação
              até a finalização.
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-md border p-3 space-y-2 sm:space-y-0">
                <div className="flex items-center">
                  <Grip className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col sm:flex-row sm:items-center">
                    <span className="font-medium text-sm md:text-base">Rascunho</span>
                    <Badge className="ml-0 sm:ml-2 mt-1 sm:mt-0 w-fit" variant="outline">Inicial</Badge>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Badge style={{ backgroundColor: "#CBD5E1" }} className="text-xs">Estágio 1</Badge>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-md border p-3 space-y-2 sm:space-y-0">
                <div className="flex items-center">
                  <Grip className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="font-medium text-sm md:text-base">Em Aprovação</span>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Badge style={{ backgroundColor: "#FCD34D" }} className="text-xs">Estágio 2</Badge>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-md border p-3 space-y-2 sm:space-y-0">
                <div className="flex items-center">
                  <Grip className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="font-medium text-sm md:text-base">Ativo</span>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Badge style={{ backgroundColor: "#4ADE80" }} className="text-xs">Estágio 3</Badge>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-md border p-3 space-y-2 sm:space-y-0">
                <div className="flex items-center">
                  <Grip className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col sm:flex-row sm:items-center">
                    <span className="font-medium text-sm md:text-base">Cancelado</span>
                    <Badge className="ml-0 sm:ml-2 mt-1 sm:mt-0 w-fit" variant="outline">Final</Badge>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Badge style={{ backgroundColor: "#F87171" }} className="text-xs">Estágio 4</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base md:text-lg">Regras de Transição</CardTitle>
          <CardDescription className="text-sm">
            Configure quais transições são permitidas entre os estágios
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 md:p-6">
          <div className="rounded-md border p-4 md:p-8 text-center">
            <p className="font-medium text-sm md:text-base">Matriz de Transições em Desenvolvimento</p>
            <p className="mt-2 text-xs md:text-sm text-muted-foreground">
              A matriz de transições permitirá configurar quais estágios podem ser atingidos a partir
              de outro estágio, criando um fluxo de trabalho personalizado para o ciclo de vida dos contratos.
            </p>
            <div className="mt-4 overflow-x-auto">
              <div className="min-w-[500px]">
                <div className="grid grid-cols-5 gap-1 md:gap-2">
                  <div className="font-medium text-xs md:text-sm p-1 md:p-2">De / Para</div>
                  <div className="rounded bg-muted p-1 md:p-2 text-center text-xs font-medium">Rascunho</div>
                  <div className="rounded bg-muted p-1 md:p-2 text-center text-xs font-medium">Em Aprovação</div>
                  <div className="rounded bg-muted p-1 md:p-2 text-center text-xs font-medium">Ativo</div>
                  <div className="rounded bg-muted p-1 md:p-2 text-center text-xs font-medium">Cancelado</div>
                  
                  <div className="rounded bg-muted p-1 md:p-2 text-center text-xs font-medium">Rascunho</div>
                  <div className="rounded-md border p-1 md:p-2 text-center">-</div>
                  <div className="rounded-md border p-1 md:p-2 text-center"><Check className="mx-auto h-3 w-3 md:h-4 md:w-4 text-green-500" /></div>
                  <div className="rounded-md border p-1 md:p-2 text-center"><X className="mx-auto h-3 w-3 md:h-4 md:w-4 text-red-500" /></div>
                  <div className="rounded-md border p-1 md:p-2 text-center"><Check className="mx-auto h-3 w-3 md:h-4 md:w-4 text-green-500" /></div>
                  
                  <div className="rounded bg-muted p-1 md:p-2 text-center text-xs font-medium">Em Aprovação</div>
                  <div className="rounded-md border p-1 md:p-2 text-center"><Check className="mx-auto h-3 w-3 md:h-4 md:w-4 text-green-500" /></div>
                  <div className="rounded-md border p-1 md:p-2 text-center">-</div>
                  <div className="rounded-md border p-1 md:p-2 text-center"><Check className="mx-auto h-3 w-3 md:h-4 md:w-4 text-green-500" /></div>
                  <div className="rounded-md border p-1 md:p-2 text-center"><Check className="mx-auto h-3 w-3 md:h-4 md:w-4 text-green-500" /></div>
                  
                  <div className="rounded bg-muted p-1 md:p-2 text-center text-xs font-medium">Ativo</div>
                  <div className="rounded-md border p-1 md:p-2 text-center"><X className="mx-auto h-3 w-3 md:h-4 md:w-4 text-red-500" /></div>
                  <div className="rounded-md border p-1 md:p-2 text-center"><X className="mx-auto h-3 w-3 md:h-4 md:w-4 text-red-500" /></div>
                  <div className="rounded-md border p-1 md:p-2 text-center">-</div>
                  <div className="rounded-md border p-1 md:p-2 text-center"><Check className="mx-auto h-3 w-3 md:h-4 md:w-4 text-green-500" /></div>
                  
                  <div className="rounded bg-muted p-1 md:p-2 text-center text-xs font-medium">Cancelado</div>
                  <div className="rounded-md border p-1 md:p-2 text-center"><X className="mx-auto h-3 w-3 md:h-4 md:w-4 text-red-500" /></div>
                  <div className="rounded-md border p-1 md:p-2 text-center"><X className="mx-auto h-3 w-3 md:h-4 md:w-4 text-red-500" /></div>
                  <div className="rounded-md border p-1 md:p-2 text-center"><X className="mx-auto h-3 w-3 md:h-4 md:w-4 text-red-500" /></div>
                  <div className="rounded-md border p-1 md:p-2 text-center">-</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
