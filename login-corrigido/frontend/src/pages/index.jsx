import { useEffect, useState } from "react";
import { Lock, User, ShieldAlert } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCsrfToken, loginUsuario } from "../services/api";
import "./style.css";

function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ matricula: "", senha: "" });
  const [csrfToken, setCsrfToken] = useState("");
  const [erroLogin, setErroLogin] = useState("");
  const [bloqueado, setBloqueado] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCsrfToken()
      .then((response) => setCsrfToken(response.data.csrfToken))
      .catch(() => setErroLogin("Não foi possível iniciar a proteção CSRF."));

    const oauthError = searchParams.get("oauth_error");
    if (oauthError) setErroLogin(`Login Google cancelado: ${oauthError}`);
  }, [searchParams]);

  const handleChange = (event) => {
    setForm((old) => ({ ...old, [event.target.name]: event.target.value }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErroLogin("");

    try {
      const response = await loginUsuario(form.matricula, form.senha, csrfToken);
      localStorage.setItem("matriculaUser", response.data.matricula);
      setForm({ matricula: "", senha: "" });
      navigate("/sistema");
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.message || "Matrícula ou senha incorretos!";
      if (status === 429) setBloqueado(true);
      setErroLogin(message);
      setForm({ matricula: "", senha: "" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="container">
        <div className="lab-badge">
          <ShieldAlert size={16} />
          <span>VERSÃO CORRIGIDA — LABORATÓRIO</span>
        </div>

        <h1>Portal de Controle de Veículos</h1>
        <p className="subtitle">Acesse sua conta</p>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <User className="icon" size={20} />
            <input
              name="matricula"
              type="text"
              placeholder="Matrícula"
              value={form.matricula}
              onChange={handleChange}
              required
              disabled={bloqueado || loading}
              autoComplete="username"
            />
          </div>

          <div className="input-group">
            <Lock className="icon" size={20} />
            <input
              name="senha"
              type="password"
              placeholder="Senha"
              value={form.senha}
              onChange={handleChange}
              required
              disabled={bloqueado || loading}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" disabled={bloqueado || loading || !csrfToken}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {erroLogin && <p className="erro">{erroLogin}</p>}

        <div className="divider"><span>ou</span></div>

        <a className="google-button" href="/api/login/google">
          <span className="google-g">G</span>
          Entrar com Google
        </a>

        <p className="hint">
          Esta página usa consulta parametrizada, proteção CSRF e bloqueio após 5 tentativas inválidas.
        </p>
      </div>
    </div>
  );
}

export default Home;
