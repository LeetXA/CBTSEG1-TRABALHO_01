import { Router } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { csrfProtection, ensureCsrfToken } from "../middleware/csrf.js";
import { OAuth2Client } from "google-auth-library";

const router = Router();
const sessions = new Map();
const attempts = new Map();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const MAX_INVALID_ATTEMPTS = 5;
const BLOCK_MS = 15 * 60 * 1000;

function getCookie(req, name) {
  const header = req.headers.cookie || "";
  const item = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : undefined;
}

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
  const blockedUntil = count >= MAX_INVALID_ATTEMPTS ? Date.now() + BLOCK_MS : 0;
  attempts.set(key, { count, blockedUntil });
  return { count, blockedUntil };
}

function clearFailures(key) { attempts.delete(key); }

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
    path: "/",
  });
}

router.get("/csrf-token", ensureCsrfToken, (req, res) => {
  res.json({ csrfToken: req.csrfToken });
});

router.post("/", csrfProtection, async (req, res) => {
  const matricula = String(req.body?.matricula ?? "").trim();
  const senha = String(req.body?.senha ?? "");
  const key = attemptKey(req, matricula);
  const current = getAttemptState(key);

  if (current.blockedUntil > Date.now()) {
    const remainingSeconds = Math.ceil((current.blockedUntil - Date.now()) / 1000);
    return res.status(429).json({
      message: `Login bloqueado. Tente novamente em ${Math.ceil(remainingSeconds / 60)} minuto(s).`,
      attempts: current.count,
    });
  }

  if (!matricula || !senha) {
    return res.status(400).json({ message: "Preencha matrícula e senha." });
  }

  try {
    // CORREÇÃO PRINCIPAL:
    // os valores do usuário são passados como parâmetros separados da SQL.
    // Isso impede que a entrada seja interpretada como parte da instrução SQL.
    const stmt = db.prepare(`
      SELECT id, matricula, senha
      FROM usuarios
      WHERE matricula = ?
      LIMIT 1
    `);

    const user = stmt.get(matricula);
    const senhaValida = user ? await bcrypt.compare(senha, user.senha) : false;

    if (!user || !senhaValida) {
      const failure = registerFailure(key);
      if (failure.count >= MAX_INVALID_ATTEMPTS) {
        return res.status(429).json({
          message: "5 tentativas inválidas atingidas. Login bloqueado por 15 minutos.",
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

    return res.json({ message: "Login realizado com sucesso.", matricula: user.matricula });
  } catch (error) {
    console.error("Erro na autenticação:", error);
    return res.status(500).json({ message: "Erro interno ao processar o login." });
  }
});

router.get("/me", (req, res) => {
  const sessionId = getCookie(req, "session");
  const session = sessionId ? sessions.get(sessionId) : null;
  if (!session) return res.status(401).json({ message: "Não autenticado." });
  return res.json(session);
});

router.post("/logout", (req, res) => {
  const sessionId = getCookie(req, "session");
  if (sessionId) sessions.delete(sessionId);
  res.clearCookie("session", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
  return res.json({ message: "Logout realizado." });
});

router.post("/google", csrfProtection, async (req, res) => {
  const { credential } = req.body ?? {};

  if (!credential) {
    return res.status(400).json({
      message: "Credencial do Google não enviada.",
    });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.sub || !payload?.email) {
      return res.status(401).json({
        message: "Token do Google inválido.",
      });
    }

    const matricula = `google:${payload.sub}`;

    const sessionId = createSession({
      matricula,
      provider: "google",
    });

    setSessionCookie(res, sessionId);

    return res.json({
      message: "Login com Google realizado com sucesso.",
      matricula,
      email: payload.email,
      nome: payload.name || "Usuário Google",
    });
  } catch (error) {
    console.error("Erro ao validar token do Google:", error);

    return res.status(401).json({
      message: "Não foi possível validar o login com Google.",
    });
  }
});

export default router;
