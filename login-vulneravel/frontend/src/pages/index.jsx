import { useEffect, useState } from "react";
import { Lock, User, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getCsrfToken,
  loginUsuario,
  loginGoogle,
} from "../services/api";
import "./style.css";

function Home() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    matricula: "",
    senha: "",
  });

  const [csrfToken, setCsrfToken] = useState("");
  const [erroLogin, setErroLogin] = useState("");
  const [bloqueado, setBloqueado] = useState(false);
  const [loading, setLoading] = useState(false);

  // Obtém o token CSRF ao carregar a página
  useEffect(() => {
    getCsrfToken()
      .then((response) => {
        setCsrfToken(response.data.csrfToken);
      })
      .catch((error) => {
        console.error("Erro ao obter CSRF:", error);
        setErroLogin(
          "Não foi possível iniciar a proteção CSRF."
        );
      });
  }, []);

  // Inicializa o botão oficial do Google
  useEffect(() => {
    const carregarGoogle = () => {
      if (!window.google || !csrfToken) {
        return false;
      }

      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

      if (!clientId) {
        console.error(
          "VITE_GOOGLE_CLIENT_ID não configurado."
        );
        return false;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredential,
      });

      const container =
        document.getElementById("google-button");

      if (container) {
        container.innerHTML = "";

        window.google.accounts.id.renderButton(
          container,
          {
            theme: "outline",
            size: "large",
            width: 330,
            text: "signin_with",
            shape: "rectangular",
          }
        );
      }

      return true;
    };

    const interval = setInterval(() => {
      if (carregarGoogle()) {
        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [csrfToken]);

  const handleChange = (event) => {
    setForm((old) => ({
      ...old,
      [event.target.name]: event.target.value,
    }));
  };

  // Login local
  const handleLogin = async (event) => {
    event.preventDefault();

    setLoading(true);
    setErroLogin("");

    try {
      const response = await loginUsuario(
        form.matricula,
        form.senha,
        csrfToken
      );

      localStorage.setItem(
        "matriculaUser",
        response.data.matricula
      );

      localStorage.setItem(
        "loginMethod",
        "local"
      );

      setForm({
        matricula: "",
        senha: "",
      });

      navigate("/sistema");
    } catch (error) {
      console.error("Erro no login:", error);

      const status = error.response?.status;

      const message =
        error.response?.data?.message ||
        "Matrícula ou senha incorretos!";

      if (status === 429) {
        setBloqueado(true);
      }

      setErroLogin(message);

      setForm({
        matricula: "",
        senha: "",
      });
    } finally {
      setLoading(false);
    }
  };

  // Login com Google
  const handleGoogleCredential = async (response) => {
    if (!response?.credential) {
      setErroLogin(
        "Não foi possível obter a credencial do Google."
      );
      return;
    }

    if (!csrfToken) {
      setErroLogin(
        "Token CSRF ainda não está disponível."
      );
      return;
    }

    setLoading(true);
    setErroLogin("");

    try {
      const result = await loginGoogle(
        response.credential,
        csrfToken
      );

      localStorage.setItem(
        "matriculaUser",
        result.data.matricula
      );

      localStorage.setItem(
        "loginMethod",
        "google"
      );

      navigate("/sistema");
    } catch (error) {
      console.error(
        "Erro no login com Google:",
        error
      );

      setErroLogin(
        error.response?.data?.message ||
        "Não foi possível realizar o login com Google."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="container">

        <div className="lab-badge">
          <ShieldAlert size={16} />
          <span>
            VERSÃO VULNERÁVEL — LABORATÓRIO
          </span>
        </div>

        <h1>Portal de Controle de Veículos</h1>

        <p className="subtitle">
          Acesse sua conta
        </p>

        <form onSubmit={handleLogin}>

          <div className="input-group">
            <User
              className="icon"
              size={20}
            />

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
            <Lock
              className="icon"
              size={20}
            />

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

          <button
            type="submit"
            disabled={
              bloqueado ||
              loading ||
              !csrfToken
            }
          >
            {loading
              ? "Entrando..."
              : "Entrar"}
          </button>

        </form>

        {erroLogin && (
          <p className="erro">
            {erroLogin}
          </p>
        )}

        <div className="divider">
          <span>ou</span>
        </div>

        {/* Botão oficial do Google */}
        <div
          id="google-button"
          className="google-button"
        ></div>

        <p className="hint">
          Esta página é a versão propositalmente
          vulnerável usada para demonstrar
          SQL Injection.
        </p>

      </div>
    </div>
  );
}

export default Home;