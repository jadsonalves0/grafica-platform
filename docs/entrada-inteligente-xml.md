# Entrada Inteligente por XML

## Escopo atual

A primeira fase da `Entrada Inteligente` permite:

- importar XML de `NF-e`
- reaproveitar fornecedor cadastrado por `CPF/CNPJ` ou nome
- criar um `rascunho` de entrada sem mexer no estoque imediatamente
- conciliar itens do fornecedor com produtos internos
- cadastrar um novo item interno a partir da linha importada
- confirmar em lote sugestoes de conciliacao de baixa confianca
- salvar o XML original como anexo operacional
- anexar manualmente DANFE, boleto, comprovante, recibo, foto ou orcamento do fornecedor
- revisar documento, itens e financeiro antes da confirmacao
- confirmar a entrada somente depois da revisao
- gerar uma `pre-entrada` a partir de `Sugestoes de compra`
- montar uma `lista de compra` agrupada por fornecedor

## Cadastro de fornecedores no fluxo

Agora a plataforma possui um cadastro proprio de `Fornecedores`.

No fluxo de entrada inteligente isso significa:

- a entrada pode ficar vinculada a um `supplierId`
- o sistema continua guardando `supplierName` e `supplierDocument` como retrato historico do documento
- a importacao de XML tenta localizar o fornecedor cadastrado antes de criar o rascunho
- o mapeamento `fornecedor-item` passa a apontar para o cadastro formal quando existir
- sugestoes e listas de compra conseguem abrir o fornecedor correto quando ele ja esta mapeado

## Fluxo operacional

1. acessar `Estoque > Entradas > Nova entrada`
2. usar `Importar XML`
3. selecionar o arquivo da `NF-e`
4. revisar o rascunho criado
5. conciliar itens pendentes
6. revisar a condicao financeira
7. confirmar a entrada

## Fluxo complementar por sugestao de compra

1. acessar `Operacao > Sugestoes de compra`
2. localizar o item abaixo do estoque minimo
3. usar `Gerar pre-entrada`
4. revisar o rascunho aberto em `Entradas`
5. ajustar fornecedor, custo e financeiro se necessario
6. confirmar a entrada quando a compra estiver efetivada

Esse caminho reaproveita:

- saldo disponivel como base da falta a repor
- custo de referencia atual do item
- ultimo fornecedor conciliado, quando existir
- fornecedor formal, quando o mapeamento ja estiver vinculado
- unidade de compra e fator de conversao apenas como referencia operacional nas observacoes

## Lista de compra operacional

Agora a tela `Operacao > Sugestoes de compra` tambem permite:

1. selecionar itens especificos
2. montar uma `lista de compra` com os selecionados
3. ou montar a lista inteira a partir dos filtros atuais
4. revisar agrupamento por fornecedor
5. imprimir a lista
6. gerar uma `pre-entrada` por item quando a compra estiver encaminhada
7. gerar uma `pre-entrada do grupo` quando varios itens pertencem ao mesmo fornecedor

Essa lista ainda nao e um documento persistido. Ela funciona como uma visao operacional para acelerar a compra antes da chegada da nota.

Quando o grupo ja possui fornecedor cadastrado:

- a lista permite abrir o cadastro do fornecedor
- a pre-entrada do grupo carrega `supplierId`, nome e documento de referencia

Na confirmacao:

- o estoque e atualizado
- as camadas FIFO sao criadas
- a conta a pagar ou despesa paga e criada quando configurado
- o documento passa de `Rascunho` para `Confirmado`

## Como a conciliacao funciona

O sistema tenta associar cada item importado nesta ordem:

1. mapeamento fornecedor-item ja salvo
2. `EAN/GTIN`
3. `SKU`
4. descricao exata
5. descricao aproximada

Os status atuais sao:

- `Conciliado`
- `Sugestao`
- `Pendente`

Quando o status for `Sugestao`:

- a linha ja chega com um item interno sugerido
- a entrada ainda nao pode ser confirmada diretamente
- o usuario precisa confirmar a sugestao por linha ou usar a confirmacao em lote

## Regras importantes

- importar XML nao confirma estoque sozinho
- item sem conciliacao bloqueia confirmacao
- chave de acesso duplicada bloqueia nova importacao
- o saldo so muda depois da confirmacao
- o XML original pode ser aberto pelo detalhe da entrada
- anexos manuais podem ser adicionados e removidos no detalhe da entrada
- o XML original importado permanece protegido para preservar o historico
- contas geradas pela entrada ficam visiveis no proprio detalhe

## O que ja pode ser revisado no rascunho importado

- fornecedor
- numero do documento
- data da entrada
- observacoes
- item interno conciliado
- cadastro rapido de novo item interno quando a linha ainda estiver pendente
- descricao, unidade, quantidade e custo de cada linha importada
- conta financeira
- condicao financeira
- parcelas e primeiro vencimento

## Limitacoes assumidas nesta fase

- o rascunho importado ainda nao permite adicionar ou remover linhas pela tela
- o foco atual continua em `importar -> revisar -> conciliar -> confirmar`

## Scripts e validacoes

- aplicar migration manual:
  - `npm run prisma:apply-manual -- 20260629213000_inventory_xml_import_foundation`
- testes unitarios:
  - `npm run test:unit`
- testes de integracao:
  - `npm run test:integration`

## Estruturas novas

- `suppliers`
- `supplier_item_mappings`
- `operational_document_attachments`
- metadados de XML em `inventory_entries`
- metadados de conciliacao em `inventory_entry_items`
