import type { ColorblindMode } from '../core/tileColors';
import type { BoardZoomMode, GameSettings } from '../game/settings';

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

  const undoRow = createToggleRow(
    'undo-toggle',
    'Undo last move',
    options.settings.undo,
    (checked) => options.onChange({ ...options.settings, undo: checked }),
  );

  const colorblindRow = createSelectRow<ColorblindMode>(
    'colorblind-mode',
    'Colorblind mode',
    options.settings.colorblindMode,
    [
      { value: 'off', label: 'Default colors' },
      { value: 'soft', label: 'Softer colors' },
      { value: 'labels', label: 'Direction labels' },
    ],
    (value) => options.onChange({ ...options.settings, colorblindMode: value }),
  );

  const zoomRow = createSelectRow<BoardZoomMode>(
    'board-zoom',
    'Dense board zoom',
    options.settings.boardZoom,
    [
      { value: 'auto', label: 'Auto zoom large boards' },
      { value: 'off', label: 'Off' },
    ],
    (value) => options.onChange({ ...options.settings, boardZoom: value }),
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

  panel.append(
    title,
    soundRow,
    motionRow,
    undoRow,
    colorblindRow,
    zoomRow,
    resetHint,
    resetBtn,
    closeBtn,
  );
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

function createSelectRow<T extends string>(
  id: string,
  label: string,
  value: T,
  options: Array<{ value: T; label: string }>,
  onChange: (value: T) => void,
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'settings-row settings-row-select';

  const span = document.createElement('label');
  span.className = 'settings-row-label';
  span.htmlFor = id;
  span.textContent = label;

  const select = document.createElement('select');
  select.id = id;
  select.className = 'settings-select';
  for (const option of options) {
    const el = document.createElement('option');
    el.value = option.value;
    el.textContent = option.label;
    select.appendChild(el);
  }
  select.value = value;
  select.addEventListener('change', () => onChange(select.value as T));

  row.append(span, select);
  return row;
}

export function closeSettingsPanel(): void {
  document.getElementById('settings-panel')?.remove();
}

export function applyMotionClass(reducedMotion: boolean): void {
  document.documentElement.classList.toggle('reduce-motion', reducedMotion);
}
