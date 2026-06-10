const DISMISS_KEY = 'hexclear-install-hint';

export function isIosBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iosDevice = /iPad|iPhone|iPod/.test(ua);
  const ipadOs =
    navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iosDevice || ipadOs;
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    nav.standalone === true
  );
}

export function shouldShowInstallHint(): boolean {
  if (isStandaloneDisplay()) return false;
  if (!isIosBrowser()) return false;
  try {
    return localStorage.getItem(DISMISS_KEY) !== 'dismissed';
  } catch {
    return true;
  }
}

export function dismissInstallHint(): void {
  try {
    localStorage.setItem(DISMISS_KEY, 'dismissed');
  } catch {
    /* storage unavailable */
  }
}

export function initInstallHint(): void {
  if (!shouldShowInstallHint()) return;

  const existing = document.getElementById('install-hint');
  existing?.remove();

  const banner = document.createElement('div');
  banner.id = 'install-hint';
  banner.className = 'install-hint';
  banner.setAttribute('role', 'status');

  const text = document.createElement('p');
  text.className = 'install-hint-text';
  text.textContent =
    'Install: tap Share, then Add to Home Screen for full-screen play.';

  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.className = 'install-hint-dismiss';
  dismiss.setAttribute('aria-label', 'Dismiss install hint');
  dismiss.textContent = '×';
  dismiss.addEventListener('click', () => {
    dismissInstallHint();
    banner.remove();
  });

  banner.append(text, dismiss);

  const header = document.querySelector('.header');
  header?.insertAdjacentElement('afterend', banner);
}
