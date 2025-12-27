import React, { useState } from 'react';
import { format } from 'date-fns';
import { X, CheckCircle2, AlertCircle, Clock, Link as LinkIcon, Trash, Edit2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useEditPayableLogic } from '../useEditPayableLogic';
import { SimulationItem } from '../types';

interface PayableRecurrenceTabProps {
  form: ReturnType<typeof useEditPayableLogic>;
  readOnly?: boolean;
  onSwitchEntry?: (entry: any) => void;
  entry: any;
}

const getStatusDisplay = (status: string, dateStr: string) => {
  const isPaid = status === 'PAID';
  const isCancelled = status === 'CANCELLED';
  const due = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const isOverdue = !isPaid && !isCancelled && due < today;
  
  if (isPaid) {
    return (
      <div className="flex items-center gap-2 text-emerald-600 font-medium">
        <CheckCircle2 className="h-4 w-4" />
        <span>Pago</span>
      </div>
    );
  }
  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground font-medium">
        <X className="h-4 w-4" />
        <span>Cancelado</span>
      </div>
    );
  }
  if (isOverdue) {
    return (
      <div className="flex items-center gap-2 text-red-600 font-medium">
        <AlertCircle className="h-4 w-4" />
        <span>Atrasado</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-blue-600 font-medium">
      <Clock className="h-4 w-4" />
      <span>A vencer</span>
    </div>
  );
};

