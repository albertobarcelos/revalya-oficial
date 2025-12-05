# Relatório de Integração — API Assinafy (v1)

> Documento de análise e planejamento para integração com a API Assinafy. Este material consolida requisitos, endpoints, modelos de dados, segurança, fluxo operacional, plano por fases e recomendações de testes.

- Base URL: `https://api.assinafy.com.br/v1`
- Linguagem e exemplos: Português (Brasil), exemplos em `curl` e JSON
- Referências públicas: [Assinafy — Página da API](https://www.assinafy.com.br/api), [Assinafy — Site](https://www.assinafy.com.br/)  
- Observação: Algumas seções inferem detalhes a partir de padrões REST e dos tópicos oficiais da documentação (`quick-start`, `basics`, `authentication`, `signer`, `document`, `template`, `template-role`, `list-assignment-types`, `field-definition`, `authorization`, `workspace`, `webhooks`). Devem ser validadas contra a documentação oficial no momento da implementação.

---

## 1. Resumo Executivo

- A API é orientada a recursos como `signer`, `document`, `template`, `template-role`, `field-definition`, `workspace` e `webhooks`.
- Autenticação com `API Key` via cabeçalho de autorização. Não há indicação de fluxo OAuth no material público; integração típica é chave → cabeçalho → chamadas aos endpoints.  
  Fonte pública: Assinafy indica uso direto de API Key e endpoints para começar ([assinafy.com.br/api](https://www.assinafy.com.br/api)).
- Foco funcional: criação de documentos, cadastro de signatários, definição de campos de assinatura, uso de templates e acompanhamento via webhooks.
- Multi-tenant: conceito de `workspace` sugere segregação lógica por ambiente/cliente. Recomenda-se enviar contexto de workspace em cada requisição quando aplicável.
- Segurança: armazenar a chave em variáveis de ambiente; validar webhooks com assinatura/HMAC; tratar LGPD; aplicar controle de acesso por tenant.
- Operação: observar rate limits (não divulgados publicamente); implementar retentativas com backoff e circuit breaker; idempotência para operações POST.

---

## 2. Diagrama de Fluxo — Integração Básica

```
[App Revalya]                                  [Assinafy API]
     |                                                |
     | 1) Autentica com API Key                       |
     |----------------------------------------------->|
     |                                                |
     | 2) (Opcional) Seleciona Workspace             |
     |----------------------------------------------->|
     |                                                |
     | 3) Cria/associa Signers (pessoas que assinam) |
     |----------------------------------------------->|
     |                                                |
     | 4) Cria Documento (PDF/arquivo via URL)       |
     |----------------------------------------------->|
     |                                                |
     | 5) Define Campos (assinatura, data, texto)     |
     |----------------------------------------------->|
     |                                                |
     | 6) Envia para assinatura                       |
     |----------------------------------------------->|
     |                                                |
     | 7) Recebe Webhooks (eventos)                   |
     |<-----------------------------------------------|
     |                                                |
     | 8) Consulta status / baixa PDF assinado        |
     |----------------------------------------------->|
```

---

## 3. Endpoints Prioritários

> Nomes dos recursos conforme capítulos dos docs. Os caminhos HTTP exatos devem ser confirmados na documentação oficial. Estrutura sugerida por padrões REST.

- Autenticação
  - `GET /v1/auth/me` (validar chave atual, obter contexto)
- Workspace
  - `GET /v1/workspaces` (listar)
  - `GET /v1/workspaces/{id}` (detalhar)
- Signer
  - `POST /v1/signers` (criar)
  - `GET /v1/signers/{id}` (detalhar)
  - `PATCH /v1/signers/{id}` (atualizar)
- Document
  - `POST /v1/documents` (criar documento a partir de arquivo/URL/template)
  - `GET /v1/documents/{id}` (status/detalhes)
  - `POST /v1/documents/{id}/send` (enviar para assinatura)
  - `GET /v1/documents/{id}/download` (PDF assinado/audit trail)
- Template
  - `POST /v1/templates` (criar)
  - `GET /v1/templates/{id}` (detalhar)
  - `POST /v1/templates/{id}/instantiate` (gerar documento)
- Template Role
  - `GET /v1/templates/{id}/roles` (listar papéis do template)
- Assignment Types (tipos de atribuição)
  - `GET /v1/assignment-types` (listar)
- Field Definition
  - `POST /v1/documents/{id}/fields` (definir campos)
  - `GET /v1/documents/{id}/fields` (listar)
- Authorization
  - `GET /v1/authorization/permissions` (listar permissões/cargos)
- Webhooks
  - `POST /v1/webhooks` (registrar endpoint)
  - `GET /v1/webhooks` (listar)

---

## 4. Autenticação e Autorização

- Tipo: `API Key`
  - Cabeçalho típico: `Authorization: Bearer <API_KEY>` ou cabeçalho proprietário (ex.: `X-API-Key`). Confirmar nos docs.
  - Não há menção pública a OAuth2/PKCE; supõe-se chave estática por conta/workspace.
- Escopo / Workspace
  - Em plataformas multi-tenant, algumas operações exigem especificar workspace (ex.: `X-Workspace-Id` ou parâmetro `workspace_id`). Confirmar no capítulo `workspace`.
- Boas práticas
  - Armazenar a chave em `.env` e no gerenciador de segredos.
  - Rotacionar credenciais periodicamente; usar permissões mínimas necessárias.
  - Evitar expor a chave no frontend; use backend/edge functions para mediar chamadas.
  - Implementar `idempotency-key` (cabeçalho) para POST críticos.

Exemplo de chamada autenticada (ilustrativo):

```bash
curl -X GET "https://api.assinafy.com.br/v1/workspaces" \
  -H "Authorization: Bearer ${ASSINAFY_API_KEY}" \
  -H "Accept: application/json"
```

---

## 5. Modelos de Dados e Estruturas

> Estruturas típicas; confirmar campos obrigatórios nas páginas `signer`, `document`, `template` e `field-definition`.

- Signer (exemplo plausible)
```json
{
  "id": "signer_123",
  "name": "Fulano de Tal",
  "email": "fulano@example.com",
  "phone": "+55 11 99999-0000",
  "document": {
    "type": "CPF",
    "value": "00000000000"
  },
  "metadata": { "tenant_id": "..." }
}
```

- Document (exemplo plausible)
```json
{
  "id": "doc_123",
  "name": "Contrato de Prestação de Serviços",
  "file_url": "https://.../contrato.pdf",
  "status": "draft|sent|signed|canceled",
  "signers": [
    { "signer_id": "signer_123", "role": "SIGNER" }
  ],
  "fields": [
    {
      "type": "signature",
      "page": 1,
      "x": 120,
      "y": 540,
      "width": 180,
      "height": 60,
      "assigned_to": "signer_123"
    }
  ],
  "metadata": { "order_id": "..." }
}
```

- Template (exemplo plausible)
```json
{
  "id": "tpl_123",
  "name": "Contrato Padrão",
  "roles": ["SIGNER", "APPROVER"],
  "fields": [ /* definições por papel */ ]
}
```

- Field Definition (exemplo plausible)
```json
{
  "type": "text|signature|initials|date|checkbox",
  "page": 1,
  "x": 100,
  "y": 200,
  "width": 300,
  "height": 20,
  "assigned_to": "role_or_signer_id",
  "required": true,
  "placeholder": "..."
}
```

---

## 6. Limitações de Taxa (Rate Limits) e Quotas

- Quotas: Comunicação pública destaca gratuidade até 100 documentos/mês. Não há custo por requisição; contudo, podem existir limites de proteção contra abuso.  
  Referência pública: [assinafy.com.br/api](https://www.assinafy.com.br/api)
- Rate limits: Não publicados abertamente. Recomenda-se:
  - Detectar `HTTP 429 Too Many Requests`; implementar backoff exponencial (ex.: 1s, 2s, 4s, máx. 30s) e jitter.
  - Circuit breaker para serviços downstream.
  - Telemetria de chamadas e alertas.

---

## 7. Tratamento de Erros

- Padrões HTTP
  - `400` Validação de entrada
  - `401/403` Autenticação/autorização inválidas
  - `404` Recurso inexistente
  - `409` Estado inválido (ex.: enviar documento já assinado)
  - `422` Erros de validação detalhados
  - `500` Erro interno
- Corpo de erro (exemplo plausível)
```json
{
  "error": {
    "code": "validation_error",
    "message": "Campo 'email' é obrigatório",
    "details": [{"field": "email", "issue": "required"}]
  }
}
```
- Boas práticas
  - Mapear erros por categoria; registrar audit trail.
  - Não expor dados sensíveis em logs.
  - Usar retries só quando seguro (idempotente).

---

## 8. Webhooks (Notificações)

- Eventos típicos (confirmar na página `webhooks`):
  - `document.created`, `document.sent`, `document.viewed`, `document.signed`, `document.canceled`
  - `signer.invited`, `signer.viewed`, `signer.signed`, `signer.rejected`
- Segurança
  - Assinatura via cabeçalho (ex.: `X-Assinafy-Signature`) com HMAC usando um `webhook_secret`. Validar timestamp (ex.: `X-Assinafy-Timestamp`).
  - Responder `2xx` apenas após persistir o evento.
- Payload (exemplo plausible)
```json
{
  "id": "evt_123",
  "type": "document.signed",
  "created_at": "2025-12-03T12:34:56Z",
  "data": {
    "document_id": "doc_123",
    "signer_id": "signer_123",
    "status": "signed"
  }
}
```
- Reentrega: Implementar tolerância a duplicidade (idempotência por `event.id`).

---

## 9. Requisitos de Segurança e Boas Práticas

- Credenciais
  - Manter `API Key` fora do frontend; usar infra segura (Edge Functions/Backend).
  - Rotacionar chaves; proteger `.env`; limitar escopos por workspace.
- LGPD
  - Minimizar dados pessoais; criptografar em trânsito (`HTTPS`) e em repouso.
  - Revisar bases legais e retenção.
- Multi-tenant
  - Forçar contexto de `workspace/tenant` em toda operação.
  - Implementar políticas RLS no banco (Supabase) e chaves por tenant.
- Observabilidade
  - Logs com correlação de requisição (request-id), métricas, tracing.
- Resiliência
  - Retentativas com backoff; circuit breaker; isolamento de falhas.

---

## 10. Requisitos Técnicos para Implementação

- Ambiente
  - `BASE_URL` da API e `ASSINAFY_API_KEY` em variáveis de ambiente.
  - Endpoint público para webhooks (Edge Function) com verificação de assinatura.
- Cliente HTTP
  - Timeout (ex.: 10–30s), retries condicionais, idempotência.
  - Serialização/validação com schemas (Zod/TypeScript, se aplicável).
- Tipagem
  - Definir tipos para `Signer`, `Document`, `Template`, `FieldDefinition`, `WebhookEvent`.
- Segurança
  - Armazenar e rotacionar segredos; evitar exposição na UI.
- Multi-tenant
  - Incluir `tenant_id/workspace_id` em chaves de cache e nas requisições.

---

## 11. Plano de Integração em Fases

### Fase 0 — Pré-requisitos de Ambiente
- Criar credenciais (API Key) e webhook secret.
- Definir variáveis: `ASSINAFY_API_KEY`, `ASSINAFY_WEBHOOK_SECRET`, `ASSINAFY_BASE_URL`.
- Preparar endpoint de webhook (dev: `http://localhost:8080/api/webhooks/assinafy`).
- Configurar observabilidade (logs, métricas, alertas).

### Fase 1 — Fundações
- Cliente HTTP seguro com autenticação por cabeçalho.
- Wrapper de recursos: `workspaces`, `signers`, `documents`.
- Validação de entrada/saída (schemas) e mapeamento de erros.

### Fase 2 — Fluxo de Documento
- Cadastro/associação de `signers`.
- Criação de `documents` (arquivo/URL/template).
- Definição de `fields` e envio para assinatura.
- Status polling e download de PDF assinado.

### Fase 3 — Templates e Papéis
- CRUD de `templates` e leitura de `template-roles`.
- Uso de `assignment-types` para papéis/atribuições.

### Fase 4 — Webhooks e Auditoria
- Registro de webhook; validação de assinatura; persistência idempotente.
- Geração de logs de auditoria e reconciliação de estados.

### Cronograma Estimado (referência)
- Fase 0: 0,5–1 dia
- Fase 1: 1–2 dias
- Fase 2: 2–3 dias
- Fase 3: 1–2 dias
- Fase 4: 1–2 dias

### Pontos de Atenção e Desafios
- Campos de assinatura (coordenadas, páginas, papéis) precisam de validação visual.
- Diferenças de estados de documentos durante transições (evitar 409/422).
- Segurança de webhooks (assinatura, replay attacks, janelas de tempo).
- Rate limits não documentados: implementar backoff e telemetria.

---

## 12. Recomendações para Testes e Validação

- Unitários
  - Validação de schemas e mapeamento de erros.
- Integração
  - Chamadas a `signers`, `documents`, `templates` com dados de exemplo.
  - Teste de idempotência em POST.
- Webhooks
  - Simulação local; validação de assinatura/HMAC; deduplicação por `event.id`.
- Carga/Resiliência
  - Testes com picos controlados; verificação de backoff e circuit breaker.
- Segurança
  - Scan de segredos; revisão LGPD; revisão de logs sem dados sensíveis.

---

## 13. Referências e Notas

- Assinafy — Página pública da API: https://www.assinafy.com.br/api  
- Assinafy — Site institucional: https://www.assinafy.com.br/  
- Observação: Este relatório será refinado após validação dos endpoints exatos em `https://api.assinafy.com.br/v1/docs`.

