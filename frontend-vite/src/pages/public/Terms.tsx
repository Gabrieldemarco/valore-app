import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../../styles/terms.css';

type TabId = 'terms' | 'privacy' | 'cancellations';

const TABS: { id: TabId; label: string }[] = [
  { id: 'terms', label: 'Términos y Condiciones' },
  { id: 'privacy', label: 'Política de Privacidad' },
  { id: 'cancellations', label: 'Política de Cancelaciones' },
];

function getInitialTab(): TabId {
  if (typeof window === 'undefined') return 'terms';
  const hash = window.location.hash.slice(1) as TabId;
  if (['terms', 'privacy', 'cancellations'].includes(hash)) return hash;
  return 'terms';
}

function TermsContent({ id }: { id: TabId }) {
  if (id === 'terms') {
    return (
      <section className="terms-pane active">
        <article className="terms-card">
          <h1>Términos y Condiciones</h1>
          <div className="terms-date">Última actualización: 18 de mayo de 2026</div>

          <h2>1. Introducción</h2>
          <p>Bienvenido a Velsoie. Al acceder y utilizar nuestra plataforma, sitio web o servicios relacionados, aceptás los presentes Términos y Condiciones.</p>
          <p>Velsoie es una plataforma digital destinada a conectar usuarios con salones, barberías, estudios de estética y profesionales del sector beauty y grooming en Uruguay.</p>
          <p>Si no estás de acuerdo con estos términos, te recomendamos no utilizar la plataforma.</p>

          <hr />

          <h2>2. Uso de la plataforma</h2>
          <p>Velsoie permite a los usuarios:</p>
          <ul>
            <li>descubrir salones y barberías,</li>
            <li>reservar servicios,</li>
            <li>gestionar citas,</li>
            <li>acceder a información de profesionales y espacios adheridos.</li>
          </ul>
          <p>El usuario se compromete a utilizar la plataforma de forma responsable, lícita y respetuosa.</p>
          <p>No está permitido:</p>
          <ul>
            <li>utilizar identidades falsas,</li>
            <li>interferir con el funcionamiento de la plataforma,</li>
            <li>intentar acceder sin autorización a cuentas o sistemas,</li>
            <li>utilizar Velsoie con fines fraudulentos o ilegales.</li>
          </ul>

          <hr />

          <h2>3. Registro de cuentas</h2>
          <p>Para acceder a determinadas funcionalidades, puede ser necesario crear una cuenta.</p>
          <p>El usuario es responsable de:</p>
          <ul>
            <li>mantener la confidencialidad de sus credenciales,</li>
            <li>proporcionar información veraz y actualizada,</li>
            <li>todas las actividades realizadas desde su cuenta.</li>
          </ul>
          <p>Velsoie podrá suspender o eliminar cuentas que incumplan estos términos.</p>

          <hr />

          <h2>4. Reservas y cancelaciones</h2>
          <p>Las reservas realizadas mediante Velsoie quedan sujetas a disponibilidad de cada salón, barbería o profesional.</p>
          <p>Cada establecimiento podrá definir:</p>
          <ul>
            <li>horarios,</li>
            <li>condiciones de atención,</li>
            <li>políticas de cancelación,</li>
            <li>tiempos de tolerancia.</li>
          </ul>
          <p>Velsoie actúa como plataforma intermediaria y no garantiza la disponibilidad permanente de servicios.</p>
          <p>Los usuarios deberán cancelar o modificar sus reservas con antelación razonable.</p>
          <p>Las cancelaciones reiteradas o conductas abusivas podrán derivar en restricciones de uso.</p>

          <hr />

          <h2>5. Responsabilidad de los establecimientos</h2>
          <p>Cada salón, barbería o profesional es responsable de:</p>
          <ul>
            <li>la calidad de sus servicios,</li>
            <li>información publicada,</li>
            <li>precios,</li>
            <li>horarios,</li>
            <li>condiciones de atención,</li>
            <li>cumplimiento de normas aplicables.</li>
          </ul>
          <p>Velsoie no presta directamente servicios de peluquería, barbería, estética o grooming.</p>

          <hr />

          <h2>6. Pagos</h2>
          <p>En caso de incorporarse funcionalidades de pago online, los usuarios aceptan que determinadas operaciones puedan ser procesadas mediante proveedores externos.</p>
          <p>Velsoie no almacena información completa de tarjetas bancarias.</p>
          <p>Los precios y condiciones serán definidos por cada establecimiento.</p>

          <hr />

          <h2>7. Propiedad intelectual</h2>
          <p>Todo el contenido de Velsoie, incluyendo:</p>
          <ul>
            <li>marca,</li>
            <li>diseño,</li>
            <li>logotipos,</li>
            <li>interfaz,</li>
            <li>fotografías,</li>
            <li>textos,</li>
            <li>software,</li>
            <li>identidad visual,</li>
          </ul>
          <p>se encuentra protegido por derechos de propiedad intelectual.</p>
          <p>No está permitido copiar, reproducir o utilizar contenido sin autorización previa.</p>

          <hr />

          <h2>8. Limitación de responsabilidad</h2>
          <p>Velsoie realiza esfuerzos razonables para mantener la plataforma disponible y segura.</p>
          <p>Sin embargo, no garantizamos:</p>
          <ul>
            <li>funcionamiento ininterrumpido,</li>
            <li>ausencia total de errores,</li>
            <li>disponibilidad permanente,</li>
            <li>resultados específicos derivados del uso de la plataforma.</li>
          </ul>
          <p>Velsoie no será responsable por daños indirectos, pérdidas de datos o conflictos derivados entre usuarios y establecimientos.</p>

          <hr />

          <h2>9. Suspensión o cancelación de acceso</h2>
          <p>Velsoie podrá suspender o cancelar cuentas cuando:</p>
          <ul>
            <li>exista incumplimiento de estos términos,</li>
            <li>se detecte actividad sospechosa,</li>
            <li>se afecte la seguridad de la plataforma,</li>
            <li>exista conducta abusiva hacia otros usuarios o establecimientos.</li>
          </ul>

          <hr />

          <h2>10. Modificaciones</h2>
          <p>Velsoie podrá actualizar estos Términos y Condiciones en cualquier momento.</p>
          <p>Las modificaciones entrarán en vigencia desde su publicación en la plataforma.</p>

          <hr />

          <h2>11. Legislación aplicable</h2>
          <p>Estos términos se rigen por las leyes de la República Oriental del Uruguay.</p>

          <hr />

          <h2>12. Contacto</h2>
          <p>Para consultas relacionadas con estos términos:</p>
          <p>Email: <a href="mailto:contacto@velsoie.uy">contacto@velsoie.uy</a></p>
        </article>
      </section>
    );
  }

  if (id === 'privacy') {
    return (
      <section className="terms-pane active">
        <article className="terms-card">
          <h1>Política de Privacidad</h1>
          <div className="terms-date">Última actualización: 18 de mayo de 2026</div>

          <h2>1. Introducción</h2>
          <p>En Velsoie valoramos la privacidad y protección de los datos personales de nuestros usuarios.</p>
          <p>La presente Política de Privacidad describe cómo recopilamos, utilizamos y protegemos la información.</p>

          <hr />

          <h2>2. Información que recopilamos</h2>
          <p>Podemos recopilar:</p>
          <ul>
            <li>nombre y apellido,</li>
            <li>correo electrónico,</li>
            <li>teléfono,</li>
            <li>información de reservas,</li>
            <li>ubicación aproximada,</li>
            <li>datos de uso de la plataforma,</li>
            <li>información técnica del dispositivo.</li>
          </ul>

          <hr />

          <h2>3. Uso de la información</h2>
          <p>Utilizamos la información para:</p>
          <ul>
            <li>gestionar reservas,</li>
            <li>mejorar la experiencia de usuario,</li>
            <li>brindar soporte,</li>
            <li>enviar notificaciones relacionadas con servicios,</li>
            <li>prevenir fraudes y usos indebidos,</li>
            <li>optimizar la plataforma.</li>
          </ul>

          <hr />

          <h2>4. Compartición de datos</h2>
          <p>Velsoie podrá compartir información únicamente cuando sea necesario para:</p>
          <ul>
            <li>gestionar reservas con establecimientos adheridos,</li>
            <li>cumplir obligaciones legales,</li>
            <li>proteger la seguridad de usuarios y plataforma,</li>
            <li>operar servicios mediante proveedores tecnológicos.</li>
          </ul>
          <p>No comercializamos información personal.</p>

          <hr />

          <h2>5. Seguridad</h2>
          <p>Implementamos medidas razonables de seguridad para proteger la información.</p>
          <p>Sin embargo, ningún sistema es completamente invulnerable.</p>

          <hr />

          <h2>6. Cookies y tecnologías similares</h2>
          <p>Velsoie puede utilizar cookies y herramientas de análisis para:</p>
          <ul>
            <li>recordar preferencias,</li>
            <li>mejorar funcionalidades,</li>
            <li>analizar uso del sitio,</li>
            <li>optimizar rendimiento.</li>
          </ul>
          <p>El usuario puede configurar su navegador para limitar o bloquear cookies.</p>

          <hr />

          <h2>7. Derechos del usuario</h2>
          <p>De acuerdo con la Ley N.º 18.331 de Protección de Datos Personales de Uruguay, los usuarios podrán:</p>
          <ul>
            <li>acceder a sus datos,</li>
            <li>solicitar correcciones,</li>
            <li>solicitar eliminación cuando corresponda,</li>
            <li>revocar determinados consentimientos.</li>
          </ul>

          <hr />

          <h2>8. Conservación de datos</h2>
          <p>Los datos serán conservados durante el tiempo necesario para operar la plataforma y cumplir obligaciones legales.</p>

          <hr />

          <h2>9. Menores de edad</h2>
          <p>Velsoie no está dirigido a menores de 13 años sin autorización de sus representantes legales.</p>

          <hr />

          <h2>10. Cambios en esta política</h2>
          <p>Podremos actualizar esta Política de Privacidad periódicamente.</p>
          <p>La versión vigente estará siempre disponible en la plataforma.</p>

          <hr />

          <h2>11. Contacto</h2>
          <p>Para consultas sobre privacidad o datos personales:</p>
          <p>Email: <a href="mailto:privacidad@velsoie.uy">privacidad@velsoie.uy</a></p>
        </article>
      </section>
    );
  }

  return (
    <section className="terms-pane active">
      <article className="terms-card">
        <h1>Política de Cancelaciones</h1>
        <div className="terms-date">Última actualización: 18 de mayo de 2026</div>

        <h2>1. Objetivo</h2>
        <p>La presente política busca promover una experiencia organizada y respetuosa para usuarios y establecimientos.</p>

        <hr />

        <h2>2. Cancelaciones</h2>
        <p>Los usuarios podrán cancelar o reprogramar reservas desde la plataforma.</p>
        <p>Se recomienda realizar modificaciones con suficiente anticipación.</p>
        <p>Cada establecimiento podrá establecer:</p>
        <ul>
          <li>tiempos mínimos de cancelación,</li>
          <li>políticas específicas,</li>
          <li>condiciones aplicables.</li>
        </ul>

        <hr />

        <h2>3. Inasistencias</h2>
        <p>Las inasistencias reiteradas o cancelaciones abusivas podrán derivar en:</p>
        <ul>
          <li>restricciones temporales,</li>
          <li>limitaciones de reserva,</li>
          <li>suspensión de funcionalidades.</li>
        </ul>

        <hr />

        <h2>4. Responsabilidad de los establecimientos</h2>
        <p>Los establecimientos son responsables de informar claramente:</p>
        <ul>
          <li>horarios,</li>
          <li>políticas propias,</li>
          <li>demoras,</li>
          <li>reprogramaciones.</li>
        </ul>

        <hr />

        <h2>5. Modificaciones</h2>
        <p>Velsoie podrá actualizar esta política cuando sea necesario para mejorar la experiencia de la plataforma.</p>

        <hr />

        <h2>6. Contacto</h2>
        <p>Email: <a href="mailto:soporte@velsoie.uy">soporte@velsoie.uy</a></p>
      </article>
    </section>
  );
}

export default function Terms() {
  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab);
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash.slice(1) as TabId;
    if (['terms', 'privacy', 'cancellations'].includes(hash)) {
      setActiveTab(hash);
    }
  }, [location.hash]);

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.slice(1) as TabId;
      if (['terms', 'privacy', 'cancellations'].includes(hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const switchTab = (id: TabId) => {
    setActiveTab(id);
    window.location.hash = id;
  };

  return (
    <div className="terms-page">
      <div className="terms-container">
        <aside className="terms-sidebar">
          <div className="terms-sidebar-title">Políticas de Velsoie</div>
          <nav className="terms-nav">
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`terms-nav-btn${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => switchTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <div style={{ marginTop: 32, paddingLeft: 8 }}>
            <Link to="/" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>
              ← Volver al inicio
            </Link>
          </div>
        </aside>

        <main className="terms-main">
          <TermsContent id={activeTab} />
        </main>
      </div>

      <div className="terms-footer">
        &copy; {new Date().getFullYear()} Velsoie. Todos los derechos reservados.
      </div>
    </div>
  );
}
