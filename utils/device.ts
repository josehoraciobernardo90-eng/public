export const isAndroid = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = (navigator.userAgent || navigator.vendor || (window as any).opera || '').toLowerCase();
  return /android/.test(ua) || document.referrer.includes('android-app://');
};

export const isNativeAppWebView = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Boolean((window as Window & { ReactNativeWebView?: unknown }).ReactNativeWebView);
};

export const isWebDesktop = (): boolean => {
  return !isAndroid();
};
