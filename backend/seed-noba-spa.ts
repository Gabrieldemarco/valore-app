import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
require('dotenv').config();
import logger from './services/logger';

const isLocal = (process.env.DATABASE_URL || '').includes('localhost') || (process.env.DATABASE_URL || '').includes('127.0.0.1');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

const query = async (text: string, params?: any[]) => {
  const client = await pool.connect();
  try {
    return await client.query({ text, values: params });
  } finally {
    client.release();
  }
};

interface ServiceDef {
  name: string;
  duration: number;
  price: number;
  category: string;
  description: string;
}

const CATEGORIES = [
  'Cejas',
  'Depilación Facial',
  'Labios',
  'Manos',
  'Otros',
  'Pestañas',
  'Pies',
];

const SERVICES: ServiceDef[] = [
  // Cejas
  { name: 'Diseño de Cejas', duration: 30, price: 800, category: 'Cejas', description: 'Perfilado y diseño personalizado de cejas según tu rostro' },
  { name: 'Laminado de Cejas', duration: 45, price: 1200, category: 'Cejas', description: 'Alisado y fijación de cejas para un look pulido por semanas' },
  { name: 'Henna para Cejas', duration: 20, price: 600, category: 'Cejas', description: 'Color semipermanente natural que realza la forma de tus cejas' },
  { name: 'Microblading Retoque', duration: 60, price: 2500, category: 'Cejas', description: 'Retoque de微blading para mantener el diseño perfecto' },

  // Depilación Facial
  { name: 'Depilación con Hilo', duration: 20, price: 500, category: 'Depilación Facial', description: 'Técnica milenaria de depilación con hilo para precisión absoluta' },
  { name: 'Depilación Labio Superior', duration: 10, price: 300, category: 'Depilación Facial', description: 'Eliminación suave y rápida del vello del labio superior' },
  { name: 'Depilación Facial Completa', duration: 30, price: 900, category: 'Depilación Facial', description: 'Depilación integral de rostro incluyendo mejillas, mentón y frente' },
  { name: 'Cera Facial', duration: 15, price: 450, category: 'Depilación Facial', description: 'Cera hipoalergénica para rostro con resultados duraderos' },

  // Labios
  { name: 'Hidratación Labial Profunda', duration: 20, price: 500, category: 'Labios', description: 'Tratamiento intensivo con ácido hialurónico para labios hidratados' },
  { name: 'Exfoliación y Color Labial', duration: 25, price: 700, category: 'Labios', description: 'Exfoliación suave más aplicación de color natural semipermanente' },
  { name: 'Perfilado de Labios', duration: 30, price: 900, category: 'Labios', description: 'Delineado y corrección de asimetría labial con técnica avanzada' },

  // Manos
  { name: 'Manicura Clásica', duration: 40, price: 800, category: 'Manos', description: 'Corte, limado, cutículas y esmaltado tradicional' },
  { name: 'Esmaltado Semipermanente', duration: 50, price: 1100, category: 'Manos', description: 'Esmaltado de larga duración con brillo intenso por 3 semanas' },
  { name: 'Kapping en Gel', duration: 90, price: 1800, category: 'Manos', description: 'Refuerzo de uñas con gel para un acabado natural y resistente' },
  { name: 'Esculpidas en Gel', duration: 120, price: 2500, category: 'Manos', description: 'Uñas esculpidas con gel, personalizadas en forma y largo' },

  // Otros
  { name: 'Masaje Capilar', duration: 30, price: 600, category: 'Otros', description: 'Masaje relajante del cuero cabelludo con aceites esenciales' },
  { name: 'Tratamiento Capilar Keratina', duration: 60, price: 1500, category: 'Otros', description: 'Tratamiento reconstructor con keratina para cabello dañado' },
  { name: 'Belleza de Párpados', duration: 20, price: 500, category: 'Otros', description: 'Cuidado y embellecimiento de la zona del párpado' },
  { name: 'Maquillaje Social', duration: 45, price: 1200, category: 'Otros', description: 'Maquillaje profesional para eventos y ocasiones especiales' },

  // Pestañas
  { name: 'Lifting de Pestañas', duration: 45, price: 1000, category: 'Pestañas', description: 'Curvado y realzado de pestañas naturales con efecto lifting' },
  { name: 'Extensiones de Pestañas 1:1', duration: 90, price: 2000, category: 'Pestañas', description: 'Extensión pelo a pelo para una mirada natural y seductora' },
  { name: 'Extensiones Volumen Ruso', duration: 120, price: 2800, category: 'Pestañas', description: 'Técnica de volumen con múltiples extensiones ultrafinas' },
  { name: 'Tinte de Pestañas', duration: 20, price: 500, category: 'Pestañas', description: 'Coloración profesional para pestañas más oscuras sin máscara' },

  // Pies
  { name: 'Pedicura Clásica', duration: 40, price: 900, category: 'Pies', description: 'Cuidado completo de pies con corte, cutículas y esmaltado' },
  { name: 'Pedicura Semipermanente', duration: 50, price: 1200, category: 'Pies', description: 'Esmaltado semipermanente en pies con duración de 3-4 semanas' },
];

const FAKE_REVIEWS = [
  { client_name: 'María González', rating: 5, comment: 'Excelente atención y resultados increíbles. Súper recomendable el laminado de cejas.' },
  { client_name: 'Sofía Rodríguez', rating: 5, comment: 'Muy profesional y dedicada. La pedicura quedó perfecta. Volveré sin dudas.' },
  { client_name: 'Lucía Martínez', rating: 5, comment: 'Un lugar hermoso con un trato cálido. Me hicieron sentir mimada de principio a fin.' },
  { client_name: 'Carla Fernández', rating: 4, comment: 'Buen servicio y calidad, aunque los precios son un poco elevados. Igual vale la pena.' },
];

