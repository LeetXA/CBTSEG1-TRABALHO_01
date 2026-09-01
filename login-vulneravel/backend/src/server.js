import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./routes/auth.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "X-CSRF-Token"],
}));

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "API Login Vulnerável — demonstração acadêmica",
    warning: "SQL Injection propositalmente presente nesta versão.",
  });
});

app.use("/login", authRouter);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
});
