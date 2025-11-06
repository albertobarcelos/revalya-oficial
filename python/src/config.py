import os
from dotenv import load_dotenv
from supabase import create_client, Client


def get_supabase_client() -> Client:
    """
    Cria um cliente Supabase priorizando a chave de serviço (SUPABASE_SERVICE_KEY) se disponível,
    caso contrário usa SUPABASE_KEY (anon/publishable). Escrita em tabelas protegidas por RLS
    normalmente requer a service role.
    """
    load_dotenv()
    url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_KEY")
    key = service_key or os.environ.get("SUPABASE_KEY")
    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL e SUPABASE_SERVICE_KEY/SUPABASE_KEY devem estar definidos no .env"
        )
    return create_client(url, key)