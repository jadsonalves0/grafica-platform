# Core de Autenticacao e Acesso

## O que foi estruturado

Foi criada a base do core de autenticacao para suportar:

- login por empresa
- sessao persistida
- isolamento por grafica
- papeis e permissoes
- preparacao para recuperacao de senha e convite de usuario

## Componentes criados

### Banco

No Prisma foram adicionados:

- `AuthSession`
- `AuthToken`
- enum `AuthTokenType`

### Backend

- `AuthController`
- `AuthService`
- `AuthorizationService`
- `AuthSessionRepository`
- `AuthTokenRepository`
- `UserRepository`
- `CompanyUserRepository`

### Infraestrutura

- `password-hasher`
- `session-token`
- `session-cookie`
- `session-resolver`
- `middleware`

## Como o login foi pensado

O fluxo-base e:

1. usuario informa empresa, email e senha
2. sistema localiza o usuario
3. sistema valida a senha
4. sistema confirma se o usuario pertence a grafica informada
5. sistema cria sessao vinculada a `user_id` e `company_id`
6. cookie de sessao e gravado
7. rotas protegidas passam a exigir esse cookie

## Observacao importante

O `PlaceholderPasswordHasher` e apenas provisório para manter a arquitetura andando.

Antes de producao, ele deve ser substituido por uma implementacao real com hash seguro, como por exemplo:

- bcrypt
- argon2

## Proximo passo recomendado

1. substituir o hasher provisório por implementacao real
2. criar cadastro de usuario
3. criar cadastro de perfil
4. associar permissoes aos perfis
5. proteger controllers por permissao
