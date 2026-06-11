import type { GameSettings } from '../game/settings';

export type SettingsPanelOptions = {
  settings: GameSettings;
  onChange: (settings: GameSettings) => void;
  onResetData: () => void;
  onClose: () => void;
};

export function openSettingsPanel(options: SettingsPanelOptions): void {
  const existing = document.getElementById('settings-panel');
  existing?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'settings-panel';
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'settings-title');

  const panel = document.createElement('div');
  panel.className = 'modal-panel';

  const title = document.createElement('h2');
  title.id = 'settings-title';
  title.className = 'modal-title';
  title.textContent = 'Settings';

  const soundRow = createToggleRow(
    'sound-toggle',
    'Sound effects',
    options.settings.sound,
    (checked) => options.onChange({ ...options.settings, sound: checked }),
  );

  const motionRow = createToggleRow(
    'motion-toggle',
    'Reduce motion',
    options.settings.reducedMotion,
    (checked) => options.onChange({ ...options.settings, reducedMotion: checked }),
  );

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'btn settings-reset-btn';
  resetBtn.textContent = 'Reset all data';
  resetBtn.addEventListener('click', options.onResetData);

  const resetHint = document.createElement('p');
  resetHint.className = 'settings-reset-hint';
  resetHint.textContent = 'Clears progress, scores, in-progress saves, and settings.';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'btn modal-close';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', options.onClose);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) options.onClose();
  });

  panel.append(title, soundRow, motionRow, resetHint, resetBtn, closeBtn);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  closeBtn.focus();
}

function createToggleRow(
  id: string,
  label: string,
  checked: boolean,
  onChange: (checked: boolean) => void,
): HTMLElement {
  const row = document.createElement('label');
  row.className = 'settings-row';
  row.htmlFor = id;

  const span = document.createElement('span');
  span.textContent = label;

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = id;
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));

  row.append(span, input);
  return row;
}

export function closeSettingsPanel(): void {
  document.getElementById('settings-panel')?.remove();
}

export function applyMotionClass(reducedMotion: boolean): void {
  document.documentElement.classList.toggle('reduce-motion', reducedMotion);
}
