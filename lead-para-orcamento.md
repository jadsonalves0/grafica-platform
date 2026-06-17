# Conversao de Lead para Orcamento

## O que foi criado

Foi estruturada a conversao de lead para orcamento, reaproveitando o fluxo de cliente quando necessario.

## Arquivos principais

- `src/models/dto/site-lead-to-quote-input.ts`
- `src/models/dto/site-lead-to-quote-output.ts`
- `src/services/site/site-service.ts`
- `src/controllers/site/site-controller.ts`
- `src/app/api/site/leads/[leadId]/status/route.ts`

## Como funciona

1. o lead entra pelo site
2. a equipe interna aciona a conversao para orcamento
3. se o cliente ainda nao existir, o sistema cria
4. o sistema gera o orcamento com os itens enviados
5. o lead vai para status `CONTACTED`

## Regras

- a conversao exige permissao de criar orcamento
- o sistema tenta reaproveitar cliente por email
- desconto nao pode superar o subtotal
- o fluxo usa a mesma logica de calculo do modulo comercial

## Proximo passo recomendado

1. criar botao real de converter no painel de leads
2. preencher o formulario publico para envio real
3. montar uma revisao geral da fase MVP
