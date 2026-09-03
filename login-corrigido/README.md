# Login Corrigido — Demonstração de Segurança Web

## Proteções implementadas

- **SQL Injection:** a consulta usa parâmetros (`?`) e nunca concatena a entrada do usuário na SQL.
- **Senhas:** armazenadas com hash `bcrypt` (custo 12).
- **CSRF:** token obrigatório no login local, validado no backend.
- **Bloqueio:** ao atingir 5 tentativas inválidas, o login fica bloqueado por 15 minutos para aquela combinação de IP + matrícula.
- **Sessão:** cookie `HttpOnly`, `SameSite=Lax` e `Secure` em produção.
- **Google Login:** OAuth 2.0/OpenID Connect com parâmetro `state` para proteção contra CSRF no fluxo OAuth.

## Estrutura

A aplicação mantém a mesma ideia da versão vulnerável: React no frontend, Express no backend, SQLite e uma página de sistema em construção após o login.

## Instalação

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run seed
npm run dev
```

No Linux/macOS, substitua `copy` por `cp`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Acesse `http://localhost:5173`.

## Usuários de teste

| Matrícula | Senha |
|---|---|
| 20240001 | Frota@2024 |
| 20240002 | Rodar123! |
| 20240003 | AdminFrota#1 |
| 20240004 | Seguranca99 |

O script `npm run seed` migra automaticamente o banco caso as senhas ainda estejam em texto puro da versão anterior.

## Como demonstrar a correção

Use a mesma entrada que será utilizada na versão vulnerável, por exemplo:

- Matrícula: `' OR 1=1 -- `
- Senha: qualquer valor

Nesta versão, essa entrada é tratada como **texto comum**. Ela não altera a estrutura da consulta porque a matrícula é enviada como parâmetro e a senha é comparada com `bcrypt`. O login deve falhar normalmente.

## Bloqueio

Após 5 tentativas inválidas, a aplicação retorna `429` e bloqueia novas tentativas durante 15 minutos. Um login válido limpa o contador.

## Google Login

Configure no `backend/.env`:

```env
PORT=3000
FRONTEND_URL=http://localhost:5173
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/login/google/callback
NODE_ENV=development
```

No Google Cloud Console, cadastre `http://localhost:3000/login/google/callback` como URI de redirecionamento autorizada.

## Comparação com a versão vulnerável

| Controle | Versão vulnerável | Versão corrigida |
|---|---|---|
| SQL Injection | ❌ Concatenava entrada | ✅ Consulta parametrizada |
| Senha | Texto armazenado | ✅ Hash bcrypt |
| CSRF | ✅ Token no login | ✅ Token no login |
| 5 tentativas | ✅ | ✅ |
| Sessão segura | Básica | ✅ Cookie com atributos de segurança |
| Google OAuth | ✅ | ✅ |
