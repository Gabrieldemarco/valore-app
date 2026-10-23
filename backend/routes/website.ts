import { Router } from 'express';
import { body, param, query as queryValidator } from 'express-validator';
import { query, queryOne } from '../database';
import { authenticate, authenticateStaff, validate } from '../middleware';
import logger from '../services/logger';

const router = Router();

// All routes require staff authentication
router.use(authenticateStaff);

/* ============================================================
   Website Config CRUD
   ============================================================ */

// GET /api/tenant/website - Get website config for current tenant
router.get('/tenant/website', async (req: any, res) => {
  logger.debug('[website.ts] GET /tenant/website handler called');
  try {
    const tenantId = req.tenantId;
    
    const result = await queryOne(
      `SELECT config, status, published_at, updated_at 
       FROM tenant_websites 
       WHERE tenant_id = $1`,
      [tenantId]
    );
    
    if (!result) {
      return res.json({
        config: null,
        status: 'draft',
        message: 'No website configured yet',
      });
    }
    
    res.json({
      config: result.config,
      status: result.status,
      publishedAt: result.published_at,
      updatedAt: result.updated_at,
    });
  } catch (err: any) {
    logger.error('Error fetching website config:', err);
    res.status(500).json({ error: 'Error al cargar configuración del sitio' });
  }
});

// POST /api/tenant/website - Create or update website config (save draft)
const saveWebsiteConfig = async (req: any, res: any) => {
  try {
    const tenantId = req.tenantId;
    const { config, status = 'draft' } = req.body;
    
    const { SiteConfigSchema } = require('../schemas/website');
    const validation = SiteConfigSchema.safeParse(config);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Configuración inválida', 
        details: validation.error.errors 
      });
    }
    
    const siteConfig = {
      ...validation.data,
      tenantId,
      updatedAt: new Date().toISOString(),
    };
    
    if (status === 'published') {
      siteConfig.status = 'published';
      siteConfig.publishedAt = new Date().toISOString();
    }
    
    await query(
      `INSERT INTO tenant_websites (tenant_id, config, status, published_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tenant_id) DO UPDATE SET
         config = $2,
         status = $3,
         published_at = $4,
         updated_at = $5`,
      [tenantId, JSON.stringify(siteConfig), siteConfig.status, siteConfig.publishedAt || null, siteConfig.updatedAt]
    );
    
    logger.info(`Website config saved for tenant ${tenantId}`, { status: siteConfig.status });
    
    res.json({ 
      message: status === 'published' ? 'Sitio publicado' : 'Borrador guardado',
      config: siteConfig,
    });
  } catch (err: any) {
    logger.error('Error saving website config:', err);
    res.status(500).json({ error: 'Error al guardar configuración' });
  }
};

router.post('/tenant/website', 
  authenticateStaff,
  [
    body('config').isObject().withMessage('Config debe ser un objeto'),
    body('config.template').isIn(['elegant', 'modern', 'minimal']).withMessage('Plantilla inválida'),
    body('config.blocks').isArray().withMessage('Blocks debe ser un array'),
    body('config.theme').isObject().withMessage('Theme debe ser un objeto'),
    body('config.seo').optional().isObject(),
  ],
  validate,
  saveWebsiteConfig
);

// PUT /api/tenant/website - Update website config (alias for POST)
router.put('/tenant/website', 
  authenticateStaff,
  [
    body('config').isObject().withMessage('Config debe ser un objeto'),
    body('config.template').isIn(['elegant', 'modern', 'minimal']).withMessage('Plantilla inválida'),
    body('config.blocks').isArray().withMessage('Blocks debe ser un array'),
    body('config.theme').isObject().withMessage('Theme debe ser un objeto'),
    body('config.seo').optional().isObject(),
  ],
  validate,
  saveWebsiteConfig
);

// DELETE /api/tenant/website - Delete website config
router.delete('/tenant/website', async (req: any, res) => {
  try {
    const tenantId = req.tenantId;
    
    await query('DELETE FROM tenant_websites WHERE tenant_id = $1', [tenantId]);
    
    logger.info(`Website config deleted for tenant ${tenantId}`);
    res.json({ message: 'Configuración del sitio eliminada' });
  } catch (err: any) {
    logger.error('Error deleting website config:', err);
    res.status(500).json({ error: 'Error al eliminar configuración' });
  }
});

/* ============================================================
   Preview & Publish
   ============================================================ */

