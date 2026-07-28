interface ServiceCategory {
  key: string;
  labelKey: string;
  image: string;
  keywords: string[];
}

export const SERVICE_CATEGORIES_DATA: ServiceCategory[] = [
  {
    key: 'cejas', labelKey: 'publicIndex.catCejas', image: '/uploads/category-cejas.png',
    keywords: ['ceja', 'pestaña', 'henna', 'lifting', 'laminado', 'diseño de ceja']
  },
  {
    key: 'uñas', labelKey: 'publicIndex.catUnas', image: '/uploads/category-unas.png',
    keywords: ['manicura', 'pedicura', 'uña', 'nail', 'esmaltado', 'semipermanente', 'kapping', 'esculpida', 'acrílica', 'gel']
  },
  {
    key: 'maquillaje', labelKey: 'publicIndex.catMaquillaje', image: '/uploads/category-maquillaje.jpeg',
    keywords: ['maquillaje', 'makeup', 'social', 'novia']
  },
  {
    key: 'facial', labelKey: 'publicIndex.catFacial', image: '/uploads/category-facial.png',
    keywords: ['facial', 'limpieza facial', 'hidratación', 'skin care', 'dermaplaning']
  },
  {
    key: 'depilacion', labelKey: 'publicIndex.catDepilacion', image: '/uploads/category-depilacion.png',
    keywords: ['depilación', 'depilacion', 'cera', 'laser']
  },
  {
    key: 'masajes', labelKey: 'publicIndex.catMasajes', image: '/uploads/category-masajes.png',
    keywords: ['masaje', 'masajes', 'bienestar', 'relajación', 'relajante']
  },
];
