/* ============================================================
   AI Image Classifier - Stub Implementation
   ============================================================
   
   This is a stub implementation. In production, replace with:
   - GPT-4V / Claude 3.5 Sonnet / Gemini Pro Vision API calls
   - Local model (CLIP, BLIP, or custom fine-tuned model)
   - Cloudflare Workers AI / Replicate / Hugging Face Inference
   
   The classifier analyzes uploaded salon images and suggests
   where to place them in the website template.
   ============================================================ */

export interface ImageClassification {
  url: string;
  filename: string;
  category: 'hero' | 'gallery' | 'service' | 'team' | 'about' | 'logo' | 'other';
  confidence: number; // 0-1
  suggestedBlockType: 'hero' | 'gallery' | 'services' | 'team' | 'about' | 'contact' | 'cta' | 'reviews';
  suggestedAlt: string;
  tags: string[];
  dominantColors: string[];
  metadata?: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

export interface ClassificationResult {
  classifications: ImageClassification[];
  summary: {
    totalImages: number;
    byCategory: Record<string, number>;
    suggestedTemplate: 'elegant' | 'modern' | 'minimal';
    suggestedColorScheme: string;
  };
  warnings: string[];
}

/* ============================================================
   Mock Classifier (Development/Testing)
   ============================================================ */

// Simulated classification based on filename/keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  hero: ['fachada', 'exterior', 'portada', 'hero', 'banner', 'main', 'principal', 'entrada'],
  gallery: ['trabajo', 'corte', 'color', 'balayage', 'mechas', 'peinado', 'uñas', 'manicura', 'pedicura', 'tratamiento', 'before', 'after', 'resultado'],
  service: ['servicio', 'menu', 'precio', 'lista', 'catalogo'],
  team: ['equipo', 'staff', 'empleado', 'peluquero', 'estilista', 'barbero', 'profesional', 'nosotros', 'staff'],
  about: ['interior', 'local', 'salon', 'espacio', 'ambiente', 'decoracion', 'reception', 'espera'],
  logo: ['logo', 'logotipo', 'marca', 'brand', 'isotipo', 'imagen corporativa'],
};

const SERVICE_TAGS = [
  'corte', 'corte hombre', 'corte mujer', 'barba', 'afeitado', 'color', 'tinte',
  'balayage', 'mechas', 'rayitos', 'keratina', 'alisado', 'tratamiento',
  'manicura', 'pedicura', 'uñas', 'esmaltado', 'gel', 'acrilico',
  'cejas', 'pestañas', 'laminado', 'microblading', 'depilacion',
  'masaje', 'spa', 'facial', 'limpieza facial', 'peeling',
];

function detectCategory(filename: string, metadata?: any): ImageClassification['category'] {
  const lower = filename.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) {
      return category as ImageClassification['category'];
    }
  }
  
  // Fallback: if image is landscape -> hero/gallery, portrait -> team/service
  if (metadata?.width && metadata?.height) {
    if (metadata.width > metadata.height * 1.5) return 'hero';
    if (metadata.height > metadata.width * 1.5) return 'team';
  }
  
  return 'gallery';
}

function detectTags(filename: string): string[] {
  const lower = filename.toLowerCase();
  return SERVICE_TAGS.filter(tag => lower.includes(tag.toLowerCase()));
}

function generateAltText(category: string, filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
  
  const templates: Record<string, string> = {
    hero: `Fachada principal del salón - ${base}`,
    gallery: `Trabajo realizado - ${base}`,
    service: `Servicio de ${base}`,
    team: `Miembro del equipo - ${base}`,
    about: `Interior del salón - ${base}`,
    logo: `Logo del salón`,
    other: `Imagen del salón - ${base}`,
  };
  
  return templates[category] || `Imagen - ${base}`;
}

function suggestBlockType(category: string): ImageClassification['suggestedBlockType'] {
  const mapping: Record<string, ImageClassification['suggestedBlockType']> = {
    hero: 'hero',
    gallery: 'gallery',
    service: 'services',
    team: 'team',
    about: 'about',
    logo: 'hero', // Logo goes in hero
    other: 'gallery',
  };
  return mapping[category] || 'gallery';
}

