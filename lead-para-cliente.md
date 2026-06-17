# Conversao de Lead para Cliente

## O que foi criado

Foi estruturada a conversao de lead do site para cliente interno da grafica.

## Arquivos principais

- `src/models/dto/site-lead-convert-input.ts`
- `src/models/dto/site-lead-convert-output.ts`
- `src/services/site/site-service.ts`
- `src/controllers/site/site-controller.ts`
- `src/app/api/site/leads/[leadId]/status/route.ts`

## Como funciona

1. o lead entra no site publico
2. ele e salvo em `site_leads`
3. a equipe interna pode converter esse lead
4. o sistema cria um cliente na empresa correta
5. o lead passa para status `CONVERTED`

## Regras

- a conversao exige permissao de criar cliente
- se ja existir cliente com o mesmo email na empresa, o sistema reaproveita o cadastro
- o lead convertido nao pode ser convertido novamente

## Proximo passo recomendado

1. criar atalho comercial no painel de leads
2. ligar o formulario publico ao fluxo final de captacao
3. automatizar preenchimento inicial do orcamento
