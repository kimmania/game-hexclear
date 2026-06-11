import type { ColorblindMode } from '../core/tileColors';
import type { GameSettings } from '../game/settings';
import { DENSE_BOARD_CELL_THRESHOLD, shouldZoomBoard } from '../game/settings';
import { applyMotionClass } from './settingsPanel';

export function applyColorblindClass(mode: ColorblindMode): void {
  document.documentElement.dataset.colorblind = mode;
}

export function applySettingsClasses(settings: GameSettings): void {
  applyMotionClass(settings.reducedMotion);
  applyColorblindClass(settings.colorblindMode);
}

export function applyBoardZoom(cellCount: number, boardZoom: GameSettings['boardZoom']): void {
  const host = document.getElementById('board-host');
  const area = document.querySelector('.game-area');
  const dense = shouldZoomBoard(cellCount, boardZoom);
  host?.classList.toggle('board-host-dense', dense);
  area?.classList.toggle('game-area-dense', dense);
}

export { DENSE_BOARD_CELL_THRESHOLD };