function extractDominantColors(_url: string): string[] {
  // In production, use a color extraction library
  // For now, return placeholder based on common salon aesthetics
  return ['#1a1a2e', '#cfa86b', '#ffffff', '#666666'];
}

/* ============================================================
   Main Classifier Function
   ============================================================ */

export async function classifyImages(
  files: Array<{ url: string; filename: string; metadata?: any }>
): Promise<ClassificationResult> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const classifications: ImageClassification[] = files.map(file => {
    const category = detectCategory(file.filename, file.metadata);
    const tags = detectTags(file.filename);
    const blockType = suggestBlockType(category);
    
    return {
      url: file.url,
      filename: file.filename,
      category,
      confidence: 0.75 + Math.random() * 0.2, // 0.75-0.95
      suggestedBlockType: blockType,
      suggestedAlt: generateAltText(category, file.filename),
      tags,
      dominantColors: extractDominantColors(file.url),
      metadata: file.metadata,
    };
  });
  
  // Count by category
  const byCategory: Record<string, number> = {};
  for (const c of classifications) {
    byCategory[c.category] = (byCategory[c.category] || 0) + 1;
  }
  
  // Suggest template based on image mix
  let suggestedTemplate: 'elegant' | 'modern' | 'minimal' = 'elegant';
  if (byCategory.gallery > byCategory.hero * 2) suggestedTemplate = 'modern';
  if (Object.keys(byCategory).length <= 3) suggestedTemplate = 'minimal';
  
  // Suggest color scheme based on dominant colors
  const allColors = classifications.flatMap(c => c.dominantColors);
  const colorCounts = allColors.reduce((acc, c) => ({ ...acc, [c]: (acc[c] || 0) + 1 }), {} as Record<string, number>);
  const topColor = Object.entries(colorCounts).sort(([,a], [,b]) => b - a)[0]?.[0];
  
  const colorSchemeMap: Record<string, string> = {
    '#1a1a2e': 'default',
    '#0f0f0f': 'mono',
    '#1f1a17': 'champagne',
    '#0a1a12': 'emerald',
    '#1a0a0f': 'burgundy',
  };
  const suggestedColorScheme = topColor ? colorSchemeMap[topColor] || 'default' : 'default';
  
  const warnings: string[] = [];
  if (classifications.length < 5) warnings.push('Se recomiendan al menos 5 imágenes para mejores resultados');
  if (classifications.length > 20) warnings.push('Máximo 20 imágenes recomendadas; las adicionales se ignorarán');
  if (!byCategory.logo) warnings.push('No se detectó logo; se usará el nombre del salón en texto');
  if (!byCategory.hero) warnings.push('No se detectó imagen de fachada; la portada usará un placeholder');
  
  return {
    classifications,
    summary: {
      totalImages: classifications.length,
      byCategory,
      suggestedTemplate,
      suggestedColorScheme,
    },
    warnings,
  };
}

/* ============================================================
   Production Integration Interface
   ============================================================ */

export interface AIClassifierProvider {
  classify(files: Array<{ url: string; filename: string; metadata?: any }>): Promise<ClassificationResult>;
}

/**
 * Replace this with your actual AI provider implementation:
 * 
 * ```typescript
 * export class OpenAIClassifier implements AIClassifierProvider {
 *   async classify(files) {
 *     const response = await fetch('https://api.openai.com/v1/chat/completions', {
 *       method: 'POST',
 *       headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
 *       body: JSON.stringify({
 *         model: 'gpt-4-vision-preview',
 *         messages: [{
 *           role: 'user',
 *           content: [
 *             { type: 'text', text: 'Analyze these salon images and classify each...' },
 *             ...files.map(f => ({ type: 'image_url', image_url: { url: f.url } }))
 *           ]
 *         }],
 *         max_tokens: 2000,
 *       })
 *     });
 *     // Parse response to ClassificationResult
 *   }
 * }
 * ```
 */

export const aiClassifier: AIClassifierProvider = {
  classify: classifyImages,
};