const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const UPLOADS_DIR = path.join(__dirname, 'uploads', 'seed');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ============ helpers ============
function slugify(name) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function randHex(n) {
  return crypto.randomBytes(Math.ceil(n / 2)).toString('hex').slice(0, n);
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function initials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'VS';
}

const CATEGORY_EMOJI = {
  peluqueria: '\u2702', cejas: '\u2728', 'u\u00f1as': '\u{1F485}',
  maquillaje: '\u{1F484}', facial: '\u{1F338}', depilacion: '\u{1F6C2}', masajes: '\u{1F486}',
};
const CATEGORY_LABEL = {
  peluqueria: 'Peluquer\u00eda & Barber\u00eda', cejas: 'Cejas & Pesta\u00f1as', 'u\u00f1as': 'Manicura & Pedicura',
  maquillaje: 'Maquillaje', facial: 'Cuidado Facial', depilacion: 'Depilaci\u00f3n', masajes: 'Masajes & Bienestar',
};

const PALETTES = [
  ['#0f172a', '#f43f5e'], ['#111827', '#f59e0b'], ['#431407', '#fb923c'],
  ['#022c22', '#34d399'], ['#172554', '#60a5fa'], ['#3b0764', '#c084fc'],
  ['#500724', '#f472b6'], ['#1c1917', '#e7e5e4'], ['#18181b', '#a1a1aa'],
  ['#164e63', '#22d3ee'], ['#312e81', '#818cf8'], ['#052e16', '#4ade80'],
];

function svgFor(salon, palette) {
  const [c1, c2] = palette;
  const ini = initials(salon.name);
  const label = esc(CATEGORY_LABEL[salon.category] || 'Sal\u00f3n');
  const name = esc(salon.name);
  const font = name.length > 22 ? 26 : 34;

  const hero = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" viewBox="0 0 1200 600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="600" fill="url(#bg)"/>
  <circle cx="1060" cy="70" r="230" fill="rgba(255,255,255,0.07)"/>
  <circle cx="130" cy="560" r="270" fill="rgba(0,0,0,0.10)"/>
  <circle cx="600" cy="300" r="190" fill="rgba(255,255,255,0.05)"/>
  <circle cx="640" cy="270" r="120" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>
  <text x="600" y="270" font-family="Arial, Helvetica, sans-serif" font-size="88" font-weight="800" fill="rgba(255,255,255,0.95)" text-anchor="middle">${ini}</text>
  <text x="600" y="330" font-size="42" text-anchor="middle">${CATEGORY_EMOJI[salon.category] || ''}</text>
  <rect x="250" y="420" width="700" height="104" rx="18" fill="rgba(0,0,0,0.28)"/>
  <text x="600" y="468" font-family="Arial, Helvetica, sans-serif" font-size="${font}" font-weight="700" fill="#ffffff" text-anchor="middle">${name}</text>
  <text x="600" y="502" font-family="Arial, Helvetica, sans-serif" font-size="20" letter-spacing="3" fill="rgba(255,255,255,0.85)" text-anchor="middle">${label}</text>
</svg>`;

  const logo = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#bg)"/>
  <circle cx="340" cy="60" r="120" fill="rgba(255,255,255,0.08)"/>
  <circle cx="60" cy="360" r="140" fill="rgba(0,0,0,0.10)"/>
  <circle cx="200" cy="190" r="96" fill="none" stroke="rgba(255,255,255,0.20)" stroke-width="2.5"/>
  <text x="200" y="200" font-family="Arial, Helvetica, sans-serif" font-size="96" font-weight="800" fill="rgba(255,255,255,0.96)" text-anchor="middle">${ini}</text>
  <text x="200" y="330" font-size="30" text-anchor="middle">${CATEGORY_EMOJI[salon.category] || ''}</text>
</svg>`;

  return { hero, logo };
}

