export const palettes = {
  vivid:      ['#6c63ff','#ff6584','#43e97b','#f7971e','#12c2e9','#a855f7','#ec4899','#14b8a6','#f59e0b','#3b82f6'],
  pastel:     ['#a78bfa','#f9a8d4','#86efac','#fde68a','#7dd3fc','#c4b5fd','#fbcfe8','#bbf7d0','#fef08a','#bae6fd'],
  neon:       ['#ff0080','#00ff88','#0080ff','#ffff00','#ff8000','#ff00ff','#00ffff','#80ff00','#8000ff','#ff0040'],
  earth:      ['#c1440e','#d4842a','#e6c067','#8fbc5c','#4e8b57','#a0522d','#6b4226','#cd853f','#deb887','#8b6914'],
  ocean:      ['#03045e','#0077b6','#0096c7','#00b4d8','#48cae4','#023e8a','#0090c1','#1bb5d4','#5ecbdf','#90e0ef'],
  sunset:     ['#ef476f','#f78c6b','#ffd166','#06d6a0','#118ab2','#ff6b6b','#ffa07a','#ff8c42','#f4a261','#e76f51'],
  forest:     ['#1b4332','#2d6a4f','#40916c','#52b788','#74c69d','#95d5b2','#081c15','#1b4332','#d8f3dc','#b7e4c7'],
  berry:      ['#3d0066','#6c1ac6','#9b59b6','#c39bd3','#7b2d8b','#a569bd','#d7bde2','#6c3483','#bb8fce','#e8daef'],
  candy:      ['#ff595e','#ff924c','#ffca3a','#8ac926','#1982c4','#6a4c93','#ff595e','#ff924c','#ffca3a','#8ac926'],
  nordic:     ['#5e81ac','#81a1c1','#88c0d0','#8fbcbb','#a3be8c','#ebcb8b','#d08770','#bf616a','#b48ead','#4c566a'],
  retro:      ['#e63946','#457b9d','#f4a261','#2a9d8f','#e9c46a','#264653','#1d3557','#e76f51','#06d6a0','#118ab2'],
  monochrome: ['#111827','#1f2937','#374151','#4b5563','#6b7280','#9ca3af','#d1d5db','#e5e7eb','#f3f4f6','#f9fafb'],
};

export type PaletteName = keyof typeof palettes;

export const paletteLabels: Record<PaletteName, string> = {
  vivid:      'Vivid',
  pastel:     'Pastel',
  neon:       'Neon',
  earth:      'Earth',
  ocean:      'Ocean',
  sunset:     'Sunset',
  forest:     'Forest',
  berry:      'Berry',
  candy:      'Candy',
  nordic:     'Nordic',
  retro:      'Retro',
  monochrome: 'Mono',
};

// Used as fallback in single mode
export const DISTINCT_20 = [
  '#6c63ff','#ff6584','#43e97b','#f7971e','#12c2e9',
  '#a855f7','#ec4899','#14b8a6','#f59e0b','#3b82f6',
  '#ef4444','#10b981','#fb923c','#06b6d4','#84cc16',
  '#e11d48','#0ea5e9','#d97706','#8b5cf6','#22d3ee',
];

export function getColorsForPalette(paletteName: PaletteName, count: number): string[] {
  const palette = palettes[paletteName];
  return Array.from({ length: count }, (_, i) => palette[i % palette.length]);
}

export function buildBarColors(entities: string[], paletteName: PaletteName): Map<string, string> {
  const colors = getColorsForPalette(paletteName, entities.length);
  return new Map(entities.map((name, i) => [name, colors[i]]));
}

export function buildCategoryColors(
  entityCategoryMap: Map<string, string>,
  paletteName: PaletteName,
): Map<string, string> {
  const catIndex = new Map<string, number>();
  const palette = palettes[paletteName];
  const map = new Map<string, string>();
  for (const [entity, cat] of entityCategoryMap) {
    if (!catIndex.has(cat)) catIndex.set(cat, catIndex.size);
    map.set(entity, palette[catIndex.get(cat)! % palette.length]);
  }
  return map;
}

export function parseSingleColorText(text: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of text.split('\n')) {
    const idx = line.lastIndexOf(':');
    if (idx === -1) continue;
    const name = line.slice(0, idx).trim();
    const color = line.slice(idx + 1).trim();
    if (name && /^#[0-9a-fA-F]{3,6}$/.test(color)) map.set(name, color);
  }
  return map;
}
