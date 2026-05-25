import { Link } from 'react-router-dom';
import '../../styles/global-premium.css';

export default function NotFound() {
  return (
    <div className="page-wrapper">
      <div className="error-container">
        <h1>404</h1>
        <p>Página no encontrada</p>
        <Link to="/">Volver al inicio</Link>
        <Link to="/staff/login">Acceso Staff</Link>
      </div>
    </div>
  );
}