async function seedNobaSpa() {
  try {
    const bizName = 'Noba Spa';
    const slug = 'noba-spa';

    const existing = await query('SELECT id FROM tenants WHERE business_name = $1', [bizName]);
    if (existing.rows.length > 0) {
      const tenantId = existing.rows[0].id;
      logger.info(`  ∃ ${bizName} (slug: ${slug}) — ya existe (id: ${tenantId}), eliminando servicios previos...`);
      await query('DELETE FROM service_images WHERE service_id IN (SELECT id FROM services WHERE tenant_id = $1)', [tenantId]);
      await query('DELETE FROM reviews WHERE tenant_id = $1', [tenantId]);
      await query('DELETE FROM services WHERE tenant_id = $1', [tenantId]);
      logger.info(`  Datos previos de servicios y reseñas eliminados.`);
    }

    const email = `admin@nobaspa.com`;
    const hashedPassword = await bcrypt.hash('noba123456', 10);

    let tenantId: number;
    const existingTenant = await query('SELECT id FROM tenants WHERE slug = $1', [slug]);
    if (existingTenant.rows.length > 0) {
      tenantId = existingTenant.rows[0].id;
      logger.info(`  Tenant existente (id: ${tenantId}), actualizando datos...`);
      await query(
        `UPDATE tenants SET business_name=$1, business_address=$2, business_phone=$3, notification_email=$4, category=$5, landing_enabled=true, status='active', opening_hours=$6, trial_start_date=NOW(), trial_end_date=NOW() + INTERVAL '30 days' WHERE id=$7`,
        [bizName, 'Av. Siempre Viva 123, Montevideo', '+598 91 234 567', email, 'masajes',
         JSON.stringify({ startHour: 9, endHour: 20, workDays: [1, 2, 3, 4, 5, 6] }), tenantId]
      );
      const staffExists = await query('SELECT id FROM staff WHERE email=$1 AND tenant_id=$2', [email, tenantId]);
      if (staffExists.rows.length === 0) {
        await query(
          `INSERT INTO staff (tenant_id, email, password, name, role) VALUES ($1, $2, $3, $4, 'admin')`,
          [tenantId, email, hashedPassword, bizName]
        );
        logger.info(`  Staff admin creado: ${email} / noba123456`);
      }
    } else {
      const tenantRes = await query(
        `INSERT INTO tenants (slug, business_name, business_address, business_phone, notification_email, landing_enabled, status, opening_hours, plan, category, trial_start_date, trial_end_date)
         VALUES ($1, $2, $3, $4, $5, true, 'active', $6, 'free', $7, NOW(), NOW() + INTERVAL '30 days') RETURNING id`,
        [slug, bizName, 'Av. Siempre Viva 123, Montevideo', '+598 91 234 567', email,
         JSON.stringify({ startHour: 9, endHour: 20, workDays: [1, 2, 3, 4, 5, 6] }), 'masajes']
      );
      tenantId = tenantRes.rows[0].id;

      await query(
        `INSERT INTO staff (tenant_id, email, password, name, role) VALUES ($1, $2, $3, $4, 'admin')`,
        [tenantId, email, hashedPassword, bizName]
      );
      logger.info(`  Staff admin creado: ${email} / noba123456`);
    }

    logger.info(`  Insertando ${SERVICES.length} servicios...`);
    for (const svc of SERVICES) {
      await query(
        `INSERT INTO services (tenant_id, name, duration, price, category, description, active)
         VALUES ($1, $2, $3, $4, $5, $6, true)`,
        [tenantId, svc.name, svc.duration, svc.price, svc.category, svc.description]
      );
    }

    const servicesResult = await query(
      'SELECT id, name, category FROM services WHERE tenant_id = $1 ORDER BY category, name',
      [tenantId]
    );

    logger.info(`  Insertando imágenes placeholder para cada servicio...`);
    const placeholderBase = '/uploads/placeholders';
    for (const row of servicesResult.rows) {
      const numImages = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < numImages; i++) {
        const categorySlug = row.category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
        const url = `${placeholderBase}/${categorySlug}-${i + 1}.jpg`;
        await query(
          `INSERT INTO service_images (service_id, url, sort_order) VALUES ($1, $2, $3)`,
          [row.id, url, i]
        );
      }
    }

    logger.info(`  Insertando ${FAKE_REVIEWS.length} reseñas de ejemplo...`);
    for (const rev of FAKE_REVIEWS) {
      await query(
        `INSERT INTO reviews (tenant_id, client_name, rating, comment, approved) VALUES ($1, $2, $3, $4, true)`,
        [tenantId, rev.client_name, rev.rating, rev.comment]
      );
    }

    logger.info(`\n✅ Noba Spa creado exitosamente!`);
    logger.info(`   Slug: ${slug}`);
    logger.info(`   Admin: admin@nobaspa.com / noba123456`);
    logger.info(`   Servicios: ${servicesResult.rows.length}`);
    logger.info(`   Imágenes insertadas`);
    logger.info(`   Reseñas: ${FAKE_REVIEWS.length}`);
    logger.info(`   Landing: http://localhost:5173/p/${slug}`);
    logger.info(`   Dashboard: http://localhost:5173/dashboard (login: admin@nobaspa.com / noba123456)`);
  } catch (err) {
    logger.error('❌ Error en seed Noba Spa:', err);
  } finally {
    await pool.end();
  }
}

seedNobaSpa();
