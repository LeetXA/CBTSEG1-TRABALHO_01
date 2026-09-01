import bcrypt from "bcryptjs";
import { db } from "./db.js";

const usuarios = [
  ["20240001", "Frota@2024"],
  ["20240002", "Rodar123!"],
  ["20240003", "AdminFrota#1"],
  ["20240004", "Seguranca99"],
];

const insert = db.prepare("INSERT OR IGNORE INTO usuarios (matricula, senha) VALUES (?, ?)");
const update = db.prepare("UPDATE usuarios SET senha = ? WHERE matricula = ?");

const seedMany = db.transaction(() => {
  for (const [matricula, senha] of usuarios) {
    const hash = bcrypt.hashSync(senha, 12);
    const result = insert.run(matricula, hash);
    if (result.changes === 0) {
      const existing = db.prepare("SELECT senha FROM usuarios WHERE matricula = ?").get(matricula);
      // Migra a versão anterior, caso o banco ainda tenha senha em texto puro.
      if (!String(existing?.senha || "").startsWith("$2")) {
        update.run(hash, matricula);
      }
    }
  }
});

seedMany();
console.log("Usuários de demonstração garantidos com senhas armazenadas como hash bcrypt.");

const rows = db.prepare("SELECT id, matricula FROM usuarios ORDER BY id").all();
console.table(rows);
