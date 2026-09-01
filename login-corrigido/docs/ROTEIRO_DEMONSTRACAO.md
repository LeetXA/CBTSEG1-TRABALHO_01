# Roteiro — Login Corrigido

## 1. Login válido

Use `20240001 / Frota@2024` e mostre o redirecionamento para a tela em construção.

## 2. CSRF

Abra o DevTools e mostre que o frontend primeiro solicita `/login/csrf-token`. Depois, remova o cabeçalho `X-CSRF-Token` do POST manualmente e observe o `403`.

## 3. SQL Injection

Use a mesma entrada demonstrada na versão vulnerável:

```text
Matrícula: ' OR 1=1 -- 
Senha: qualquer
```

Na versão corrigida, o login deve falhar porque a entrada é tratada como dado, não como SQL. Explique que a consulta usa parâmetros e a senha é validada com bcrypt.

## 4. Bloqueio

Faça 5 tentativas com senha incorreta. Ao atingir a 5ª, a aplicação bloqueia novas tentativas por 15 minutos.

## 5. Google

Com o `.env` configurado, clique em “Entrar com Google” e mostre o redirecionamento para o provedor e o retorno ao sistema.