// POST /api/tenant/website/preview - Generate preview token
router.post('/tenant/website/preview', async (req: any, res) => {
  try {
    const tenantId = req.tenantId;
    const { config } = req.body;
    
    if (!config) {
      return res.status(400).json({ error: 'Configuración requerida' });
    }
    
    const { SiteConfigSchema } = require('../schemas/website');
    const validation = SiteConfigSchema.safeParse(config);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Configuración inválida', 
        details: validation.error.errors 
      });
    }
    
    const crypto = require('crypto');
    const previewToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    
    await query(
      `INSERT INTO website_previews (token, tenant_id, config, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tenant_id) DO UPDATE SET
         token = $1, config = $3, expires_at = $4`,
      [previewToken, tenantId, JSON.stringify(validation.data), expiresAt]
    );
    
    res.json({ 
      previewUrl: `/preview/${previewToken}`,
      token: previewToken,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err: any) {
    logger.error('Error creating preview:', err);
    res.status(500).json({ error: 'Error al crear vista previa' });
  }
});

// POST /api/tenant/website/publish - Publish current draft
router.post('/tenant/website/publish', async (req: any, res) => {
  try {
    const tenantId = req.tenantId;
    
    const result = await query(
      `UPDATE tenant_websites 
       SET status = 'published', published_at = NOW(), updated_at = NOW()
       WHERE tenant_id = $1 AND status = 'draft'
       RETURNING config`,
      [tenantId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'No hay borrador para publicar' });
    }
    
    logger.info(`Website published for tenant ${tenantId}`);
    res.json({ 
      message: 'Sitio publicado correctamente',
      config: result.rows[0].config,
    });
  } catch (err: any) {
    logger.error('Error publishing website:', err);
    res.status(500).json({ error: 'Error al publicar sitio' });
  }
});

// POST /api/tenant/website/unpublish - Unpublish site
router.post('/api/tenant/website/unpublish', async (req: any, res) => {
  try {
    const tenantId = req.tenantId;
    
    await query(
      `UPDATE tenant_websites 
       SET status = 'draft', updated_at = NOW()
       WHERE tenant_id = $1`,
      [tenantId]
    );
    
    logger.info(`Website unpublished for tenant ${tenantId}`);
    res.json({ message: 'Sitio despublicado (borrador)' });
  } catch (err: any) {
    logger.error('Error unpublishing website:', err);
    res.status(500).json({ error: 'Error al despublicar sitio' });
  }
});

/* ============================================================
   Image Upload
   ============================================================ */

router.post('/tenant/website/images', async (req: any, res) => {
  try {
    const tenantId = req.tenantId;
    const { image, filename, blockId, blockType } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'Imagen requerida' });
    }
    
    const matches = image.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Formato de imagen inválido' });
    }
    
    const mimeType = matches[1].toLowerCase();
    const allowedTypes = ['jpeg', 'jpg', 'png', 'gif', 'webp'];
    const ext = allowedTypes.find(t => mimeType === t || (mimeType === 'jpeg' && t === 'jpg'));
    
    if (!ext) {
      return res.status(400).json({ error: 'Tipo de imagen no soportado' });
    }
    
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Imagen muy grande (max 5MB)' });
    }
    
    const fs = require('fs');
    const path = require('path');
    const crypto = require('crypto');
    
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'websites', String(tenantId));
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    
    const uniqueName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const filepath = path.join(uploadsDir, uniqueName);
    
    await fs.promises.writeFile(filepath, buffer);
    
    const imageUrl = `/uploads/websites/${tenantId}/${uniqueName}`;
    
    logger.info(`Website image uploaded for tenant ${tenantId}: ${imageUrl}`);
    
    res.json({ 
      success: true, 
      url: imageUrl,
      message: 'Imagen subida correctamente',
    });
  } catch (err: any) {
    logger.error('Error uploading website image:', err);
    res.status(500).json({ error: 'Error al subir imagen' });
  }
});

router.delete('/tenant/website/images', async (req: any, res) => {
  try {
    const tenantId = req.tenantId;
    const { url } = req.body;
    
    if (!url || !url.startsWith(`/uploads/websites/${tenantId}/`)) {
      return res.status(400).json({ error: 'URL de imagen inválida' });
    }
    
    const fs = require('fs');
    const path = require('path');
    const filepath = path.join(__dirname, '..', url);
    
    if (fs.existsSync(filepath)) {
      await fs.promises.unlink(filepath);
    }
    
    res.json({ message: 'Imagen eliminada' });
  } catch (err: any) {
    logger.error('Error deleting website image:', err);
    res.status(500).json({ error: 'Error al eliminar imagen' });
  }
});

/* ============================================================
   Image Classification (AI)
   ============================================================ */

