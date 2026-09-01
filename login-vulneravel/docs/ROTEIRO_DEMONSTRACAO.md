# Roteiro rápido de demonstração

## 1. Login normal

Use:

- Matrícula: `20240001`
- Senha: `Frota@2024`

Depois do login, a aplicação abre a tela de "Sistema em construção".

## 2. SQL Injection

Na versão vulnerável, use uma entrada de laboratório controlada:

- Matrícula: `' OR 1=1 -- `
- Senha: `qualquer`

O objetivo é demonstrar que a entrada foi incorporada à instrução SQL como código, em vez de ser tratada somente como dado.

## 3. Bloqueio

Digite uma senha incorreta cinco vezes para a mesma matrícula. A partir da sexta tentativa, o backend responde HTTP 429 e bloqueia a chave por 15 minutos.

## 4. CSRF

Abra o DevTools > Network e observe:

- `GET /api/login/csrf-token` retorna um token;
- `POST /api/login` envia `X-CSRF-Token`.

Removendo o header manualmente, o backend deve responder HTTP 403.

## 5. Google

Configure as variáveis do Google no `backend/.env`. O botão então inicia o fluxo OAuth e, depois do callback, cria a sessão e abre a tela de construção.
