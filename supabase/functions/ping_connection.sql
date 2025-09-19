-- Função para verificar a conexão com o banco de dados
-- Retorna uma mensagem simples, apenas para confirmar que a conexão está ativa

CREATE OR REPLACE FUNCTION public.ping_connection()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Apenas retorna um objeto JSON simples para confirmar que a conexão está funcionando
  RETURN json_build_object(
    'status', 'ok',
    'timestamp', extract(epoch from now())
  );
END;
$$;
