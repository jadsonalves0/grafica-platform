# Roteiro de Homologacao

## Objetivo

Validar o fluxo operacional da `Grafica Platform` com foco no piloto da `Ponto Print`, considerando a interface atual do painel administrativo e do website.

## Preparacao

Antes de iniciar:

1. confirmar que o sistema sobe sem erro
2. validar login com usuario administrador
3. repetir depois a navegacao com pelo menos um perfil operacional
4. testar sempre em desktop e em mobile

## Validacao automatizada

Antes da homologacao manual completa, rodar a bateria inicial de interface:

1. instalar dependencias do projeto
2. garantir que o banco esteja com seed valido para `ponto-print`
3. executar `npx playwright install chromium`
4. executar `npm run test:e2e`
5. abrir o relatorio HTML quando houver falha

Jornadas automatizadas iniciais:

1. login e shell principal
2. cadastro de item
3. entrada salva e confirmada
4. venda concluida
5. venda fisica reduzindo saldo em estoque
6. configuracao e publicacao do website

Observacao da bateria automatizada:

- a jornada `login e shell principal` valida o acesso pela tela real de login
- as demais jornadas reutilizam autenticacao automatizada por API para reduzir fragilidade e isolar melhor o fluxo que esta sendo testado
- se a jornada de login falhar, tratar esse erro antes de interpretar as demais falhas

Se a bateria falhar logo no primeiro login, confirmar antes de tudo:

- seed aplicado
- credenciais de `admin@pontoprint.local`
- empresa `ponto-print`
- servidor respondendo em `http://127.0.0.1:3000`
- tela de login saindo de `Preparando...` para `Entrar` antes da submissao

## Bloco 1. Navegacao e shell

1. entrar no login
2. abrir o dashboard
3. validar `Início` no menu
4. validar breadcrumb na barra superior
5. recolher e expandir o menu no desktop
   - validar controle integrado na propria sidebar
   - validar largura expandida mais compacta
   - validar largura recolhida apenas com icones dos modulos
6. abrir e fechar o `drawer` de menu no celular
7. validar que o menu recolhido continua exibindo atalhos compactos para os modulos
8. validar que o `drawer` mobile abre expandido, mesmo que o menu desktop tenha sido recolhido antes
9. validar item ativo no menu
10. validar que a topbar nao repete o titulo principal da pagina
11. validar que nao existe botao circular `Menu` no desktop
12. validar saida da sessao
13. validar que telas de `novo`, `editar` e `detalhe` mantem a mesma largura e o mesmo ritmo visual das listagens
13. validar menu diferente por perfil:
   - administrador
   - gerente
   - comercial
   - producao
   - financeiro

## Bloco 2. Estados globais

1. validar paginas com carregamento visivel
2. validar estado vazio em pelo menos:
   - clientes
   - orcamentos
   - pedidos
   - vendas
   - entradas
3. validar mensagem de erro com orientacao de correcao
4. validar que formularios mantem dados digitados em erro
5. validar que botoes de envio entram em estado de carregamento
6. validar bloqueio de duplo clique nas acoes criticas

## Bloco 3. Clientes

1. abrir `Cadastros > Clientes`
2. buscar cliente por nome
3. filtrar ativos e inativos
4. limpar filtros
5. cadastrar cliente
6. validar foco no primeiro erro quando houver campo invalido
7. editar cliente
8. validar retorno para a lista com feedback
9. tentar excluir cliente com filhos
10. validar mensagem orientando inativacao
11. inativar cliente
12. reativar cliente

## Bloco 4. Itens e grupos de itens

1. abrir `Cadastros > Grupos de itens`
2. cadastrar grupo
3. editar grupo
4. inativar grupo
5. abrir `Cadastros > Itens`
6. buscar item por nome
7. buscar item por SKU
8. buscar item por EAN/GTIN
9. filtrar por grupo
10. cadastrar item
11. validar tipo `servico` sem controle de estoque
12. validar secoes recolhiveis do formulario
13. editar item
14. revisar historico de custo e preco

## Bloco 5. Orcamentos

1. abrir `Vendas > Orcamentos`
2. buscar por codigo ou cliente
3. filtrar por status
4. criar orcamento
5. pesquisar cliente por busca
6. pesquisar item do catalogo por nome, SKU ou EAN
7. selecionar item e conferir preenchimento automatico
8. ajustar descricao manualmente
9. validar desconto
10. validar resumo lateral com subtotal, desconto e total
11. salvar
12. editar
13. aprovar proposta
14. validar confirmacao de exclusao

## Bloco 6. Pedidos

1. abrir `Vendas > Pedidos`
2. validar que o titulo aparece apenas no `PageHeader`
3. validar que indicadores, filtros e pelo menos parte da listagem aparecem na primeira dobra
4. buscar por codigo ou cliente
5. filtrar por status comercial
6. filtrar por producao
7. criar pedido manual
8. cadastrar cliente rapido sem perder o pedido
9. criar pedido a partir de orcamento aprovado
10. editar entrega e observacoes
11. alterar status comercial
12. alterar status de producao
13. validar resumo lateral com origem e total previsto
14. validar orientacao da proxima acao apos salvar

## Bloco 7. Vendas

