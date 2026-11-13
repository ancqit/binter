export interface Theme {
  id: string;
  name: string;
  view: string;
  wallpaper: string;
  preview: string;
  light: boolean;
  paper: string;
  ink: string;
  accent: string;
  accentDeep: string;
  wash: string;
  sheet: string;
  onAccent: string;
  radius: string;
}

// Clock is the herbant sky with the rings at 0.3. Glass, brass, and kiln are new.
export const themes: Theme[] = [
  {
    id: 'clock',
    name: 'Clock',
    view: 'Opacity 0.3',
    wallpaper: '/wallpapers/clouds.svg',
    preview: '/wallpapers/clock-faint.svg',
    light: false,
    paper: '#f4efe4',
    ink: '#1c1712',
    accent: '#c6a15b',
    accentDeep: '#8a6840',
    wash: '#16324a',
    sheet: 'rgba(244, 239, 228, 0.94)',
    onAccent: '#1c140c',
    radius: '28px',
  },
  {
    id: 'glass',
    name: 'Glass',
    view: 'Clear',
    wallpaper: '/wallpapers/glass.svg',
    preview: '/wallpapers/glass.svg',
    light: true,
    paper: '#f7fcfd',
    ink: '#1c3338',
    accent: '#3d8f9c',
    accentDeep: '#1f5c66',
    wash: '#e7f4f6',
    sheet: 'rgba(247, 252, 253, 0.9)',
    onAccent: '#f7fcfd',
    radius: '30px',
  },
  {
    id: 'brass',
    name: 'Brass',
    view: 'Metal',
    wallpaper: '/wallpapers/brass.svg',
    preview: '/wallpapers/brass.svg',
    light: true,
    paper: '#f7f4ee',
    ink: '#2a261f',
    accent: '#a6843d',
    accentDeep: '#6e5420',
    wash: '#efe8d8',
    sheet: 'rgba(247, 244, 238, 0.94)',
    onAccent: '#1c1710',
    radius: '18px',
  },
  {
    id: 'kiln',
    name: 'Kiln',
    view: 'Fired',
    wallpaper: '/wallpapers/kiln.svg',
    preview: '/wallpapers/kiln.svg',
    light: true,
    paper: '#fff6f0',
    ink: '#3a241c',
    accent: '#c4653a',
    accentDeep: '#8a3e22',
    wash: '#f8e6da',
    sheet: 'rgba(255, 246, 240, 0.94)',
    onAccent: '#fff6f0',
    radius: '22px',
  },
  {
    id: 'blossom',
    name: 'Blossom',
    view: 'Soft cards',
    wallpaper: '/wallpapers/blossom.svg',
    preview: '/wallpapers/blossom.svg',
    light: true,
    paper: '#fff7f8',
    ink: '#3a2430',
    accent: '#d46b8a',
    accentDeep: '#9c4564',
    wash: '#fff5f7',
    sheet: 'rgba(255, 247, 248, 0.92)',
    onAccent: '#fff7f8',
    radius: '32px',
  },
  {
    id: 'linen',
    name: 'Linen',
    view: 'Quiet paper',
    wallpaper: '/wallpapers/linen.svg',
    preview: '/wallpapers/linen.svg',
    light: true,
    paper: '#fbf7f0',
    ink: '#2c261f',
    accent: '#b08968',
    accentDeep: '#7d5a43',
    wash: '#f7f1e6',
    sheet: 'rgba(251, 247, 240, 0.94)',
    onAccent: '#fffaf3',
    radius: '18px',
  },
  {
    id: 'meadow',
    name: 'Meadow',
    view: 'Fresh',
    wallpaper: '/wallpapers/meadow.svg',
    preview: '/wallpapers/meadow.svg',
    light: true,
    paper: '#f7fbf4',
    ink: '#243024',
    accent: '#6fa35a',
    accentDeep: '#3f6b34',
    wash: '#f3f8ef',
    sheet: 'rgba(247, 251, 244, 0.92)',
    onAccent: '#f7fbf4',
    radius: '24px',
  },
  {
    id: 'shore',
    name: 'Shore',
    view: 'Open',
    wallpaper: '/wallpapers/shore.svg',
    preview: '/wallpapers/shore.svg',
    light: true,
    paper: '#f7fcfd',
    ink: '#1d333c',
    accent: '#5aa7c2',
    accentDeep: '#2f6f86',
    wash: '#f4fafc',
    sheet: 'rgba(247, 252, 253, 0.84)',
    onAccent: '#f7fcfd',
    radius: '30px',
  },
  {
    id: 'apricot',
    name: 'Apricot',
    view: 'Sunny',
    wallpaper: '/wallpapers/apricot.svg',
    preview: '/wallpapers/apricot.svg',
    light: true,
    paper: '#fff8f3',
    ink: '#3b271c',
    accent: '#e08a45',
    accentDeep: '#a85b24',
    wash: '#fff6ee',
    sheet: 'rgba(255, 248, 243, 0.94)',
    onAccent: '#fff8f3',
    radius: '26px',
  },
  {
    id: 'lemon',
    name: 'Lemon',
    view: 'Bright',
    wallpaper: '/wallpapers/lemon.svg',
    preview: '/wallpapers/lemon.svg',
    light: true,
    paper: '#fffdf4',
    ink: '#333014',
    accent: '#e2b423',
    accentDeep: '#8d7010',
    wash: '#fffbe8',
    sheet: 'rgba(255, 253, 244, 0.94)',
    onAccent: '#333014',
    radius: '16px',
  },
  {
    id: 'sky',
    name: 'Sky',
    view: 'High',
    wallpaper: '/wallpapers/sky.svg',
    preview: '/wallpapers/sky.svg',
    light: true,
    paper: '#f8fbff',
    ink: '#243044',
    accent: '#7aa2e3',
    accentDeep: '#3d64a8',
    wash: '#f5f9ff',
    sheet: 'rgba(248, 251, 255, 0.88)',
    onAccent: '#f8fbff',
    radius: '36px',
  },
  {
    id: 'clouds',
    name: 'Clouds',
    view: 'Windows',
    wallpaper: '/wallpapers/clouds.svg',
    preview: '/wallpapers/clouds.svg',
    light: true,
    paper: '#f7fbff',
    ink: '#1a3148',
    accent: '#3d8fe0',
    accentDeep: '#1d5f99',
    wash: '#7eb6f0',
    sheet: 'rgba(247, 251, 255, 0.92)',
    onAccent: '#f7fbff',
    radius: '28px',
  },
];

const storageKey = 'binter-theme';

export const defaultTheme = themes.find((theme) => theme.id === 'clock') ?? themes[0];

export function currentTheme(): Theme {
  try {
    const id = localStorage.getItem(storageKey);
    return themes.find((theme) => theme.id === id) ?? defaultTheme;
  } catch {
    return defaultTheme;
  }
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  const pairs: Record<string, string> = {
    '--paper': theme.paper,
    '--ink': theme.ink,
    '--gold': theme.accent,
    '--gold-deep': theme.accentDeep,
    '--wash': theme.wash,
    '--sheet': theme.sheet,
    '--on-accent': theme.onAccent,
    '--radius': theme.radius,
    '--wallpaper': `url("${theme.wallpaper}")`,
  };
  for (const [name, value] of Object.entries(pairs)) {
    root.style.setProperty(name, value);
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.light ? theme.wash : '#16324a');
}

export function chooseTheme(id: string): void {
  const theme = themes.find((item) => item.id === id);
  if (!theme) {
    return;
  }
  applyTheme(theme);
  try {
    localStorage.setItem(storageKey, theme.id);
  } catch {
    // The choice still holds for this visit.
  }
}