// ============ datos ============
const MONTEVIDEO = {
  Centro: [-34.905, -56.190], Pocitos: [-34.915, -56.155], Cord\u00f3n: [-34.905, -56.170],
  Palermo: [-34.910, -56.180], 'Tres Cruces': [-34.890, -56.160], 'Parque Rod\u00f3': [-34.915, -56.170],
  'Punta Carretas': [-34.930, -56.160], Malv\u00edn: [-34.890, -56.100], Buceo: [-34.900, -56.120],
  'La Blanqueada': [-34.880, -56.150], Carrasco: [-34.890, -56.060], 'Ciudad Vieja': [-34.906, -56.205],
  'Brazo Oriental': [-34.870, -56.170], 'Paso Molino': [-34.855, -56.215], Uni\u00f3n: [-34.885, -56.140],
  'Pocitos Nuevo': [-34.910, -56.145], Capurro: [-34.875, -56.195], Sayago: [-34.835, -56.200],
  'Malvín Norte': [-34.880, -56.100],
};
const CITIES = {
  'Punta del Este': [-34.947, -54.934], Maldonado: [-34.908, -54.958],
  'Colonia del Sacramento': [-34.471, -57.844], Salto: [-31.383, -57.960],
  Paysand\u00fa: [-32.321, -58.075], 'Ciudad de la Costa': [-34.817, -55.950],
  Canelones: [-34.522, -56.277], 'Las Piedras': [-34.730, -56.220], Pando: [-34.718, -55.958],
};

const jitter = (lat, lng) => [lat + (Math.random() - 0.5) * 0.012, lng + (Math.random() - 0.5) * 0.012];

