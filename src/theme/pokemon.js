// Aura-inspired design system
export const C = {
  bg:      '#0A0818',
  card:    'rgba(255,255,255,0.07)',
  card2:   '#130D2A',
  yellow:  '#A78BFA',   // violet — primary accent
  blue:    '#60A5FA',
  red:     '#F472B6',   // soft pink
  green:   '#34D399',
  purple:  '#7C3AED',
  orange:  '#FB923C',
  border:  'rgba(255,255,255,0.1)',
  text:    '#FFFFFF',
  text2:   'rgba(255,255,255,0.55)',
  text3:   'rgba(255,255,255,0.3)',
};

// gradient pairs
export const G = {
  primary:  ['#7C3AED', '#A855F7'],
  vibrant:  ['#7C3AED', '#EC4899'],
  dark:     ['#1A0A3E', '#0A0818'],
  header:   ['#150B35', '#0A0818'],
  green:    ['#059669', '#34D399'],
  blue:     ['#1D4ED8', '#60A5FA'],
  orange:   ['#C2410C', '#FB923C'],
  pink:     ['#BE185D', '#F472B6'],
};

export const TYPE = {
  fire:     '#FB923C',
  water:    '#60A5FA',
  grass:    '#34D399',
  electric: '#FDE047',
  psychic:  '#F472B6',
  dragon:   '#7C3AED',
  normal:   '#94A3B8',
  fighting: '#F87171',
};

export const shadow = {
  shadowColor: '#7C3AED',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 12,
  elevation: 8,
};

export function hpColor(pct) {
  if (pct > 0.5) return '#34D399';
  if (pct > 0.2) return '#A78BFA';
  return '#F472B6';
}
