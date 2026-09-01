import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logoutUsuario } from "../services/api";
import "./style.css";

export default function Construcao() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    getCurrentUser()
      .then((response) => setUser(response.data))
      .catch(() => navigate("/"));
  }, [navigate]);

  const sair = async () => {
    await logoutUsuario().catch(() => {});
    localStorage.removeItem("matriculaUser");
    navigate("/");
  };

  return (
    <div className="page construction-page">
      <div className="container construction-card">
        <div className="construction-icon">🚧</div>
        <h1>Sistema em construção</h1>
        <p className="subtitle">
          Login realizado com sucesso.
        </p>
        {user && (
          <p className="logged-user">
            Usuário: <strong>{user.matricula}</strong><br />
            Método: <strong>{user.provider}</strong>
          </p>
        )}
        <button onClick={sair}>Sair</button>
      </div>
    </div>
  );
}
