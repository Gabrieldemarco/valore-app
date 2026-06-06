import fs from 'fs';
import path from 'path';

const localesPath = path.join(__dirname, '..', 'locales');
const cache: Record<string, any> = {};

function loadLocale(locale: string): any {
  if (cache[locale]) return cache[locale];
  try {
    const filePath = path.join(localesPath, `${locale}.json`);
    if (!fs.existsSync(filePath)) {
      cache[locale] = loadLocale('es');
      return cache[locale];
    }
    cache[locale] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return cache[locale];
  } catch {
    cache[locale] = {};
    return cache[locale];
  }
}

/** Normaliza un código de locale como 'es', 'en', 'pt' */
export function parseLocale(header?: string): string {
  if (!header) return 'es';
  const locales = header.split(',').map(l => l.split(';')[0].trim().split('-')[0].toLowerCase());
  for (const l of locales) {
    if (['es', 'en', 'pt'].includes(l)) return l;
  }
  return 'es';
}

/** Middleware que inyecta req.t() para traducciones */
export function i18nMiddleware(req: any, _res: any, next: any) {
  const locale = parseLocale(req.headers['accept-language']);
  const messages = loadLocale(locale);
  req.locale = locale;
  req.t = (key: string, params?: Record<string, any>): string => {
    const keys = key.split('.');
    let val: any = messages;
    for (const k of keys) {
      if (val == null) return key;
      val = val[k];
    }
    if (typeof val !== 'string') return key;
    if (params) {
      return val.replace(/\{(\w+)\}/g, (_, p) => String(params[p] ?? `{${p}}`));
    }
    return val;
  };
  next();
}

/** Función auxiliar para usar fuera de un request */
export function t(locale: string, key: string, params?: Record<string, any>): string {
  const messages = loadLocale(parseLocale(locale));
  const keys = key.split('.');
  let val: any = messages;
  for (const k of keys) {
    if (val == null) return key;
    val = val[k];
  }
  if (typeof val !== 'string') return key;
  if (params) {
    return val.replace(/\{(\w+)\}/g, (_, p) => String(params[p] ?? `{${p}}`));
  }
  return val;
}
