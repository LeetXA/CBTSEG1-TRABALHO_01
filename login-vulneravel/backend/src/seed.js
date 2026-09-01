import { db } from "./db.js";

const usuarios = [
  ["20240001", "Frota@2024"],
  ["20240002", "Rodar123!"],
  ["20240003", "AdminFrota#1"],
  ["20240004", "Seguranca99"],
];

const insert = db.prepare("INSERT OR IGNORE INTO usuarios (matricula, senha) VALUES (?, ?)");
const seedMany = db.transaction(() => {
  for (const [matricula, senha] of usuarios) {
    insert.run(matricula, senha);
  }
});

seedMany();
console.log("Usuários de demonstração garantidos na tabela usuarios.");

const rows = db.prepare("SELECT id, matricula FROM usuarios ORDER BY id").all();
console.table(rows);
