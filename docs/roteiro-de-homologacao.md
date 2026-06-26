# Roteiro de Homologacao

## Objetivo

Validar o fluxo operacional real da `Grafica Platform` para o piloto da `Ponto Print`, usando como fonte de verdade:

- codigo local
- banco local
- migrations locais
- testes locais
- documentacao atual

## Preparacao

Antes de iniciar:

1. subir a aplicacao sem erro
2. validar login com administrador
3. validar depois com perfis operacional, producao e financeiro
4. repetir os testes principais em desktop e em mobile

## Validacao automatizada

Executar antes da homologacao manual:

1. `npm run test:unit`
2. `npm run test:integration`
3. `npm run inventory:diagnose`
4. `npx playwright install chromium`
5. `npm run test:e2e`
6. `npx playwright show-report`, se houver falha

Cobertura automatizada atual:

1. login e shell principal
2. cadastro de item
3. entrada salva e confirmada
4. orcamento com cliente pesquisado
5. pedido a partir de orcamento aprovado
6. venda concluida
7. venda fisica reduzindo saldo em estoque
8. movimentacao com troca de item
9. navegacao financeira segmentada
10. configuracao e publicacao do website
11. preview desktop e mobile do website
12. CTA de servico preenchendo o formulario publico
13. CTA de WhatsApp oculto quando o canal nao estiver configurado
14. integracao de entrada, camada FIFO, bloqueio acima do saldo e isolamento por empresa

## Bloco 1. Shell e navegacao

1. entrar no login
2. abrir o dashboard
3. validar `Inicio` na navegacao principal do topo
4. validar grupos principais:
   - `Comercial`
   - `Operacao`
   - `Financeiro`
   - `Meu site`
   - `Relatorios`
5. validar `Cadastros` e `Configuracoes` na area auxiliar
6. validar coluna lateral contextual do modulo ativo no desktop
7. recolher e expandir o menu no desktop
8. abrir e fechar o `drawer` no celular
9. validar item ativo
10. validar tooltip no estado recolhido
11. validar menu diferente por perfil
12. validar saida da sessao

## Bloco 2. Estados globais

1. validar carregamento visivel
2. validar estado vazio em clientes, orcamentos, pedidos, vendas e entradas
3. validar mensagens de erro com orientacao de correcao
4. validar preservacao dos dados em erro
5. validar bloqueio de duplo clique
6. validar alerta de alteracoes nao salvas

## Bloco 3. Clientes

1. abrir `Comercial > Clientes`
2. buscar cliente
3. filtrar ativos e inativos
4. limpar filtros
5. cadastrar cliente
6. editar cliente
7. tentar excluir cliente com filhos
8. validar mensagem orientando inativacao

## Bloco 4. Produtos e grupos

1. abrir `Cadastros > Produtos e servicos`
2. cadastrar grupo
3. editar grupo
4. cadastrar item
5. validar tipo `servico` sem controle de estoque
6. validar historico de custo e preco
7. validar campos monetarios e percentuais
8. validar que `Produtos e servicos` nao aparece em `Configuracoes`

## Bloco 5. Orcamentos

1. abrir `Comercial > Orcamentos`
2. criar orcamento
3. pesquisar cliente por nome
4. validar que a busca traz apenas clientes da empresa logada
5. validar que o campo de item nao aciona autocomplete de documento do navegador
6. pesquisar item do catalogo
7. ajustar quantidade
8. ajustar valor
9. salvar
10. aprovar

## Bloco 6. Pedidos

1. abrir `Comercial > Pedidos`
2. validar layout compacto
3. validar busca e filtros
4. criar pedido manual
5. criar pedido a partir de orcamento aprovado
6. editar entrega e observacoes
7. alterar status comercial
8. alterar status de producao
9. validar cabecalho atualizado sem sair e voltar
10. validar bloco de `Faturamento` no detalhe do pedido
11. validar acao `Gerar venda` quando o pedido ficar pronto para faturamento
12. depois da venda gerada, validar `Abrir venda`
13. depois da venda concluida, validar `Abrir conta a receber`

## Bloco 7. Vendas

