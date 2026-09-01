# Login Vulnerável — Demonstração de Segurança Web

Projeto acadêmico para demonstrar uma tela de login com:

- fragilidade proposital de SQL Injection;
- proteção CSRF (token obrigatório no login local);
- bloqueio após a 5ª tentativa inválida, bloqueando a partir da 6ª;
- login com Google via OAuth 2.0/OpenID Connect;
- redirecionamento para uma página simples de "Sistema em construção" após autenticação.

> **ATENÇÃO:** esta versão é deliberadamente vulnerável a SQL Injection e deve ser usada apenas em ambiente local/laboratório. Não publique esta versão vulnerável em produção.

## Estrutura

```text
backend/
  src/
    middleware/csrf.js
    routes/auth.js
    db.js
    server.js
  database.sqlite
  package.json
  .env.example
frontend/
  src/
    pages/index.jsx
    pages/construcao.jsx
    pages/style.css
    services/api.js
    main.jsx
  public/imagens/login.jpg
  package.json
  vite.config.mjs
```

## 1. Backend

```bash
cd backend
npm install
```

Copie `.env.example` para `.env` e ajuste as variáveis, caso queira ativar o Google Login.

Depois:

```bash
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

Isso é propositalmente simples para facilitar a demonstração em sala. Em produção, seria melhor persistir esse controle e adotar mecanismos como rate limiting distribuído.

## CSRF

Antes do login, o frontend solicita `/api/login/csrf-token` e recebe um token. O mesmo token é enviado no cabeçalho `X-CSRF-Token` no `POST /api/login`.

## Google Login

O botão **Entrar com Google** usa o fluxo Authorization Code do Google. Para ativar:

1. Crie um cliente OAuth 2.0 do tipo Web application no Google Cloud Console.
2. Cadastre como URI de redirecionamento:
   `http://localhost:3000/api/login/google/callback`
3. Preencha `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no `.env`.

A documentação atual do Google recomenda o fluxo de código de autorização e o uso de `openid`, `email` e `profile` para OpenID Connect. Consulte a documentação oficial antes de publicar uma integração real.

## Observação sobre a versão vulnerável

O objetivo é permitir a comparação futura com a versão corrigida. Na versão corrigida, a mesma consulta deverá deixar de concatenar os valores e usar parâmetros/prepared statements.
