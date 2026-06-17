# Modulo Financeiro

## O que foi criado

Foi estruturado o modulo financeiro com:

- contas financeiras
- lancamentos de receita e despesa
- atualizacao de status de pagamento
- resumo de fluxo de caixa

## Arquivos principais

- `src/repositories/financial/financial-repository.ts`
- `src/services/financial/financial-service.ts`
- `src/controllers/financial/financial-controller.ts`
- `src/app/api/financial/accounts/route.ts`
- `src/app/api/financial/entries/route.ts`
- `src/app/api/financial/entries/[entryId]/status/route.ts`
- `src/app/api/financial/summary/route.ts`
- `src/app/(admin)/admin/financeiro/page.tsx`

## Regras de negocio iniciais

- toda conta financeira pertence a uma empresa
- todo lancamento pertence a uma conta
- lancamentos podem ser receita ou despesa
- referencias de cliente, pedido e orcamento sao validadas
- resumo considera pagos e pendentes para projetar saldo

## Permissoes envolvidas

- `financial.view`
- `financial.manage`

## Papel do modulo no produto

O financeiro conecta:

- contas a pagar
- contas a receber
- fluxo de caixa
- pedidos e orcamentos
- visao gerencial do caixa

## Proximo passo recomendado

1. integrar estoque com pedidos
2. integrar financeiro com aprovacao de pedido ou faturamento
3. iniciar o painel gerencial

Para fechar bem o MVP, o melhor proximo passo agora costuma ser `dashboard gerencial`.