router.post('/tenant/website/classify-images', async (req: any, res) => {
  try {
    const { images } = req.body;
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'No hay imágenes para clasificar' });
    }
    
    if (images.length > 20) {
      return res.status(400).json({ error: 'Máximo 20 imágenes por solicitud' });
    }
    
    const { aiClassifier } = require('../lib/aiClassifier');
    const result = await aiClassifier.classify(images);
    
    res.json(result);
  } catch (err: any) {
    logger.error('Error classifying images:', err);
    res.status(500).json({ error: 'Error al clasificar imágenes' });
  }
});

/* ============================================================
   Template Management
   ============================================================ */

router.get('/templates', async (req, res) => {
  try {
    const { TEMPLATE_REGISTRY, AVAILABLE_TEMPLATES } = require('../../frontend-vite/src/features/website-studio/components/templates');
    
    res.json({
      templates: AVAILABLE_TEMPLATES.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        previewImage: t.previewImage,
      })),
    });
  } catch (err: any) {
    logger.error('Error fetching templates:', err);
    res.status(500).json({ error: 'Error al cargar plantillas' });
  }
});

router.get('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const templates = {
      elegant: {
        id: 'elegant',
        name: 'Elegante',
        description: 'Diseño clásico y sofisticado con tipografía serif y acentos dorados. Ideal para salones premium y spas.',
        previewImage: '/templates/elegant-preview.jpg',
        colorSchemes: {
          default: { name: 'Dorado Clásico', primary: '#1a1a2e', secondary: '#cfa86b' },
          midnight: { name: 'Midnight Navy', primary: '#0a0a1a', secondary: '#b8965b' },
          champagne: { name: 'Champagne', primary: '#1f1a17', secondary: '#d4bf9a' },
          emerald: { name: 'Esmeralda', primary: '#0a1a12', secondary: '#6abf8b' },
          burgundy: { name: 'Borgoña', primary: '#1a0a0f', secondary: '#b85c7a' },
        },
        defaultColorScheme: 'default',
        blocks: ['hero', 'about', 'services', 'gallery', 'team', 'reviews', 'contact', 'cta'],
        defaultBlocks: [
          { type: 'hero', order: 0 },
          { type: 'about', order: 1 },
          { type: 'services', order: 2 },
          { type: 'gallery', order: 3 },
          { type: 'team', order: 4 },
          { type: 'reviews', order: 5 },
          { type: 'contact', order: 6 },
          { type: 'cta', order: 7 },
        ],
      },
      modern: {
        id: 'modern',
        name: 'Moderno',
        description: 'Diseño minimalista y arquitectónico con tipografía geométrica. Ideal para barberías y salones contemporáneos.',
        previewImage: '/templates/modern-preview.jpg',
        colorSchemes: {
          default: { name: 'Blanco y Negro', primary: '#0f0f0f', secondary: '#ffffff' },
          mono: { name: 'Monocromo', primary: '#1a1a1a', secondary: '#e5e5e5' },
          dark: { name: 'Oscuro', primary: '#000000', secondary: '#f5f5f5' },
          accent: { name: 'Acento Cian', primary: '#0a0a0a', secondary: '#00d4ff' },
        },
        defaultColorScheme: 'default',
        blocks: ['hero', 'services', 'gallery', 'team', 'cta', 'contact'],
        defaultBlocks: [
          { type: 'hero', order: 0 },
          { type: 'services', order: 1 },
          { type: 'gallery', order: 2 },
          { type: 'team', order: 3 },
          { type: 'cta', order: 4 },
          { type: 'contact', order: 5 },
        ],
      },
      minimal: {
        id: 'minimal',
        name: 'Minimal',
        description: 'Diseño ultra-limpio y funcional. Máxima legibilidad y velocidad. Ideal para salones que buscan simplicidad.',
        previewImage: '/templates/minimal-preview.jpg',
        colorSchemes: {
          default: { name: 'Blanco y Negro', primary: '#111111', secondary: '#666666' },
          warm: { name: 'Cálido', primary: '#1a1512', secondary: '#a89a8a' },
          cool: { name: 'Frío', primary: '#0d1117', secondary: '#8b949e' },
          mono: { name: 'Monocromo', primary: '#000000', secondary: '#ffffff' },
        },
        defaultColorScheme: 'default',
        blocks: ['hero', 'services', 'about', 'contact'],
        defaultBlocks: [
          { type: 'hero', order: 0 },
          { type: 'services', order: 1 },
          { type: 'about', order: 2 },
          { type: 'contact', order: 3 },
        ],
      },
    };
    
    if (!templates[id]) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }
    
    res.json(templates[id]);
  } catch (err: any) {
    logger.error('Error fetching template:', err);
    res.status(500).json({ error: 'Error al cargar plantilla' });
  }
});

export default router;