export const PayableRecurrenceTab: React.FC<PayableRecurrenceTabProps> = ({ form, readOnly, onSwitchEntry, entry }) => {
  const {
    repeat, setRepeat,
    dueDate,
    weekendRule, setWeekendRule,
    recurrencePeriod, setRecurrencePeriod,
    repeatDay, setRepeatDay,
    recurrenceTimes, setRecurrenceTimes,
    handleSimulate,
    simulationList, setSimulationList,
    createdRecurrenceList,
    selectedRecurrenceId, setSelectedRecurrenceId,
    isDeletingRecurrences, setIsDeletingRecurrences,
    selectedRecurrencesToDelete, setSelectedRecurrencesToDelete,
    handleDeleteRecurrences,
    handleCreateRecurrences,
    customersQuery,
    categoriesQuery,
    bankAccountsQuery,
    customerId,
    category,
    documentId,
    entryNumber,
    bankAccountId,
  } = form;

  const [editingItem, setEditingItem] = useState<SimulationItem | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCustomerId, setEditCustomerId] = useState('');
  const [editDocumentId, setEditDocumentId] = useState('');
  const [editEntryNumber, setEditEntryNumber] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editBankAccountId, setEditBankAccountId] = useState('');

  const handleEditClick = (item: SimulationItem) => {
    setEditingItem(item);
    setEditAmount(item.customAmount ? String(item.customAmount) : String(item.valor));
    setEditDate(item.customDueDate ? item.customDueDate : item.vencimento);
    setEditCustomerId(item.customCustomerId ?? customerId);
    setEditDocumentId(item.customDocumentId ?? documentId);
    setEditEntryNumber(item.customEntryNumber ?? (entryNumber ? String(entryNumber).split(' ')[0] : ''));
    setEditCategoryId(item.customCategoryId ?? category);
    setEditBankAccountId(item.customBankAccountId ?? bankAccountId);
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;

    const newList = simulationList.map(item => {
      if (item.parcela === editingItem.parcela) {
        return {
          ...item,
          customAmount: parseFloat(editAmount),
          customDueDate: editDate,
          customCustomerId: editCustomerId,
          customDocumentId: editDocumentId,
          customEntryNumber: editEntryNumber,
          customCategoryId: editCategoryId,
          customBankAccountId: editBankAccountId,
          // Atualiza visualização também
          valor: parseFloat(editAmount),
          vencimento: editDate,
          previsao: editDate
        };
      }
      return item;
    });

    setSimulationList(newList);
    setEditingItem(null);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Edit Simulation Modal */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Alterar Conta</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* Row 1 */}
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-6 space-y-2">
                <Label>Favorecido / Fornecedor</Label>
                <Select value={editCustomerId} onValueChange={setEditCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customersQuery.data?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3 space-y-2">
                <Label>Vencimento</Label>
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
              </div>
              <div className="col-span-3 space-y-2">
                <Label>Valor da Conta</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                />
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-4 space-y-2">
                <Label>Número do Documento</Label>
                <Input
                  value={editEntryNumber}
                  onChange={(e) => setEditEntryNumber(e.target.value)}
                />
              </div>
              <div className="col-span-4 space-y-2">
                <Label>Número da Parcela</Label>
                <Input
                  value={editingItem?.parcela || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="col-span-4 space-y-2">
                <Label>Conta Corrente</Label>
                <Select value={editBankAccountId} onValueChange={setEditBankAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccountsQuery.data?.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-6 space-y-2">
                <Label>Categoria</Label>
                <Select value={editCategoryId} onValueChange={setEditCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesQuery.data?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
             <div className="flex justify-end w-full">
                <Button onClick={handleSaveEdit} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Salvar
                </Button>
             </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!repeat ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 min-h-[200px]">
          <div className="text-4xl font-light text-muted-foreground/50">=(</div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Ainda não foi informada nenhuma repetição para esta conta.
            </p>
            {!readOnly && (
            <p className="text-sm text-muted-foreground">
              <button 
                onClick={() => setRepeat(true)} 
                className="text-primary hover:underline font-medium focus:outline-none"
              >
                Clique aqui
              </button> para incluir repetições agora.
            </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {createdRecurrenceList.length === 0 && (
            <>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Selecione de que forma deseja gerar as repetições.
                </p>
                <p className="text-sm text-muted-foreground">
                  Elas são geradas a partir da seguinte data de vencimento: <strong>{dueDate ? format(new Date(dueDate + 'T00:00:00'), 'dd/MM/yyyy') : '-'}</strong>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                  <Label className="text-xs">Quanto aos sábados, domingos e feriados nacionais</Label>
                  <Select value={weekendRule} onValueChange={(v: any) => setWeekendRule(v)} disabled={!!readOnly}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KEEP">Manter a data de vencimento</SelectItem>
                      <SelectItem value="ANTICIPATE">Antecipar para o dia útil anterior</SelectItem>
                      <SelectItem value="POSTPONE">Postergar para o próximo dia útil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">Periodicidade</Label>
                  <Select value={recurrencePeriod} onValueChange={(v: any) => setRecurrencePeriod(v)} disabled={!!readOnly}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WEEKLY">Semanal</SelectItem>
                      <SelectItem value="MONTHLY">Mensal</SelectItem>
                      <SelectItem value="SEMIANNUAL">Semestral</SelectItem>
                      <SelectItem value="ANNUAL">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Repetir todo dia</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={repeatDay}
                    onChange={(e) => setRepeatDay(e.target.value)}
                    disabled={!!readOnly}
                  />
                </div>

                <div className="space-y-2 flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Por (meses/vezes)</Label>
                    <Input
                      type="number"
                      min="2"
                      max="999"
                      value={recurrenceTimes}
                      onChange={(e) => setRecurrenceTimes(e.target.value)}
                      disabled={!!readOnly}
                    />
                  </div>
                  <Button variant="outline" className="text-green-600 border-green-600 hover:bg-green-50" onClick={handleSimulate}>Simular</Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-sm text-muted-foreground">Simulação das Repetições (clique duas vezes na simulação para alterar)</Label>
                </div>
                
                <div className="border rounded-md">
                  <div className="grid grid-cols-5 gap-4 p-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                    <div>Situação</div>
                    <div>Parcela</div>
                    <div>Vencimento</div>
                    <div>Previsão</div>
                    <div>Valor da Conta</div>
                  </div>
                  
                  <div className="max-h-[300px] overflow-y-auto">
                    {simulationList.length === 0 ? (
                      <div className="p-8 text-center text-sm text-muted-foreground">
                        Nenhum registro encontrado
                      </div>
                    ) : (
                      simulationList.map((item, index) => (
                        <div 
                          key={index} 
                          className="grid grid-cols-5 gap-4 p-3 text-sm border-b last:border-0 hover:bg-muted/20 items-center cursor-pointer group relative"
                          onDoubleClick={() => handleEditClick(item)}
                        >
                          <div>{getStatusDisplay('PENDING', item.vencimento)}</div>
                          <div>{item.parcela}</div>
                          <div>{format(new Date(item.vencimento + 'T00:00:00'), 'dd/MM/yyyy')}</div>
                          <div>{format(new Date(item.previsao + 'T00:00:00'), 'dd/MM/yyyy')}</div>
                          <div className="flex items-center justify-between">
                            <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}</span>
                            <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {createdRecurrenceList.length === 0 ? (
            <div className="flex justify-end pt-4">
               <Button 
                 className="bg-[#66C025] hover:bg-[#59A821] text-white"
                 onClick={handleCreateRecurrences}
               >
                 Confirmar
               </Button>
            </div>
          ) : (
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-sm text-muted-foreground">
                    {isDeletingRecurrences ? 'Selecione as Parcelas que deseja excluir' : 'Registros gerados'}
                  </Label>
                </div>
                <div className="border rounded-md">
                  <div className={cn(
                    "grid gap-4 p-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b",
                    isDeletingRecurrences ? "grid-cols-[auto_1fr_1fr_1fr_1fr_1fr]" : "grid-cols-5"
                  )}>
                    {isDeletingRecurrences && <div className="w-4"></div>}
                    <div>Situação</div>
                    <div>Parcela</div>
                    <div>Vencimento</div>
                    <div>Previsão</div>
                    <div>Valor da Conta</div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {createdRecurrenceList.map((item, index) => (
                      <div 
                        key={item.id} 
                        className={cn(
                          "grid gap-4 p-3 text-sm border-b last:border-0 items-center transition-colors",
                          (isDeletingRecurrences && item.status === 'PAID') ? "opacity-60 cursor-not-allowed" : "hover:bg-muted/20 cursor-pointer",
                          isDeletingRecurrences ? "grid-cols-[auto_1fr_1fr_1fr_1fr_1fr]" : "grid-cols-5",
                          !isDeletingRecurrences && item.id === entry?.id && "bg-purple-50/80 hover:bg-purple-100/50 border-l-2 border-l-purple-500",
                          !isDeletingRecurrences && selectedRecurrenceId === item.id && item.id !== entry?.id && "bg-muted/50"
                        )}
                        onClick={() => {
                          if (isDeletingRecurrences) {
                            if (item.status === 'PAID') return;
                            const newSet = new Set(selectedRecurrencesToDelete);
                            if (newSet.has(item.id)) {
                              newSet.delete(item.id);
                            } else {
                              newSet.add(item.id);
                            }
                            setSelectedRecurrencesToDelete(newSet);
                          } else {
                            setSelectedRecurrenceId(item.id);
                          }
                        }}
                        onDoubleClick={() => !isDeletingRecurrences && onSwitchEntry?.(item)}
                      >
                        {isDeletingRecurrences && (
                          <Checkbox 
                            checked={selectedRecurrencesToDelete.has(item.id)}
                            disabled={item.status === 'PAID'}
                            onCheckedChange={() => { /* Handled by div click */ }}
                            className="mr-2"
                          />
                        )}
                        <div>{getStatusDisplay(item.status, item.due_date)}</div>
                        <div>{item.installments || `${String(index + 1).padStart(3,'0')}/${String(createdRecurrenceList.length).padStart(3,'0')}`}</div>
                        <div>{format(new Date(item.due_date + 'T00:00:00'), 'dd/MM/yyyy')}</div>
                        <div>{format(new Date(item.due_date + 'T00:00:00'), 'dd/MM/yyyy')}</div>
                        <div>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.net_amount || 0)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {!isDeletingRecurrences && selectedRecurrenceId && (() => {
                  const selectedItem = createdRecurrenceList.find(i => i.id === selectedRecurrenceId);
                  if (!selectedItem) return null;
                  return (
                    <div className="mt-4 flex justify-between items-center animate-in fade-in slide-in-from-top-2 duration-200">
                      <Button 
                        variant="link" 
                        className="text-[#b49126] hover:text-[#91751f] p-0 h-auto font-normal text-base flex items-center gap-2 no-underline hover:underline"
                        onClick={() => onSwitchEntry?.(selectedItem)}
                      >
                        Ir para parcela {selectedItem.installments}
                        <LinkIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })()}

                <div className="flex justify-end pt-4">
                   {isDeletingRecurrences ? (
                     <div className="flex gap-2">
                       <Button variant="ghost" onClick={() => {
                         setIsDeletingRecurrences(false);
                         setSelectedRecurrencesToDelete(new Set());
                       }}>
                         Cancelar
                       </Button>
                       <Button 
                         className="bg-red-600 hover:bg-red-700 text-white"
                         onClick={handleDeleteRecurrences}
                         disabled={selectedRecurrencesToDelete.size === 0}
                       >
                         <Trash className="w-4 h-4 mr-2" />
                         Excluir parcelas selecionadas
                       </Button>
                     </div>
                   ) : (
                     <Button 
                       className="bg-red-600 hover:bg-red-700 text-white"
                       onClick={() => setIsDeletingRecurrences(true)}
                     >
                       <Trash className="w-4 h-4 mr-2" />
                       Excluir Parcelas
                     </Button>
                   )}
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
};