// Cada salon: name, category, gender, barrio/city, phone, desc, staff[], services[{name,duration,price}]
const SALONS = [
  // ===== HOMBRE (barberías) =====
  { name: 'Barbería El Clásico', category: 'peluqueria', gender: 'hombre', zone: 'Centro',
    desc: 'Barbería clásica con corte y barba tradicional en pleno Centro.',
    staff: ['Martín Pérez', 'Diego Silva'],
    services: [
      { name: 'Corte de Hombre', duration: 30, price: 500 },
      { name: 'Arreglo de Barba', duration: 20, price: 350 },
      { name: 'Afeitado Clásico con Toalla', duration: 30, price: 450 },
      { name: 'Perfilado de Cejas', duration: 10, price: 200 },
    ] },
  { name: 'Barba & Corte', category: 'peluqueria', gender: 'hombre', zone: 'Pocitos',
    desc: 'Barbería de autor especializada en barba y afeitado.',
    staff: ['Sebastián Costa'],
    services: [
      { name: 'Corte de Hombre', duration: 30, price: 550 },
      { name: 'Barba y Afeitado', duration: 25, price: 400 },
      { name: 'Diseño de Barba', duration: 20, price: 380 },
      { name: 'Fade y Degradado', duration: 35, price: 600 },
    ] },
  { name: "The Gentlemen's Room", category: 'peluqueria', gender: 'hombre', zone: 'Punta Carretas',
    desc: 'Barber shop premium con servicio de afeitado clásico.',
    staff: ['Gonzalo Méndez'],
    services: [
      { name: 'Corte Masculino', duration: 40, price: 800 },
      { name: 'Afeitado con Navaja', duration: 30, price: 600 },
      { name: 'Fade Técnico', duration: 40, price: 700 },
      { name: 'Tratamiento Capilar', duration: 25, price: 450 },
    ] },
  { name: 'Barbero Moderno', category: 'peluqueria', gender: 'hombre', zone: 'Cordón',
    desc: 'Barbería urbana de barbero profesional para el hombre actual.',
    staff: ['Facundo Ramírez'],
    services: [
      { name: 'Corte de Hombre', duration: 30, price: 500 },
      { name: 'Barba Perfilada', duration: 20, price: 300 },
      { name: 'Afeitado Clásico', duration: 30, price: 400 },
      { name: 'Luz de Navaja', duration: 15, price: 250 },
    ] },
  { name: 'Estilo Varón', category: 'peluqueria', gender: 'hombre', zone: 'Paso Molino',
    desc: 'Peluquería masculina y barbería en un solo lugar.',
    staff: ['Rodrigo Ferreyra', 'Matías Olivera'],
    services: [
      { name: 'Corte Masculino', duration: 30, price: 450 },
      { name: 'Barba y Bigote', duration: 20, price: 350 },
      { name: 'Afeitado Tradicional', duration: 30, price: 400 },
      { name: 'Corte + Barba', duration: 45, price: 700 },
    ] },
  { name: 'Corte y Barba 22', category: 'peluqueria', gender: 'hombre', zone: 'Unión',
    desc: 'Corte y barba para el hombre de hoy, sin vueltas.',
    staff: ['Nicolás Acosta'],
    services: [
      { name: 'Corte de Hombre', duration: 30, price: 480 },
      { name: 'Arreglo de Barba', duration: 15, price: 280 },
      { name: 'Perfilado de Barba y Cejas', duration: 25, price: 450 },
    ] },
  { name: 'Rey Barba', category: 'peluqueria', gender: 'hombre', zone: 'Ciudad Vieja',
    desc: 'El rey de la barba y el afeitado clásico.',
    staff: ['Emiliano Rodríguez'],
    services: [
      { name: 'Barba Real', duration: 25, price: 380 },
      { name: 'Afeitado Clásico', duration: 30, price: 420 },
      { name: 'Corte de Hombre', duration: 30, price: 500 },
      { name: 'Máscara Facial', duration: 20, price: 320 },
    ] },
  { name: 'Caballeros Studio', category: 'peluqueria', gender: 'hombre', zone: 'Tres Cruces',
    desc: 'Estudio de imagen para caballeros exigentes.',
    staff: ['Andrés Ríos', 'Lucas Domínguez'],
    services: [
      { name: 'Corte Masculino', duration: 35, price: 600 },
      { name: 'Barba y Bigote', duration: 20, price: 350 },
      { name: 'Afeitado de Corte Clásico', duration: 30, price: 450 },
      { name: 'Cejas para Hombre', duration: 10, price: 200 },
    ] },
  { name: 'Barbería Urbana', category: 'peluqueria', gender: 'hombre', zone: 'Sayago',
    desc: 'Barbería urbana de barrio con estilistas de barba.',
    staff: ['Joaquín Vera'],
    services: [
      { name: 'Corte de Hombre', duration: 30, price: 420 },
      { name: 'Fade Americano', duration: 35, price: 520 },
      { name: 'Arreglo de Barba', duration: 15, price: 260 },
    ] },
  { name: 'Fade Zone', category: 'peluqueria', gender: 'hombre', zone: 'Buceo',
    desc: 'Especialistas en fade y corte de hombre.',
    staff: ['Bruno Lemos'],
    services: [
      { name: 'Skin Fade', duration: 35, price: 580 },
      { name: 'Fade Americano', duration: 35, price: 580 },
      { name: 'Corte Masculino', duration: 30, price: 500 },
      { name: 'Barba y Fade', duration: 50, price: 850 },
    ] },
  { name: 'Hombre Elegante', category: 'peluqueria', gender: 'hombre', zone: 'Pocitos',
    desc: 'Peluquería masculina elegante con tratamiento para barba.',
    staff: ['Tomás Cabrera'],
    services: [
      { name: 'Corte de Hombre', duration: 30, price: 650 },
      { name: 'Barba y Afeitado', duration: 25, price: 450 },
      { name: 'Afeitado con Toalla', duration: 30, price: 500 },
      { name: 'Tratamiento Capilar', duration: 25, price: 400 },
    ] },
  { name: 'Barbería Los Galanes', category: 'peluqueria', gender: 'hombre', zone: 'Palermo',
    desc: 'Barbería para galanes con estilo clásico.',
    staff: ['Franco Benítez', 'Agustín Núñez'],
    services: [
      { name: 'Corte de Hombre', duration: 30, price: 460 },
      { name: 'Barba y Bigote', duration: 20, price: 320 },
      { name: 'Afeitado Clásico', duration: 30, price: 400 },
    ] },

  // ===== MUJER (salones femeninos) =====
  { name: 'Beauty Color Studio', category: 'peluqueria', gender: 'mujer', zone: 'Pocitos',
    desc: 'Color y estética premium para la mujer que elige brillar.',
    staff: ['Carolina Fernández', 'Valentina Paz'],
    services: [
      { name: 'Corte de Dama', duration: 45, price: 700 },
      { name: 'Color y Tinte', duration: 120, price: 1600 },
      { name: 'Balayage', duration: 150, price: 2200 },
      { name: 'Peinado para Eventos', duration: 40, price: 800 },
      { name: 'Mechas', duration: 120, price: 1800 },
    ] },
  { name: 'Uñas Elegantes', category: 'uñas', gender: 'mujer', zone: 'Punta Carretas',
    desc: 'Manicura, pedicura y nail art para damas.',
    staff: ['Milagros Sosa', 'Rocío Pereira'],
    services: [
      { name: 'Manicura Semipermanente', duration: 60, price: 600 },
      { name: 'Pedicura Completa', duration: 60, price: 650 },
      { name: 'Esculpidas en Gel', duration: 120, price: 1400 },
      { name: 'Kapping', duration: 90, price: 1000 },
      { name: 'Nail Art', duration: 30, price: 300 },
    ] },
  { name: 'Nails Studio 27', category: 'uñas', gender: 'mujer', zone: 'Centro',
    desc: 'Estudio de uñas y nail design con las últimas tendencias.',
    staff: ['Camila Duarte'],
    services: [
      { name: 'Nails', duration: 60, price: 550 },
      { name: 'Esmaltado Semipermanente', duration: 60, price: 550 },
      { name: 'Acrílicas', duration: 120, price: 1300 },
    ] },
  { name: 'Maquillaje Social', category: 'maquillaje', gender: 'mujer', zone: 'Pocitos',
    desc: 'Maquillaje social y de novia con estilo propio.',
    staff: ['Julieta Albornoz'],
    services: [
      { name: 'Maquillaje de Novia', duration: 120, price: 2500 },
      { name: 'Makeup Social', duration: 60, price: 1200 },
      { name: 'Peinado para Eventos', duration: 45, price: 800 },
      { name: 'Prueba de Maquillaje', duration: 45, price: 900 },
    ] },
  { name: 'Glam Makeup', category: 'maquillaje', gender: 'mujer', zone: 'Carrasco',
    desc: 'Makeup profesional y peinados para ocasiones especiales.',
    staff: ['Sofía Aguirre'],
    services: [
      { name: 'Makeup de Novia', duration: 120, price: 2800 },
      { name: 'Maquillaje para Fiestas', duration: 60, price: 1400 },
      { name: 'Peinado de Novia', duration: 60, price: 1200 },
    ] },
  { name: 'Bella Mujer', category: 'peluqueria', gender: 'mujer', zone: 'Malvín',
    desc: 'Belleza integral para la mujer uruguaya.',
    staff: ['Noelia Martínez'],
    services: [
      { name: 'Corte de Dama', duration: 45, price: 650 },
      { name: 'Color y Tinte', duration: 120, price: 1500 },
      { name: 'Keratina', duration: 150, price: 2600 },
      { name: 'Alisado', duration: 150, price: 2400 },
    ] },
  { name: 'Divas y Damas', category: 'peluqueria', gender: 'mujer', zone: 'Parque Rodó',
    desc: 'Salón de belleza para damas y divas.',
    staff: ['Lourdes Giménez', 'Antonella Correa'],
    services: [
      { name: 'Corte de Dama', duration: 45, price: 680 },
      { name: 'Tintura', duration: 90, price: 1400 },
      { name: 'Peinado Social', duration: 40, price: 750 },
      { name: 'Mechas', duration: 120, price: 1700 },
    ] },
  { name: 'Alisado y Ondas', category: 'peluqueria', gender: 'mujer', zone: 'La Blanqueada',
    desc: 'Especialistas en alisado y ondas para la mujer.',
    staff: ['Florencia Vázquez'],
    services: [
      { name: 'Alisado Progresivo', duration: 150, price: 2500 },
      { name: 'Keratina', duration: 150, price: 2600 },
      { name: 'Corte de Dama', duration: 45, price: 600 },
      { name: 'Baño de Crema', duration: 30, price: 350 },
    ] },
  { name: 'Studio de la Dama', category: 'peluqueria', gender: 'mujer', zone: 'Pocitos Nuevo',
    desc: 'Estudio de estética para la dama moderna.',
    staff: ['Daniela Salazar'],
    services: [
      { name: 'Corte de Dama', duration: 45, price: 720 },
      { name: 'Balayage', duration: 150, price: 2100 },
      { name: 'Peinado de Novia', duration: 60, price: 1100 },
      { name: 'Color', duration: 120, price: 1550 },
    ] },
  { name: 'Belleza Femenina', category: 'peluqueria', gender: 'mujer', zone: 'Brazo Oriental',
    desc: 'Centro de estética femenina con todos los servicios.',
    staff: ['Pilar Chávez'],
    services: [
      { name: 'Corte Femenino', duration: 45, price: 600 },
      { name: 'Tinte', duration: 90, price: 1350 },
      { name: 'Mechas', duration: 120, price: 1600 },
      { name: 'Alisado', duration: 150, price: 2300 },
      { name: 'Maquillaje Social', duration: 60, price: 1100 },
    ] },
  { name: 'Mechas & Balayage', category: 'peluqueria', gender: 'mujer', zone: 'Capurro',
    desc: 'Especialistas en mechas y balayage para mujer.',
    staff: ['Celeste Romero'],
    services: [
      { name: 'Balayage', duration: 150, price: 2000 },
      { name: 'Mechas', duration: 120, price: 1650 },
      { name: 'Corte de Dama', duration: 45, price: 620 },
      { name: 'Peinado de Novia', duration: 60, price: 1000 },
    ] },
  { name: 'Salón Reflejo', category: 'peluqueria', gender: 'mujer', zone: 'Tres Cruces',
    desc: 'Reflejos, color y estilo para damas.',
    staff: ['Micaela Torres'],
    services: [
      { name: 'Color y Reflejos', duration: 120, price: 1500 },
      { name: 'Corte de Dama', duration: 45, price: 640 },
      { name: 'Peinado de Novia', duration: 60, price: 1050 },
      { name: 'Tintura Capilar', duration: 90, price: 1380 },
    ] },
  { name: 'Pura Belleza', category: 'peluqueria', gender: 'mujer', zone: 'Ciudad de la Costa',
    desc: 'Estética integral con uñas y maquillaje.',
    staff: ['Ayelén Castro'],
    services: [
      { name: 'Manicura', duration: 50, price: 500 },
      { name: 'Corte de Dama', duration: 45, price: 580 },
      { name: 'Maquillaje Social', duration: 60, price: 1000 },
      { name: 'Pedicura', duration: 50, price: 550 },
    ] },
  { name: 'Cute Nails', category: 'uñas', gender: 'mujer', zone: 'Malvín Norte',
    desc: 'Nails tierno y creativo para todas.',
    staff: ['Lucía Roldán'],
    services: [
      { name: 'Nails', duration: 60, price: 520 },
      { name: 'Manicura en Gel', duration: 70, price: 680 },
      { name: 'Pedicura', duration: 60, price: 580 },
      { name: 'Diseño de Uñas', duration: 40, price: 450 },
    ] },

  // ===== UNISEX =====
  { name: 'Estilo Total', category: 'peluqueria', gender: 'unisex', zone: 'Centro',
    desc: 'Peluquería para toda la familia: corte, estilo y tratamientos.',
    staff: ['Iván Toledo'],
    services: [
      { name: 'Corte de Cabello', duration: 30, price: 480 },
      { name: 'Tratamiento Capilar', duration: 30, price: 420 },
      { name: 'Secado y Estilo', duration: 25, price: 300 },
      { name: 'Depilación de Cejas', duration: 15, price: 180 },
    ] },
  { name: 'Bienestar Integral', category: 'masajes', gender: 'unisex', zone: 'Pocitos',
    desc: 'Masajes relajantes y terapéuticos para el bienestar de todos.',
    staff: ['Natalia Bruno', 'Eugenia Lanza'],
    services: [
      { name: 'Masajes Relajantes', duration: 60, price: 1100 },
      { name: 'Masaje Descontracturante', duration: 60, price: 1200 },
      { name: 'Reflexología', duration: 45, price: 900 },
      { name: 'Piedras Calientes', duration: 75, price: 1500 },
    ] },
  { name: 'Relax & Spa', category: 'masajes', gender: 'unisex', zone: 'Punta del Este',
    desc: 'Spa de masajes y bienestar frente al mar.',
    staff: ['Magdalena Ferreira'],
    services: [
      { name: 'Masaje de Piedras', duration: 75, price: 1600 },
      { name: 'Masaje Aromaterapia', duration: 60, price: 1300 },
      { name: 'Sauna y Vapor', duration: 45, price: 700 },
    ] },
  { name: 'Piel Radiante', category: 'facial', gender: 'unisex', zone: 'Pocitos',
    desc: 'Cuidado facial y tratamientos de piel para todo tipo de cutis.',
    staff: ['Marianela Escobar'],
    services: [
      { name: 'Limpieza Facial Profunda', duration: 50, price: 950 },
      { name: 'Hidratación Facial', duration: 40, price: 800 },
      { name: 'Dermaplaning', duration: 30, price: 750 },
      { name: 'Peeling Facial', duration: 45, price: 1000 },
    ] },
  { name: 'Centro de Estética Aurora', category: 'cejas', gender: 'unisex', zone: 'Cordón',
    desc: 'Cejas, pestañas y estética facial.',
    staff: ['Renata Pazos'],
    services: [
      { name: 'Lifting de Pestañas', duration: 45, price: 850 },
      { name: 'Laminado de Cejas', duration: 40, price: 800 },
      { name: 'Henna', duration: 20, price: 350 },
      { name: 'Limpieza Facial', duration: 50, price: 900 },
    ] },
  { name: 'Look Perfecto', category: 'peluqueria', gender: 'unisex', zone: 'Pando',
    desc: 'Corte y tratamientos capilares para todos.',
    staff: ['Santiago Muñoz'],
    services: [
      { name: 'Corte de Cabello', duration: 30, price: 450 },
      { name: 'Tratamiento Capilar', duration: 30, price: 400 },
      { name: 'Secado Profesional', duration: 25, price: 280 },
      { name: 'Acondicionado', duration: 20, price: 250 },
    ] },
  { name: 'Depilación Venus', category: 'depilacion', gender: 'unisex', zone: 'Colonia del Sacramento',
    desc: 'Depilación con cera y láser para todos.',
    staff: ['Candela López'],
    services: [
      { name: 'Depilación con Cera', duration: 30, price: 450 },
      { name: 'Depilación Láser', duration: 45, price: 1300 },
      { name: 'Cejas con Pinza', duration: 15, price: 200 },
    ] },
  { name: 'Spa Tierra', category: 'masajes', gender: 'unisex', zone: 'Salto',
    desc: 'Masajes y bienestar natural en un entorno tranquilo.',
    staff: ['Guillermo Casco'],
    services: [
      { name: 'Masajes Relajantes', duration: 60, price: 1000 },
      { name: 'Masaje Holístico', duration: 90, price: 1400 },
      { name: 'Baño de Vapor', duration: 40, price: 600 },
    ] },
  { name: 'Cejas & Pestañas Pro', category: 'cejas', gender: 'unisex', zone: 'Ciudad Vieja',
    desc: 'Cejas y pestañas profesionales.',
    staff: ['Agostina Medina'],
    services: [
      { name: 'Lifting de Pestañas', duration: 45, price: 820 },
      { name: 'Laminado de Cejas', duration: 40, price: 780 },
      { name: 'Henna para Cejas', duration: 20, price: 340 },
      { name: 'Extensiones de Pestañas', duration: 90, price: 1600 },
    ] },
];

