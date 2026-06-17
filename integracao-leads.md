# Integracao de Leads do Site

## O que foi criado

Foi estruturado o fluxo de leads do site para conectar a captacao publica com o sistema interno.

## Arquivos principais

- `src/models/dto/site-lead-create-input.ts`
- `src/models/dto/site-lead-status-input.ts`
- `src/repositories/site/site-repository.ts`
- `src/services/site/site-service.ts`
- `src/controllers/site/site-controller.ts`
- `src/app/api/public/leads/route.ts`
- `src/app/api/site/leads/route.ts`
- `src/app/api/site/leads/[leadId]/status/route.ts`
- `src/app/(admin)/admin/site/leads/page.tsx`

## O que essa estrutura permite

- receber leads publicos do site
- salvar esses contatos por empresa
- listar leads internamente
- atualizar status do lead
- acompanhar novos contatos pelo painel administrativo

## Status previstos

- `NEW`
- `CONTACTED`
- `CONVERTED`
- `ARCHIVED`

## Proximo passo recomendado

1. gerar orcamento a partir do lead
2. ligar o formulario publico ao endpoint real
3. automatizar regras comerciais por origem do lead
