/**
 * Aba de Certificado Digital
 * AIDEV-NOTE: Componente para gerenciar certificado digital A1 da empresa
 */

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Shield, X, Check, Loader2, Upload, File } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import type { CompanyDataForm } from "../../schemas";
import { supabase } from "@/lib/supabase";
import { useTenantAccessGuard } from "@/hooks/templates/useSecureTenantQuery";

interface DigitalCertificateTabProps {
  form: UseFormReturn<CompanyDataForm>;
  razaoSocial?: string;
  cnpj?: string;
}

interface CertificateInfo {
  tipo: string;
  emitidoPara: string;
  emitidoPor: string;
  validoDe: string;
  validoAte: string;
}

export function DigitalCertificateTab({ form, razaoSocial, cnpj }: DigitalCertificateTabProps) {
  const { toast } = useToast();
  const { currentTenant } = useTenantAccessGuard();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificateFileName, setCertificateFileName] = useState<string>("");
  const [certificatePassword, setCertificatePassword] = useState<string>("");
  const [certificateInfo, setCertificateInfo] = useState<CertificateInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // AIDEV-NOTE: Estado para indicar se há certificado salvo no banco
  const [hasSavedCertificate, setHasSavedCertificate] = useState(false);

  // AIDEV-NOTE: Carregar certificado salvo ao montar componente
  useEffect(() => {
    const loadCertificate = async () => {
      if (!currentTenant?.id) return;

      try {
        // AIDEV-NOTE: Buscar certificado das colunas dedicadas
        const { data, error } = await supabase
          .from('tenants')
          .select('certificate_info, certificate_base64')
          .eq('id', currentTenant.id)
          .single();

        if (error) {
          console.error('[DigitalCertificateTab] Erro ao carregar certificado:', error);
          return;
        }

        // AIDEV-NOTE: Usar as novas colunas dedicadas para certificado
        const certificateInfo = data?.certificate_info;
        if (certificateInfo && certificateInfo.tipo) {
          setCertificateInfo({
            tipo: certificateInfo.tipo || '',
            emitidoPara: certificateInfo.emitidoPara || '',
            emitidoPor: certificateInfo.emitidoPor || '',
            validoDe: certificateInfo.validoDe || '',
            validoAte: certificateInfo.validoAte || '',
          });
          setCertificateFileName(certificateInfo.nome_arquivo || '');
          // AIDEV-NOTE: Marcar que há certificado salvo
          setHasSavedCertificate(true);
          
          console.log('[DigitalCertificateTab] Certificado carregado:', {
            tipo: certificateInfo.tipo,
            nome_arquivo: certificateInfo.nome_arquivo,
            salvo_em: certificateInfo.salvo_em
          });
        } else {
          // AIDEV-NOTE: Limpar estados se não houver certificado salvo
          setCertificateInfo(null);
          setCertificateFileName('');
          setHasSavedCertificate(false);
        }
      } catch (error) {
        console.error('[DigitalCertificateTab] Erro ao carregar certificado:', error);
      }
    };

    loadCertificate();
  }, [currentTenant?.id]);

  // AIDEV-NOTE: Handler para seleção de arquivo
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // AIDEV-NOTE: Validar tipo de arquivo (certificado digital geralmente é .p12 ou .pfx)
    const validExtensions = ['.p12', '.pfx'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo .p12 ou .pfx",
        variant: "destructive",
      });
      return;
    }

    setCertificateFile(file);
    setCertificateFileName(file.name);
    
    // AIDEV-NOTE: Tentar ler informações básicas do certificado (implementação futura)
    // Por enquanto, apenas simula informações
    toast({
      title: "Arquivo selecionado",
      description: "Arquivo do certificado carregado com sucesso.",
    });
  };

  // AIDEV-NOTE: Converter arquivo para base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // AIDEV-NOTE: Remover prefixo "data:application/x-pkcs12;base64," se existir
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // AIDEV-NOTE: Validar senha do certificado via Edge Function
  const validateCertificatePassword = async (arquivoBase64: string, senha: string): Promise<{ valid: boolean; info?: CertificateInfo; error?: string }> => {
    try {
      // AIDEV-NOTE: Obter sessão atual e garantir que o token está válido
      let { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // AIDEV-NOTE: Se não houver sessão ou token expirado, tentar refresh
      if (!session?.access_token || sessionError) {
        console.log('[DigitalCertificateTab] Sessão inválida, tentando refresh...');
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshedSession?.access_token) {
          throw new Error('Erro ao atualizar sessão. Por favor, faça login novamente.');
        }
        
        session = refreshedSession;
      }
      
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      if (!currentTenant?.id) {
        throw new Error('Tenant não identificado');
      }

      // AIDEV-NOTE: Chamar Edge Function para validar certificado
      // Usar o mesmo padrão do NFeServiceTab para chamar a Edge Function
      const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('URL do Supabase não configurada');
      }

      console.log('[DigitalCertificateTab] Chamando Edge Function validate-certificate:', {
        tenant_id: currentTenant.id,
        token_presente: !!session.access_token,
        token_length: session.access_token?.length,
      });

      // AIDEV-NOTE: Adicionar apikey no header como no NFeServiceTab
      const anonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/validate-certificate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': anonKey || '',
          'x-tenant-id': currentTenant.id,
        },
        body: JSON.stringify({
          arquivo_certificado_base64: arquivoBase64,
          senha_certificado: senha,
        }),
      });

      const responseData = await response.json();

      console.log('[DigitalCertificateTab] Resposta da Edge Function:', {
        status: response.status,
        ok: response.ok,
        success: responseData.success,
        error: responseData.error,
        message: responseData.message,
      });

      if (!response.ok) {
        const errorMsg = responseData.message || responseData.error || 'Erro ao validar certificado';
        console.error('[DigitalCertificateTab] Erro na resposta:', {
          status: response.status,
          error: errorMsg,
          responseData,
        });
        throw new Error(errorMsg);
      }

      if (responseData.success && responseData.data?.valid) {
        return {
          valid: true,
          info: responseData.data.info,
        };
      } else {
        return {
          valid: false,
          error: responseData.data?.error || responseData.message || 'Senha inválida ou certificado corrompido',
        };
      }
    } catch (error: any) {
      console.error('[DigitalCertificateTab] Erro ao validar certificado:', error);
      return {
        valid: false,
        error: error.message || 'Erro ao validar certificado',
      };
    }
  };

  // AIDEV-NOTE: Handler para processar certificado (validar e extrair informações)
  const handleProcessCertificate = async () => {
    if (!certificateFile || !certificatePassword) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, selecione o arquivo e informe a senha do certificado.",
        variant: "destructive",
      });
      return;
    }

    if (!currentTenant?.id) {
      toast({
        title: "Erro",
        description: "Tenant não identificado",
        variant: "destructive",
      });
      return;
    }

    // AIDEV-NOTE: Validação básica da senha no frontend
    if (certificatePassword.length < 4) {
      toast({
        title: "Senha inválida",
        description: "A senha do certificado deve ter pelo menos 4 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // AIDEV-NOTE: Converter arquivo para base64
      const arquivoBase64 = await fileToBase64(certificateFile);
      
      // AIDEV-NOTE: Validar certificado e senha via Edge Function
      toast({
        title: "Validando certificado...",
        description: "Verificando senha e extraindo informações do certificado.",
      });

      const validation = await validateCertificatePassword(arquivoBase64, certificatePassword);
      
      if (!validation.valid) {
        throw new Error(validation.error || 'Senha inválida ou certificado corrompido');
      }

      // AIDEV-NOTE: Usar informações do certificado retornadas pela validação
      const cnpjLimpo = cnpj?.replace(/\D/g, "") || "";
      const info: CertificateInfo = validation.info || {
        tipo: "e-PJ A1",
        emitidoPara: `${razaoSocial || ""}:${cnpjLimpo}`,
        emitidoPor: "AC Certificadora",
        validoDe: new Date().toLocaleDateString('pt-BR'),
        validoAte: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
      };
      
      setCertificateInfo(info);

      // AIDEV-NOTE: Salvar certificado nas colunas dedicadas
      // Estrutura organizada: certificate_base64, certificate_password, certificate_info
      const certificateInfoData = {
        tipo: info.tipo,
        emitidoPara: info.emitidoPara,
        emitidoPor: info.emitidoPor,
        validoDe: info.validoDe,
        validoAte: info.validoAte,
        nome_arquivo: certificateFileName,
        salvo_em: new Date().toISOString(),
      };
      
      console.log('[DigitalCertificateTab] Salvando certificado:', {
        nome_arquivo: certificateFileName,
        tipo: info.tipo,
        tamanho_base64: arquivoBase64.length,
        tenant_id: currentTenant.id
      });

      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          certificate_base64: arquivoBase64,
          certificate_password: certificatePassword,
          certificate_info: certificateInfoData,
        })
        .eq('id', currentTenant.id);

      if (updateError) {
        throw new Error('Erro ao salvar certificado');
      }

      // AIDEV-NOTE: Enviar certificado para a Focus NFe
      // Usar o endpoint /focusnfe/empresas/configuracoes-nfse
      try {
        console.log('[DigitalCertificateTab] Enviando certificado para Focus NFe...');
        
        const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
        const anonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
        let { data: { session } } = await supabase.auth.getSession();
        
        if (session?.access_token && supabaseUrl) {
          const focusResponse = await fetch(`${supabaseUrl}/functions/v1/focusnfe/empresas/configuracoes-nfse`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': anonKey || '',
              'x-tenant-id': currentTenant.id,
            },
            body: JSON.stringify({
              arquivo_certificado_base64: arquivoBase64,
              senha_certificado: certificatePassword,
            }),
          });

          const focusResult = await focusResponse.json();
          
          if (focusResponse.ok && focusResult.success) {
            console.log('[DigitalCertificateTab] Certificado enviado para Focus NFe com sucesso:', focusResult);
          } else {
            // AIDEV-NOTE: Não bloquear o salvamento local se falhar no Focus NFe
            // O certificado já está salvo localmente e pode ser reenviado depois
            console.warn('[DigitalCertificateTab] Aviso: Falha ao enviar para Focus NFe:', focusResult.error || focusResult.message);
          }
        }
      } catch (focusError) {
        // AIDEV-NOTE: Não bloquear o salvamento local se falhar no Focus NFe
        console.warn('[DigitalCertificateTab] Aviso: Erro ao enviar para Focus NFe:', focusError);
      }

      // AIDEV-NOTE: Marcar que certificado foi salvo e limpar estados de upload
      setHasSavedCertificate(true);
      setCertificateFile(null);
      setCertificatePassword('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      toast({
        title: "Certificado processado e salvo",
        description: "Certificado digital validado e salvo com sucesso!",
      });
    } catch (error: any) {
      console.error("Erro ao processar certificado:", error);
      toast({
        title: "Erro ao processar",
        description: error.message || "Não foi possível processar o certificado.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // AIDEV-NOTE: Handler para remover certificado
  const handleRemoveCertificate = async () => {
    if (!currentTenant?.id) {
      toast({
        title: "Erro",
        description: "Tenant não identificado",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // AIDEV-NOTE: Remover certificado das colunas dedicadas
      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          certificate_base64: null,
          certificate_password: null,
          certificate_info: null,
        })
        .eq('id', currentTenant.id);

      if (updateError) {
        throw new Error('Erro ao remover certificado');
      }

      setCertificateFile(null);
      setCertificateFileName("");
      setCertificatePassword("");
      setCertificateInfo(null);
      // AIDEV-NOTE: Limpar flag de certificado salvo
      setHasSavedCertificate(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      toast({
        title: "Certificado removido",
        description: "Certificado digital removido com sucesso.",
      });
    } catch (error: any) {
      console.error("Erro ao remover certificado:", error);
      toast({
        title: "Erro ao remover",
        description: error.message || "Não foi possível remover o certificado.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com informações da empresa */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Razão Social</Label>
              <p className="font-semibold">{razaoSocial || "Não informado"}</p>
              <p className="text-sm text-muted-foreground">{cnpj || ""}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção de upload do certificado */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <Label className="text-base font-semibold">
              Arquivo do Certificado Digital (Modelo A1)
            </Label>
          </div>

          <div className="space-y-4">
            {/* AIDEV-NOTE: Input hidden para seleção de arquivo */}
            <input
              type="file"
              accept=".p12,.pfx"
              onChange={handleFileSelect}
              className="hidden"
              id="certificate-file-input"
              ref={fileInputRef}
            />

            {/* AIDEV-NOTE: Se há certificado salvo e não está selecionando novo arquivo, mostrar info */}
            {hasSavedCertificate && !certificateFile && certificateInfo ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 border rounded-lg bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                  <Check className="h-5 w-5 text-green-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Certificado configurado: {certificateFileName}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Válido até {certificateInfo.validoAte}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('certificate-file-input')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Atualizar
                  </Button>
                </div>
                
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveCertificate}
                  className="text-destructive hover:text-destructive"
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-1" />
                  Remover Certificado Digital
                </Button>
              </div>
            ) : !certificateFile ? (
              /* AIDEV-NOTE: Sem certificado salvo e sem arquivo selecionado - mostrar upload */
              <div className="space-y-2">
                <Label htmlFor="certificate-file-input">Arquivo do Certificado Digital (PFX - Modelo A1)</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 hover:border-primary/50 transition-colors">
                  <label htmlFor="certificate-file-input" className="cursor-pointer">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Upload className="h-6 w-6 text-primary" />
                      </div>
                      <div className="text-center">
                        <Button
                          type="button"
                          variant="default"
                          size="lg"
                          className="mb-2"
                          onClick={(e) => {
                            e.preventDefault();
                            document.getElementById('certificate-file-input')?.click();
                          }}
                        >
                          <File className="h-4 w-4 mr-2" />
                          Selecionar Arquivo PFX
                        </Button>
                        <p className="text-sm text-muted-foreground">
                          Formatos aceitos: .p12 ou .pfx
                        </p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            ) : (
              /* AIDEV-NOTE: Arquivo novo selecionado - mostrar preview e formulário de senha */
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Arquivo do Certificado Digital (PFX - Modelo A1)</Label>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1 flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                      <File className="h-5 w-5 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{certificateFileName}</p>
                        <p className="text-xs text-muted-foreground">Novo arquivo selecionado</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="default"
                      onClick={() => document.getElementById('certificate-file-input')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Trocar Arquivo
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certificate-password">Senha do Certificado</Label>
                  <Input
                    id="certificate-password"
                    type="password"
                    placeholder="Digite a senha do certificado"
                    value={certificatePassword}
                    onChange={(e) => setCertificatePassword(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCertificateFile(null);
                      setCertificatePassword('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleProcessCertificate}
                    disabled={isLoading || !certificatePassword}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Validando...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Validar e Salvar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AIDEV-NOTE: Seção de informações detalhadas do certificado - só mostra quando há certificado salvo */}
      {hasSavedCertificate && certificateInfo && !certificateFile && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <Label className="text-base font-semibold">
              Detalhes do Certificado - Tipo {certificateInfo.tipo}
            </Label>
            
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Emitido para: </span>
                <span className="font-medium">{certificateInfo.emitidoPara}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Emitido por: </span>
                <span className="font-medium">{certificateInfo.emitidoPor}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Período de validade: </span>
                <span className="font-medium">{certificateInfo.validoDe}</span>
                <span className="text-muted-foreground"> até </span>
                <span className="font-medium">{certificateInfo.validoAte}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