// ============ clasificación espejo del frontend ============
const MEN_K = ['barber', 'barbería', 'barbero', 'afeitado', 'barba', 'caballero', 'hombre', 'men', 'beard', 'masculino', 'corte de hombre', 'corte masculino'];
const WOMEN_K = ['alisado', 'dama', 'mujer', 'peinado', 'color', 'tintura', 'uñas', 'nails', 'maquillaje', 'makeup', 'balayage', 'mechas', 'femenino', 'corte de dama', 'corte femenino'];
function classify(text) {
  const hasMen = MEN_K.some(k => k === 'men' ? new RegExp('\\bmen\\b').test(text) : text.includes(k));
  const hasWomen = WOMEN_K.some(k => text.includes(k));
  if (hasMen && hasWomen) return 'unisex';
  if (hasMen) return 'hombre';
  if (hasWomen) return 'mujer';
  return 'unisex';
}

async function main() {
  const hashed = await bcrypt.hash('test123', 10);
  let created = 0, skipped = 0;

  const CHILD = ['services', 'staff', 'service_categories', 'service_images', 'appointments', 'reviews', 'products', 'sales', 'coupons', 'waitlist'];
  const cleanup = await pool.query("SELECT id FROM tenants WHERE brand_logo_url LIKE '/uploads/seed/%'");
  if (cleanup.rows.length > 0) {
    const ids = cleanup.rows.map(r => r.id);
    const hasCol = await pool.query("SELECT table_name FROM information_schema.columns WHERE column_name = 'tenant_id'");
    const tablesWithCol = new Set(hasCol.rows.map(r => r.table_name));
    for (const table of CHILD) {
      if (!tablesWithCol.has(table)) continue;
      try {
        await pool.query(`DELETE FROM ${table} WHERE tenant_id = ANY($1)`, [ids]);
      } catch (e) {
        if (!/relation .* does not exist/i.test(e.message)) throw e;
      }
    }
    const del = await pool.query("DELETE FROM tenants WHERE brand_logo_url LIKE '/uploads/seed/%'");
    console.log(`  ♻ limpieza previa: ${del.rowCount} tenant(s) con imágenes seed`);
  }

  for (let i = 0; i < SALONS.length; i++) {
    const salon = SALONS[i];
    const allText = `${salon.name} ${salon.desc} ${salon.services.map(s => s.name).join(' ')}`.toLowerCase();
    const actual = classify(allText);
    if (actual !== salon.gender) {
      console.error(`✗ ${salon.name}: esperado ${salon.gender}, clasifica como ${actual} (check keywords)`);
      process.exitCode = 1;
      continue;
    }

    const exists = await pool.query('SELECT id FROM tenants WHERE business_name = $1', [salon.name]);
    if (exists.rows.length > 0) {
      console.log(`  ∃ ${salon.name} — ya existe, salteando`);
      skipped++;
      continue;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const slug = slugify(salon.name) + '-' + randHex(6);
      const [lat, lng] = (salon.zone && CITIES[salon.zone])
        ? jitter(...CITIES[salon.zone])
        : jitter(...(MONTEVIDEO[salon.zone] || MONTEVIDEO.Centro));

      // generar imágenes SVG
      const palette = PALETTES[i % PALETTES.length];
      const { hero, logo } = svgFor(salon, palette);
      const heroFile = path.join(UPLOADS_DIR, `hero-${slug}.svg`);
      const logoFile = path.join(UPLOADS_DIR, `logo-${slug}.svg`);
      fs.writeFileSync(heroFile, hero);
      fs.writeFileSync(logoFile, logo);

      const address = `${salon.zone || 'Montevideo'}, Uruguay`;
      const tzHours = JSON.stringify({
        startHour: salon.gender === 'hombre' ? 10 : 9,
        endHour: salon.gender === 'mujer' ? 20 : 19,
        workDays: salon.zone === 'Punta del Este' ? [2, 3, 4, 5, 6, 0] : [1, 2, 3, 4, 5, 6],
      });

      const tenantRes = await client.query(
        `INSERT INTO tenants (slug, business_name, business_address, business_phone, brand_primary_color, brand_secondary_color,
          brand_logo_url, status, plan, notification_email, smtp_email, landing_enabled, landing_description, landing_hero_image,
          opening_hours, category, lat, lng, trial_start_date, trial_end_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'active','free',$8,$8,true,$9,$10,$11,$12,$13,$14,NOW(), NOW() + INTERVAL '30 days')
         ON CONFLICT (slug) DO NOTHING RETURNING id`,
        [slug, salon.name, address, salon.phone || '+598 99 000 000', palette[0], palette[1],
         `/uploads/seed/logo-${slug}.svg`, `${slug}@test.com`, salon.desc, `/uploads/seed/hero-${slug}.svg`,
         tzHours, salon.category, lat, lng]
      );
      const tenantId = tenantRes.rows[0] && tenantRes.rows[0].id;
      if (!tenantId) {
        await client.query('ROLLBACK');
        skipped++;
        continue;
      }

      for (let si = 0; si < salon.staff.length; si++) {
        const s = salon.staff[si];
        await client.query(
          `INSERT INTO staff (tenant_id, email, password, name, role, specialties) VALUES ($1,$2,$3,$4,'admin',$5)`,
          [tenantId, si === 0 ? `${slug}@test.com` : `${slug}-${si}@test.com`, hashed, s, [s.split(' ')[0]]]
        );
      }
      for (const svc of salon.services) {
        await client.query(
          `INSERT INTO services (tenant_id, name, duration, price, active, category) VALUES ($1,$2,$3,$4,true,$5)`,
          [tenantId, svc.name, svc.duration, svc.price, salon.category]
        );
      }
      await client.query('COMMIT');
      created++;
      console.log(`  ✓ ${salon.name} (${salon.category}/${salon.gender}) — ${slug} @ ${address}`);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  const total = await pool.query('SELECT COUNT(*)::int AS c FROM tenants');
  const byGender = await pool.query(`SELECT
      COUNT(*) FILTER (WHERE business_name ILIKE '%barber%' OR landing_description ILIKE '%barba%') AS men,
      COUNT(*) AS total FROM tenants`);
  console.log(`\n✅ Creados: ${created} | Saltados: ${skipped} | Total tenants en DB: ${total.rows[0].c}`);
  console.log('📁 Imágenes SVG en:', UPLOADS_DIR);
  await pool.end();
}

main().catch(async (e) => {
  console.error('❌', e.message);
  await pool.end();
  process.exit(1);
});
