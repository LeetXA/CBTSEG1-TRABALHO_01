import crypto from "node:crypto";

const COOKIE_NAME = "csrf_token";

function getCookie(req, name) {
  const header = req.headers.cookie || "";
  const item = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : undefined;
}

export function ensureCsrfToken(req, res, next) {
  const existing = getCookie(req, COOKIE_NAME);
  if (!existing) {
    const token = crypto.randomBytes(32).toString("hex");
    res.cookie(COOKIE_NAME, token, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 15 * 60 * 1000,
    });
    req.csrfToken = token;
  } else {
    req.csrfToken = existing;
  }
  next();
}

export function csrfProtection(req, res, next) {
  const cookieToken = getCookie(req, COOKIE_NAME);
  const headerToken = req.get("X-CSRF-Token");

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ message: "Token CSRF inválido ou ausente." });
  }

  next();
}
