const MOZAMBIQUE_MOBILE_PREFIXES = new Set(['82', '83', '84', '85', '86', '87']);

export const normalizeMozambiquePhone = (value: string): string =>
  value.replace(/\D/g, '').slice(0, 9);

export const isValidMozambiquePhone = (value: string): boolean =>
  value.length === 9 && MOZAMBIQUE_MOBILE_PREFIXES.has(value.slice(0, 2)) && /^\d{9}$/.test(value);

export const getMozambiqueNetwork = (value: string): string | null => {
  if (!isValidMozambiquePhone(value)) return null;
  if (/^8[23]/.test(value)) return 'Tmcel';
  if (/^8[45]/.test(value)) return 'Vodacom';
  return 'Movitel';
};