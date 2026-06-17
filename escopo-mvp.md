# Escopo MVP - Plataforma para Graficas Rapidas

## Visao geral

Este MVP ja nasce como base de produto replicavel para varias graficas.

A `Ponto Print` sera o cliente piloto, mas a estrutura precisa suportar novas empresas sem reescrever o sistema.

## Pilares do MVP

1. Multiempresa
2. Usuarios e permissoes
3. Operacao interna da grafica
4. Site institucional configuravel

## Core da plataforma

### Empresas

- cadastrar empresa
- ativar ou desativar empresa
- configurar identidade visual
- configurar dados de contato
- configurar servicos exibidos no site

### Usuarios

- cadastrar usuario
- editar usuario
- vincular usuario a empresa
- ativar ou inativar acesso
- redefinir senha

### Perfis e permissoes

- perfil administrador da plataforma
- perfil administrador da empresa
- perfil comercial
- perfil financeiro
- perfil producao
- perfil estoque

Cada perfil deve controlar:

- acesso a telas
- criacao
- edicao
- exclusao
- aprovacao

## Sistema interno

### Modulo de clientes

- cadastrar cliente
- editar dados
- buscar historico
- consultar orcamentos e pedidos

### Modulo de estoque

- cadastrar item
- classificar como insumo, material ou produto
- registrar entrada
- registrar saida
- registrar ajuste
- visualizar saldo atual
- alertar estoque baixo

### Modulo de orcamentos

- criar orcamento
- adicionar itens e servicos
- calcular subtotal
- aplicar desconto
- definir prazo
- definir status
- gerar versao para envio ao cliente

### Modulo financeiro

- lancar receita
- lancar despesa
- definir vencimento
- marcar como pago ou recebido
- visualizar fluxo por periodo
- visualizar saldo consolidado

## Site institucional por cliente

### Configuracoes editaveis

- nome da empresa
- logo
- cores
- banner principal
- texto sobre
- servicos
- contatos
- links sociais
- WhatsApp

### Paginas iniciais

- Home
- Sobre
- Servicos
- Contato
- Orcamento

### Conversao

- formulario simples
- CTA para WhatsApp
- destaques de diferenciais
- captacao de leads vinculada a empresa correta

## Regras de arquitetura do MVP

- cada registro deve pertencer a uma empresa
- usuarios so podem acessar dados da propria empresa, exceto administradores da plataforma
- o site publico deve carregar configuracoes conforme a empresa
- a base da Ponto Print deve servir como piloto sem virar regra fixa de negocio

## Ordem de desenvolvimento

1. Descoberta e requisitos do segmento
2. Estrutura multiempresa
3. Usuarios, perfis e permissoes
4. Banco de dados do core
5. Modulos de clientes e estoque
6. Orcamentos
7. Financeiro
8. Site institucional configuravel
9. Ajustes finais com a Ponto Print
