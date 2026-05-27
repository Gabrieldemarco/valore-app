import { useState } from 'react';
import { Link } from 'react-router-dom';


const TABS = ['Términos y Condiciones', 'Política de Privacidad', 'Política de Cancelación'] as const;
type Tab = typeof TABS[number];

const CONTENT: Record<Tab, string[]> = {
  'Términos y Condiciones': [
    'Al utilizar nuestros servicios, acepta estos términos en su totalidad.',
    'Los precios y servicios están sujetos a disponibilidad y pueden cambiar sin previo aviso.',
    'Los datos proporcionados serán utilizados únicamente para la gestión de citas y comunicaciones del salón.',
    'El usuario es responsable de mantener la confidencialidad de sus credenciales de acceso.',
  ],
  'Política de Privacidad': [
    'Recopilamos información personal necesaria para la reserva y gestión de citas.',
    'No compartimos datos personales con terceros sin consentimiento explícito.',
    'Los datos de pago son procesados por Mercado Pago bajo sus propios términos de seguridad.',
    'Puede solicitar la eliminación de sus datos contactando al salón correspondiente.',
  ],
  'Política de Cancelación': [
    'Las cancelaciones deben realizarse con al menos 24 horas de anticipación.',
    'Cancelaciones tardías pueden estar sujetas a cargos.',
    'Para modificar una reserva, por favor contacte al salón directamente.',
    'Los salones se reservan el derecho de aplicar políticas adicionales.',
  ],
};

export default function Terms() {
  const [activeTab, setActiveTab] = useState<Tab>('Términos y Condiciones');

  return (
    <div className="page-wrapper">
      <div className="terms-container">
        <h1>Información Legal</h1>
        <div className="terms-tabs">
          {TABS.map(tab => (
            <button
              key={tab}
              className={activeTab === tab ? 'active' : ''}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="terms-content">
          <ul>
            {CONTENT[activeTab].map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
        <Link to="/" className="btn-back">Volver al inicio</Link>
      </div>
    </div>
  );
}
