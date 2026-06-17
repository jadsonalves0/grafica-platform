# Guia rapido de Git da plataforma

## Clonar em outra maquina

```powershell
git clone https://github.com/jadsonalves0/grafica-platform.git
cd grafica-platform
npm install
```

## Atualizar a base local

```powershell
git pull
```

## Criar uma branch de trabalho

```powershell
git checkout -b feature/nome-da-tarefa
```

## Salvar alteracoes

```powershell
git add .
git commit -m "feat: descricao objetiva"
git push -u origin feature/nome-da-tarefa
```

## Voltar para a principal

```powershell
git checkout main
git pull
```

## Quando usar cada prefixo

- `feature/` para novas funcionalidades
- `fix/` para correcao de bug
- `docs/` para documentacao
- `release/` para fechamento de versao

## Cuidados importantes

- nao subir `.env`
- validar `lint` e `TypeScript` antes de enviar
- preferir commits pequenos
- evitar misturar frontend, backend e banco no mesmo commit quando nao for necessario
