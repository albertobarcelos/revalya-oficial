import React from 'react';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Sparkles, Hash, FileText } from 'lucide-react';
import { useCreatePayableLogic } from '../useCreatePayableLogic';

interface CreatePayableRecurrenceTabProps {
  form: ReturnType<typeof useCreatePayableLogic>;
}

export const CreatePayableRecurrenceTab: React.FC<CreatePayableRecurrenceTabProps> = ({ form }) => {
  const {
    repeat, setRepeat,
    createdRecurrenceList,
    dueDate,
    weekendRule, setWeekendRule,
    recurrencePeriod, setRecurrencePeriod,
    repeatDay, setRepeatDay,
    recurrenceTimes, setRecurrenceTimes,
    handleSimulate,
    simulationList,
    handleConfirmGenerate
  } = form;

  return (
    <div className="space-y-6 h-full flex flex-col">
      {!repeat ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 min-h-[200px]">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-2">
            <Hash className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="font-medium text-lg">Sem repetições definidas</h3>
            <p className="text-sm text-muted-foreground">
              Ainda não foi informada nenhuma repetição para esta conta.
            </p>
            <div className="pt-4">
              <Button 
                onClick={() => setRepeat(true)} 
                variant="outline"
                className="gap-2"
              >
                <Sparkles className="h-4 w-4 text-yellow-500" />
                Configurar repetições
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {createdRecurrenceList.length === 0 && (
            <>
              <div className="space-y-2 p-4 bg-muted/30 rounded-lg border">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Configuração de Recorrência
                </h4>
                <p className="text-sm text-muted-foreground">
                  As repetições serão geradas a partir da data de vencimento: <strong>{dueDate ? format(new Date(dueDate + 'T00:00:00'), 'dd/MM/yyyy') : '-'}</strong>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                  <Label className="text-xs">Sábados, domingos e feriados</Label>
                  <Select value={weekendRule} onValueChange={(v: any) => setWeekendRule(v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KEEP">Manter a data de vencimento</SelectItem>
                      <SelectItem value="ANTICIPATE">Antecipar para o dia útil anterior</SelectItem>
                      <SelectItem value="POSTPONE">Postergar para o próximo dia útil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">Periodicidade</Label>
                  <Select value={recurrencePeriod} onValueChange={(v: any) => setRecurrencePeriod(v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
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
                    min={1}
                    max={31}
                    value={repeatDay}
                    onChange={(e) => setRepeatDay(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="space-y-2 flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Por (meses/vezes)</Label>
                    <Input
                      type="number"
                      min={2}
                      max={999}
                      value={recurrenceTimes}
                      onChange={(e) => setRecurrenceTimes(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <Button variant="outline" className="h-9 text-primary border-primary hover:bg-primary/10" onClick={handleSimulate}>Simular</Button>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-medium">Simulação das Repetições</Label>
                  <span className="text-xs text-muted-foreground">Clique duas vezes na simulação para alterar</span>
                </div>
                
                <div className="border rounded-md overflow-hidden">
                  <div className="grid grid-cols-5 gap-4 p-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                    <div>Situação</div>
                    <div>Parcela</div>
                    <div>Vencimento</div>
                    <div>Previsão</div>
                    <div>Valor da Conta</div>
                  </div>
                  
                  <div className="max-h-[250px] overflow-y-auto">
                    {simulationList.length === 0 ? (
                      <div className="p-8 text-center text-sm text-muted-foreground">
                        Nenhum registro encontrado. Clique em "Simular" para visualizar.
                      </div>
                    ) : (
                      simulationList.map((item, index) => (
                        <div key={index} className="grid grid-cols-5 gap-4 p-3 text-sm border-b last:border-0 hover:bg-muted/20 transition-colors">
                          <div>{item.situacao}</div>
                          <div>{item.parcela}</div>
                          <div>{format(new Date(item.vencimento + 'T00:00:00'), 'dd/MM/yyyy')}</div>
                          <div>{format(new Date(item.previsao + 'T00:00:00'), 'dd/MM/yyyy')}</div>
                          <div>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {createdRecurrenceList.length === 0 ? (
            <div className="flex justify-end pt-4 border-t mt-auto">
              <Button 
                className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[140px]"
                onClick={handleConfirmGenerate}
                disabled={simulationList.length === 0}
              >
                Confirmar e Gerar
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Registros gerados com sucesso
                </Label>
              </div>
              <div className="border rounded-md overflow-hidden">
                <div className="grid grid-cols-5 gap-4 p-3 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                  <div>Situação</div>
                  <div>Parcela</div>
                  <div>Vencimento</div>
                  <div>Previsão</div>
                  <div>Valor da Conta</div>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {createdRecurrenceList.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-5 gap-4 p-3 text-sm border-b last:border-0 hover:bg-muted/20">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${item.status === 'PAID' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                        {item.status === 'PENDING' ? 'Pendente' : item.status}
                      </div>
                      <div>{item.installments || `${String(index + 1).padStart(3,'0')}/${String(createdRecurrenceList.length).padStart(3,'0')}`}</div>
                      <div>{format(new Date(item.due_date + 'T00:00:00'), 'dd/MM/yyyy')}</div>
                      <div>{format(new Date(item.due_date + 'T00:00:00'), 'dd/MM/yyyy')}</div>
                      <div>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.net_amount || 0)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
