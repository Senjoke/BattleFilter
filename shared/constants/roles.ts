export const ROLES = {
  TANK: 'Tank',
  DAMAGE: 'Damage',
  SUPPORT: 'Support'
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];
