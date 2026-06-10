const TOAST_ID = 'sw-update-toast';

export function initServiceWorkerUpdates(): void {
  const toast = document.createElement('div');
  toast.id = TOAST_ID;
  toast.className = 'sw-update-toast hidden';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  const message = document.createElement('span');
  message.textContent = 'New version available.';

  const reload = document.createElement('button');
  reload.type = 'button';
  reload.className = 'btn btn-primary sw-update-reload';
  reload.textContent = 'Reload';
  reload.addEventListener('click', () => window.location.reload());

  toast.append(message, reload);
  document.getElementById('app')?.appendChild(toast);
}

export function showServiceWorkerUpdatePrompt(): void {
  document.getElementById(TOAST_ID)?.classList.remove('hidden');
}
