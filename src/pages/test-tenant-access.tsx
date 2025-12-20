/**
 * AIDEV-NOTE: Página para testar a correção do método hasAccess
 * 
 * Esta página permite executar o teste de validação do método hasAccess
 * e visualizar os resultados em tempo real.
 */

import React, { useState, useEffect } from 'react';
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { runTest } from '@/tests/tenant-access-test';

export default function TestTenantAccess() {
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Capturar logs do console
  useEffect(() => {
    const originalConsole = { ...console };
    const capturedLogs: string[] = [];

    console.log = (...args: any[]) => {
      const message = args.join(' ');
      capturedLogs.push(message);
      setLogs(prev => [...prev, message]);
      originalConsole.log(...args);
    };

    console.warn = (...args: any[]) => {
      const message = `⚠️ ${args.join(' ')}`;
      capturedLogs.push(message);
      setLogs(prev => [...prev, message]);
      originalConsole.warn(...args);
    };

    console.error = (...args: any[]) => {
      const message = `🔴 ${args.join(' ')}`;
      capturedLogs.push(message);
      setLogs(prev => [...prev, message]);
      originalConsole.error(...args);
    };

    return () => {
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
    };
  }, []);

  const handleRunTest = async () => {
    setIsRunning(true);
    setLogs([]);
    setTestResult(null);

    try {
      const result = await runTest();
      setTestResult(result);
    } catch (error) {
      console.error('Erro ao executar teste:', error);
      setTestResult(false);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Teste de Validação do Método hasAccess</CardTitle>
            <CardDescription>
              Este teste verifica se o método hasAccess do useTenantManager funciona corretamente mesmo quando o TenantManager falha na inicialização.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-6">
              {testResult !== null && (
                <Alert className={testResult ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <AlertTitle className="flex items-center">
                      {testResult ? (
                        <span className="text-green-600 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Teste Passou
                        </span>
                      ) : (
                        <span className="text-red-600 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          Teste Falhou
                        </span>
                      )}
                    </AlertTitle>
                    <AlertDescription>
                      {testResult 
                        ? "O método hasAccess está funcionando corretamente, mesmo quando o TenantManager falha na inicialização."
                        : "O método hasAccess não está funcionando como esperado. Verifique os logs para mais detalhes."}
                    </AlertDescription>
                  </motion.div>
                </Alert>
              )}
              
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="text-lg font-medium mb-2 flex items-center justify-between">
                  <span>Logs de Execução</span>
                  <Badge variant={isRunning ? "outline" : "secondary"} className="animate-pulse">
                    {isRunning ? "Executando..." : "Pronto"}
                  </Badge>
                </h3>
                <div className="bg-black text-green-400 font-mono text-sm p-4 rounded h-80 overflow-y-auto">
                  {logs.length === 0 ? (
                    <p className="text-gray-500 italic">Execute o teste para ver os logs...</p>
                  ) : (
                    logs.map((log, index) => (
                      <motion.div 
                        key={index}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="mb-1"
                      >
                        <span className="text-gray-500 mr-2">[{index + 1}]</span>
                        <span>{log}</span>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-end space-x-4">
            <Button 
              onClick={handleRunTest} 
              disabled={isRunning}
              className="relative overflow-hidden"
            >
              <span className="relative z-10">
                {isRunning ? "Executando..." : "Executar Teste"}
              </span>
              {isRunning && (
                <motion.div 
                  className="absolute inset-0 bg-primary/20"
                  animate={{ x: ["0%", "100%"] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                />
              )}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
      
      <div id="run-test" style={{ display: 'none' }}></div>
      <div id="test-result" style={{ display: 'none' }}></div>
    </div>
  );
}
