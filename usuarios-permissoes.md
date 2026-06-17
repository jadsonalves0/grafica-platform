# Modulo de Usuarios, Papeis e Permissoes

## O que foi adicionado

Foi criada a base do modulo administrativo para:

- cadastrar usuarios
- listar usuarios por empresa
- cadastrar papeis de acesso
- listar papeis disponiveis
- listar permissoes cadastradas

## Estrutura criada

### DTOs e validacao

- `user-create-input`
- `user-list-item`
- `role-create-input`
- `role-list-item`
- `user-validator`
- `role-validator`

### Repositories

- `UserManagementRepository`
- `RoleRepository`
- `PermissionRepository`

### Services

- `UserManagementService`
- `RoleService`

### Controllers

- `UserController`
- `RoleController`

### Rotas

- `GET/POST /api/admin/users`
- `GET/POST /api/admin/roles`
- `GET /api/admin/roles?mode=permissions`

## Regras principais

- usuarios precisam pertencer a uma empresa
- criacao de usuarios exige permissao `users.create`
- visualizacao de usuarios exige permissao `users.view`
- papeis podem ser globais ou da empresa
- perfis da empresa nao podem ser usados em outra grafica

## Observacao importante

As rotas administrativas ainda usam `mockContext` temporario para manter o fluxo de desenvolvimento andando enquanto a integracao total com sessao e permissao real nao foi finalizada.

## Proximo passo recomendado

1. ligar essas rotas ao contexto real da sessao
2. trocar o hasher provisório por hash seguro
3. criar seed inicial de permissoes e perfis padrao
4. montar telas reais de listagem e cadastro
