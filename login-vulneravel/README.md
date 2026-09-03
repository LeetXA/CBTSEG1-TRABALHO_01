# Login Vulnerável — Demonstração de Segurança Web

> **ATENÇÃO:** esta versão é deliberadamente vulnerável a SQL Injection e deve ser usada apenas em ambiente local/laboratório. Não publique esta versão vulnerável em produção.

## 1. Backend
```bash
cp .env.example .env
npm run seed
npm run dev
```
O backend ficará em `http://localhost:3000`.

## 2. Frontend
Em outro terminal:
```bash
cd frontend
npm install
npm run dev
```
Acesse `http://localhost:5173`.

## Usuários de teste

O `npm run seed` garante estes usuários no banco:

| Matrícula | Senha |
|---|---|
| 20240001 | Frota@2024 |
| 20240002 | Rodar123! |
| 20240003 | AdminFrota#1 |
| 20240004 | Seguranca99 |

## Demonstração do SQL Injection

Depois de abrir a página normalmente, use o login local. Para demonstrar a falha, uma entrada de teste controlada é:

- Matrícula: `' OR 1=1 -- `
- Senha: qualquer valor

A consulta vulnerável é montada no backend por concatenação direta da entrada do usuário.

## Bloqueio de tentativas
O backend conta tentativas inválidas por endereço IP + matrícula. A política é:

- tentativas 1 a 5: permitem novas tentativas;
- tentativa 6: bloqueia o acesso;
- o bloqueio nesta versão dura 15 minutos;
- um login válido reseta o contador daquela chave.

## CSRF
Antes do login, o frontend solicita `/api/login/csrf-token` e recebe um token. O mesmo token é enviado no cabeçalho `X-CSRF-Token` no `POST /api/login`.

## Google Login
O botão **Entrar com Google** usa o fluxo Authorization Code do Google. Para ativar:

1. Crie um cliente OAuth 2.0 do tipo Web application no Google Cloud Console.
2. Cadastre como URI de redirecionamento:
   `http://localhost:3000/api/login/google/callback`
3. Preencha `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no `.env`.

A documentação atual do Google recomenda o fluxo de código de autorização e o uso de `openid`, `email` e `profile` para OpenID Connect. Consulte a documentação oficial antes de publicar uma integração real.