1. abrir `Vendas > Vendas`
2. criar venda
3. pesquisar item por nome, SKU ou EAN
4. filtrar a busca por grupo, quando necessario
5. adicionar item ao carrinho pela propria area de venda
6. validar aviso quando o item ja estiver no carrinho
7. alterar quantidade sem abrir modal
8. validar alerta de saldo insuficiente, quando houver item com controle de estoque
9. testar consumidor nao identificado
10. testar cadastro rapido de cliente sem perder o carrinho
11. validar desconto no item
12. validar resumo com bruto, desconto, total e situacao financeira
13. concluir venda
14. validar bloco final de sucesso com:
   - referencia
   - total
   - situacao financeira
   - quantidade de itens
15. repetir com item fisico em estoque
16. validar queda do saldo em `Estoque > Posicao de estoque`
17. validar rastro da saida em `Estoque > Movimentacoes`
18. abrir a venda criada
19. editar a venda sem perder os itens
20. validar alerta ao tentar sair com alteracoes nao salvas

## Bloco 8. Estoque e entradas

1. abrir `Estoque > Posição de estoque`
2. validar leitura de saldo
3. abrir `Estoque > Entradas`
4. criar entrada
5. avancar entre:
   - Documento
   - Itens
   - Financeiro e revisao
6. voltar de etapa sem perder dados
7. confirmar entrada
8. cancelar entrada confirmada
9. abrir `Estoque > Movimentações`
10. registrar ajuste administrativo
11. registrar saida administrativa
12. validar motivo obrigatorio
13. validar troca correta do item corrente ao abrir movimentacao por itens diferentes

## Bloco 9. Producao

1. abrir `Produção`
2. validar listas de:
   - pendentes
   - em andamento
   - concluidas
3. abrir item com composicao
4. revisar ficha tecnica
5. apontar producao
6. validar mensagem clara quando faltar material
7. validar que a acao principal fica bloqueada enquanto houver impedimento real
8. concluir producao
9. validar custo, consumo e entrada do produto final
10. validar links de proxima acao para item ou pedido quando houver

## Bloco 10. Financeiro

1. abrir `Financeiro`
2. validar blocos:
   - a receber
   - a pagar
   - caixa e bancos
3. abrir receita pendente
4. abrir despesa pendente
5. validar origem clicavel quando houver:
   - venda
   - entrada
6. validar que `Lançamento manual` aparece como excecao operacional
7. cadastrar conta financeira
8. cadastrar categoria de receita
9. cadastrar categoria de despesa
10. criar lancamento manual simples
11. validar que venda continua sendo criada em `Vendas`, nao no financeiro

## Bloco 11. Administracao e governanca

1. abrir `Administracao > Empresa`
2. validar dados principais da empresa na mesma linguagem visual das demais telas
3. abrir `Administracao > Parametros`
4. validar cards compactos, secoes de margem e desconto, e barra fixa de salvamento
5. abrir `Administracao > Usuarios`
6. buscar usuario
7. abrir edicao de usuario e voltar para a listagem
8. abrir `Administracao > Auditoria`
9. filtrar por entidade
10. filtrar por acao
11. validar listagem de eventos e blocos `Antes` e `Depois`

## Bloco 12. Website e leads

1. abrir `Website`
2. validar etapas:
   - Identidade
   - Página inicial
   - Serviços
   - Contato
   - Revisar e publicar
3. salvar rascunho
4. validar aviso de alteracoes nao publicadas
5. validar checklist antes da publicacao
6. abrir previa desktop
7. abrir previa mobile
8. publicar
9. abrir o site publico pelo `slug`
10. enviar lead
11. abrir `Website > Leads do site`
12. converter lead em cliente
13. gerar orcamento a partir do lead

## Bloco 13. Relatorios

1. abrir `Relatórios`
2. validar categorias de relatorio
3. abrir um relatorio comercial
4. aplicar periodo
5. aplicar filtro
6. limpar filtros
7. validar aba de relatorio na URL
8. voltar para a lista e conferir preservacao
9. exportar CSV
10. validar feedback de exportacao

## Ponto critico a observar

Antes de considerar a homologacao operacional do painel como concluida, validar especificamente o reflexo das `vendas com itens fisicos` sobre:

- estoque
- movimentos
- custo
- financeiro

Se algum desses quatro pontos falhar na base local, tratar isso como bloqueador real e nao como ajuste visual.

## Bloco 14. Mobile e acessibilidade

1. validar layout em `360px`
2. validar ausencia de rolagem horizontal indevida
3. validar listagem de `Pedidos` sem quebra horizontal
4. validar formularios em uma coluna no celular
5. validar navegacao por teclado no desktop
6. validar foco visivel
7. validar dialogs com foco ao abrir
8. validar retorno de foco ao fechar dialogs
9. validar tabs navegaveis
10. validar drawer navegavel
11. validar areas de toque adequadas

## Bloco 15. Permissoes

1. validar menu por perfil
2. validar rota bloqueada para perfil sem acesso
3. validar que ocultar menu nao substitui autorizacao do backend
4. validar acoes visiveis compativeis com o perfil
5. validar acoes bloqueadas quando o backend negar

## Resultado esperado

Ao final da rodada, a plataforma deve estar pronta para:

- homologacao funcional assistida com a `Ponto Print`
- identificacao de ajustes finos reais de operacao
- consolidacao dos testes de interface
- preparacao de ambiente de homologacao mais estavel
