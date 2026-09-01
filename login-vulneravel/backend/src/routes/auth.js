import { Router } from "express";
import crypto from "node:crypto";
import { db } from "../db.js";
import { csrfProtection, ensureCsrfToken } from "../middleware/csrf.js";

const router = Router();

// Sessões em memória: suficientes para uma demonstração local.
const sessions = new Map();

// Controle de tentativas por IP + matrícula.
const attempts = new Map();

function getCookie(req, name) {
  const header = req.headers.cookie || "";
  const item = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : undefined;
}

const MAX_INVALID_ATTEMPTS = 5;
const BLOCK_MS = 15 * 60 * 1000;

function getClientIp(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

function attemptKey(req, matricula) {
  return `${getClientIp(req)}::${String(matricula ?? "").trim()}`;
}

function getAttemptState(key) {
  const current = attempts.get(key);
  if (!current) return { count: 0, blockedUntil: 0 };

  if (current.blockedUntil && Date.now() >= current.blockedUntil) {
    attempts.delete(key);
    return { count: 0, blockedUntil: 0 };
  }

  return current;
}

function registerFailure(key) {
  const current = getAttemptState(key);
  const count = current.count + 1;
  const blockedUntil = count > MAX_INVALID_ATTEMPTS ? Date.now() + BLOCK_MS : 0;
  attempts.set(key, { count, blockedUntil });
  return { count, blockedUntil };
}

function clearFailures(key) {
  attempts.delete(key);
}

function createSession(user) {
  const sessionId = crypto.randomBytes(32).toString("hex");
  sessions.set(sessionId, {
    matricula: user.matricula,
    provider: user.provider || "local",
    createdAt: Date.now(),
  });
  return sessionId;
}

function setSessionCookie(res, sessionId) {
  res.cookie("session", sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 1000,
  });
}

router.get("/csrf-token", ensureCsrfToken, (req, res) => {
  res.json({ csrfToken: req.csrfToken });
});

router.post("/", csrfProtection, (req, res) => {
  const { matricula = "", senha = "" } = req.body ?? {};
  const cleanMatricula = String(matricula);
  const key = attemptKey(req, cleanMatricula);
  const current = getAttemptState(key);

  if (current.blockedUntil > Date.now()) {
    const remainingSeconds = Math.ceil((current.blockedUntil - Date.now()) / 1000);
    return res.status(429).json({
      message: `Login bloqueado. Tente novamente em ${Math.ceil(remainingSeconds / 60)} minuto(s).`,
      attempts: current.count,
    });
  }

  // VULNERABILIDADE INTENCIONAL:
  // os dados do formulário são concatenados diretamente na consulta SQL.
  // Isto permite demonstrar SQL Injection em ambiente acadêmico/local.
  const sql = `
    SELECT id, matricula, senha
    FROM usuarios
    WHERE matricula = '${cleanMatricula}'
      AND senha = '${String(senha)}'
    LIMIT 1
  `;

  let user;
  try {
    user = db.prepare(sql).get();
  } catch (error) {
    console.error("Erro SQL:", error.message);
    const failure = registerFailure(key);
    return res.status(401).json({
      message: "Credenciais inválidas.",
      attempts: failure.count,
    });
  }

  if (!user) {
    const failure = registerFailure(key);
    if (failure.count > MAX_INVALID_ATTEMPTS) {
      return res.status(429).json({
        message: "Mais de 5 tentativas inválidas. Login bloqueado por 15 minutos.",
        attempts: failure.count,
      });
    }

    return res.status(401).json({
      message: `Credenciais inválidas. Tentativa ${failure.count} de ${MAX_INVALID_ATTEMPTS}.`,
      attempts: failure.count,
    });
  }

  clearFailures(key);

  const sessionId = createSession({ matricula: user.matricula, provider: "local" });
  setSessionCookie(res, sessionId);

  return res.json({
    message: "Login realizado com sucesso.",
    matricula: user.matricula,
  });
});

router.get("/me", (req, res) => {
  const sessionId = getCookie(req, "session");
  const session = sessionId ? sessions.get(sessionId) : null;

  if (!session) {
    return res.status(401).json({ message: "Não autenticado." });
  }

  return res.json(session);
});

router.post("/logout", (req, res) => {
  const sessionId = getCookie(req, "session");
  if (sessionId) sessions.delete(sessionId);
  res.clearCookie("session");
  return res.json({ message: "Logout realizado." });
});

// ---------------- Google OAuth 2.0 / OpenID Connect ----------------
const oauthStates = new Map();

router.get("/google", (req, res) => {
  const { GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI } = process.env;

  if (!GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    return res.status(503).send(
      "Google Login não configurado. Preencha GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REDIRECT_URI no backend/.env."
    );
  }

  const state = crypto.randomBytes(24).toString("hex");
  oauthStates.set(state, { createdAt: Date.now() });

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });

  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

router.get("/google/callback", async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/?oauth_error=${encodeURIComponent(error)}`);
  }

  const saved = oauthStates.get(state);
  oauthStates.delete(state);

  if (!state || !saved || Date.now() - saved.createdAt > 10 * 60 * 1000) {
    return res.status(400).send("Estado OAuth inválido ou expirado.");
  }

  if (!code) {
    return res.status(400).send("Código de autorização ausente.");
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error("Google token error:", tokens);
      return res.status(401).send("Não foi possível concluir o login com o Google.");
    }

    const userResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const googleUser = await userResponse.json();
    if (!userResponse.ok || !googleUser.email) {
      return res.status(401).send("Não foi possível obter os dados do usuário Google.");
    }

    const matricula = `google:${googleUser.sub}`;
    const sessionId = createSession({ matricula, provider: "google" });
    setSessionCookie(res, sessionId);

    return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/sistema`);
  } catch (error) {
    console.error("Google OAuth error:", error);
    return res.status(500).send("Erro interno ao autenticar com o Google.");
  }
});

export default router;