1. abrir `Comercial > Vendas`
2. validar estado inicial orientado por pesquisa
3. validar que o catalogo nao carrega inteiro ao abrir
4. pesquisar item por nome, SKU ou EAN
5. filtrar por grupo
6. adicionar item ao carrinho
7. validar carrinho lateral visivel no desktop
8. validar preco do item do catalogo como somente leitura
9. alterar quantidade
10. aplicar desconto
11. testar consumidor nao identificado
12. testar cadastro rapido de cliente sem perder carrinho
13. concluir venda
14. validar bloco final de sucesso
15. validar `Abrir conta a receber`
16. validar `Voltar para pedido` quando a venda nascer de pedido
17. repetir com item fisico
18. validar que o saldo mostrado na venda coincide com o saldo aceito no backend
19. validar bloqueio ao vender acima do saldo disponivel
20. validar mensagem operacional sem expor regra interna de FIFO

## Bloco 8. Estoque e entradas

1. abrir `Operacao > Estoque`
2. validar saldo vendavel e saldo registrado
3. validar aviso de divergencia quando existir
4. abrir `Operacao > Entradas`
5. digitar `0`, `0,01`, `10,00`, `10,05` e `100,50` no custo unitario
6. avancar e voltar entre etapas sem perder dados
7. confirmar entrada
8. validar valor persistido na revisao
9. abrir `Operacao > Ajustes de estoque`
10. selecionar item A
11. trocar para item B
12. registrar movimento em B
13. validar que o movimento foi criado para B
14. abrir pelo menu novamente e validar ausencia de item residual

## Bloco 9. Producao

1. abrir `Operacao > Producao`
2. validar listas por status
3. revisar ficha tecnica
4. iniciar producao
5. validar impedimento claro quando faltar material
6. concluir producao

## Bloco 10. Financeiro

1. abrir `Financeiro`
2. validar `Visao financeira`
3. abrir `Contas a receber` e confirmar que nao mistura contas a pagar
4. abrir `Contas a pagar` e confirmar que nao mistura receitas
5. abrir `Caixa e bancos`
6. abrir `Lancamentos manuais`
7. abrir uma conta a receber
8. validar `Origem: Venda`
9. validar `Abrir venda` a partir da conta a receber quando a origem for comercial
10. abrir uma conta a pagar
11. validar `Origem: Entrada`
12. validar pedido pronto para faturamento sem tratar como receita
13. criar lancamento manual simples

## Bloco 11. Configuracoes

1. abrir `Configuracoes > Empresa`
2. abrir `Configuracoes > Usuarios e acessos`
3. abrir `Configuracoes > Contas financeiras`
4. abrir `Configuracoes > Regras operacionais`
5. abrir `Configuracoes > Historico de alteracoes`

## Bloco 12. Meu site

1. abrir `Meu site`
2. revisar as etapas `Identidade`, `Pagina inicial`, `Servicos`, `Contato` e `Revisar e publicar`
3. alterar titulo e subtitulo do hero
4. salvar rascunho
5. validar aviso de alteracoes nao publicadas
6. abrir a pre-visualizacao em desktop
7. abrir a pre-visualizacao em mobile
8. publicar
9. abrir o site publico pelo `slug`
10. validar hero, CTA principal e CTA de WhatsApp quando configurado
11. abrir um servico e confirmar o formulario com servico pre-preenchido
12. enviar lead
13. validar mensagem de sucesso
14. abrir `Meu site > Leads do site`
15. validar o servico selecionado no lead salvo
16. limpar o WhatsApp, publicar e confirmar que o CTA nao aparece no site publico
17. validar responsividade em `360px` sem rolagem horizontal

## Bloco 13. Relatorios

1. abrir `Relatorios`
2. abrir um relatorio
3. aplicar periodo
4. aplicar filtro
5. limpar filtros
6. validar preservacao na URL
7. exportar
8. validar feedback de exportacao

## Bloqueadores reais

Se algum dos itens abaixo falhar, tratar como bloqueador funcional:

- venda fisica com saldo exato recusada apesar do saldo disponivel mostrado
- saldo mostrado diferente do saldo validado
- entrada confirmada sem gerar camada FIFO
- item fixo na movimentacao
- mascara monetaria impedindo `10,00` ou `10,05`
- pedido pronto para faturamento aparecendo como receita sem venda gerada

## Diagnostico obrigatorio de estoque

Rodar:

- `npm run inventory:diagnose`

Se aparecer divergencia entre:

- `saldoRegistrado`
- `saldoMovimentos`
- `saldoFifoDisponivel`

registrar o item e tratar como regularizacao administrativa antes de seguir para vendas reais.

Se o ambiente piloto local apontar saldo legado sem camadas, executar primeiro:

- `npm run inventory:backfill-fifo`

Se ainda houver divergencia depois disso, tratar como regularizacao administrativa antes de seguir para vendas reais.
