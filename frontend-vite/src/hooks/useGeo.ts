import { useEffect, useState } from 'react';

interface CountryNames {
  es: string;
  en: string;
  pt: string;
}

const COUNTRY_MAP: Record<string, CountryNames> = {
  AR: { es: 'Argentina', en: 'Argentina', pt: 'Argentina' },
  BO: { es: 'Bolivia', en: 'Bolivia', pt: 'Bolívia' },
  BR: { es: 'Brasil', en: 'Brazil', pt: 'Brasil' },
  CL: { es: 'Chile', en: 'Chile', pt: 'Chile' },
  CO: { es: 'Colombia', en: 'Colombia', pt: 'Colômbia' },
  CR: { es: 'Costa Rica', en: 'Costa Rica', pt: 'Costa Rica' },
  CU: { es: 'Cuba', en: 'Cuba', pt: 'Cuba' },
  DO: { es: 'República Dominicana', en: 'Dominican Republic', pt: 'República Dominicana' },
  EC: { es: 'Ecuador', en: 'Ecuador', pt: 'Equador' },
  ES: { es: 'España', en: 'Spain', pt: 'Espanha' },
  GT: { es: 'Guatemala', en: 'Guatemala', pt: 'Guatemala' },
  HN: { es: 'Honduras', en: 'Honduras', pt: 'Honduras' },
  MX: { es: 'México', en: 'Mexico', pt: 'México' },
  NI: { es: 'Nicaragua', en: 'Nicaragua', pt: 'Nicarágua' },
  PA: { es: 'Panamá', en: 'Panama', pt: 'Panamá' },
  PE: { es: 'Perú', en: 'Peru', pt: 'Peru' },
  PR: { es: 'Puerto Rico', en: 'Puerto Rico', pt: 'Porto Rico' },
  PY: { es: 'Paraguay', en: 'Paraguay', pt: 'Paraguai' },
  SV: { es: 'El Salvador', en: 'El Salvador', pt: 'El Salvador' },
  US: { es: 'Estados Unidos', en: 'the United States', pt: 'Estados Unidos' },
  UY: { es: 'Uruguay', en: 'Uruguay', pt: 'Uruguai' },
  VE: { es: 'Venezuela', en: 'Venezuela', pt: 'Venezuela' },
};

const TZ_TO_COUNTRY: Record<string, string> = {
  // Argentina
  Argentina: 'AR', Buenos_Aires: 'AR', Cordoba: 'AR', Salta: 'AR', Jujuy: 'AR',
  La_Rioja: 'AR', Mendoza: 'AR', San_Luis: 'AR', Catamarca: 'AR',
  // Bolivia
  La_Paz: 'BO',
  // Brazil
  Brazil: 'BR', Belem: 'BR', Fortaleza: 'BR', Recife: 'BR', Manaus: 'BR',
  Sao_Paulo: 'BR', Santarem: 'BR', Noronha: 'BR', Cuiaba: 'BR', Porto_Velho: 'BR',
  Boa_Vista: 'BR', Campo_Grande: 'BR', Eirunepe: 'BR', Rio_Branco: 'BR',
  // Chile
  Chile: 'CL', Santiago: 'CL', Punta_Arenas: 'CL', Easter: 'CL',
  // Colombia
  Colombia: 'CO', Bogota: 'CO',
  // Costa Rica
  Costa_Rica: 'CR',
  // Cuba
  Cuba: 'CU', Havana: 'CU',
  // Dominican Republic
  Dominican_Republic: 'DO', Santo_Domingo: 'DO',
  // Ecuador
  Ecuador: 'EC', Guayaquil: 'EC', Galapagos: 'EC',
  // El Salvador
  El_Salvador: 'SV',
  // Guatemala
  Guatemala: 'GT',
  // Honduras
  Honduras: 'HN', Tegucigalpa: 'HN',
  // Mexico
  Mexico: 'MX', Mexico_City: 'MX', Cancun: 'MX', Hermosillo: 'MX', Mazatlan: 'MX',
  Tijuana: 'MX', Chihuahua: 'MX', Ojinaga: 'MX', Monterrey: 'MX', Bahia_Banderas: 'MX',
  Merida: 'MX',
  // Nicaragua
  Nicaragua: 'NI', Managua: 'NI',
  // Panama
  Panama: 'PA',
  // Paraguay
  Paraguay: 'PY', Asuncion: 'PY',
  // Peru
  Peru: 'PE', Lima: 'PE',
  // Puerto Rico
  Puerto_Rico: 'PR',
  // Spain
  Spain: 'ES', Madrid: 'ES', Barcelona: 'ES', Ceuta: 'ES', Canary: 'ES',
  // United States
  New_York: 'US', Chicago: 'US', Los_Angeles: 'US', Miami: 'US', Denver: 'US',
  Phoenix: 'US', Dallas: 'US', Houston: 'US', Atlanta: 'US', Boston: 'US',
  Detroit: 'US', Juneau: 'US', Metlakatla: 'US', Sitka: 'US', Yakutat: 'US',
  Anchorage: 'US', Nome: 'US', Adak: 'US', Honolulu: 'US', Boise: 'US',
  Indianapolis: 'US', Louisville: 'US', Menominee: 'US', Nashville: 'US',
  Tell_City: 'US', Beulah: 'US', Center: 'US', New_Salem: 'US', Knox: 'US',
  North_Dakota: 'US', Denmark: 'US', Monticello: 'US', Vincennes: 'US',
  Winamac: 'US', Marengo: 'US', Petersburg: 'US', Vevay: 'US',
  // Uruguay
  Uruguay: 'UY', Montevideo: 'UY',
  // Venezuela
  Venezuela: 'VE', Caracas: 'VE',
};

function detectCountryCode(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return 'UY';
    const parts = tz.split('/');
    for (let i = parts.length - 1; i >= 0; i--) {
      const code = TZ_TO_COUNTRY[parts[i]];
      if (code) return code;
    }
  } catch {}
  return 'UY';
}

export function useGeo(lng: string = 'es') {
  const [country, setCountry] = useState<string>('');

  useEffect(() => {
    const code = detectCountryCode();
    const names = COUNTRY_MAP[code];
    const lang = lng.startsWith('pt') ? 'pt' : lng.startsWith('en') ? 'en' : 'es';
    setCountry(names ? names[lang] : '');
  }, [lng]);

  return { country, countryCode: '' };
}
