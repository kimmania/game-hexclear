import type { TileId } from '../core/types';

export type KeyboardHandlers = {
  onSlideFocused: () => void;
  onHint: () => void;
  onUndo: () => void;
  onRestart: () => void;
  isModalOpen: () => boolean;
  isBusy: () => boolean;
  canUndo: () => boolean;
};

export type KeyboardControls = {
  bind: () => void;
  unbind: () => void;
};

export function createKeyboardControls(
  board: {
    focusNextTile: () => void;
    focusPreviousTile: () => void;
    focusTileInDirection: (direction: 'up' | 'down' | 'left' | 'right') => void;
    slideFocusedTile: () => void;
  },
  handlers: KeyboardHandlers,
): KeyboardControls {
  const onKeyDown = (event: KeyboardEvent): void => {
    if (handlers.isModalOpen()) return;

    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    ) {
      return;
    }

    const key = event.key;

    if (key === 'h' || key === 'H') {
      event.preventDefault();
      handlers.onHint();
      return;
    }

    if ((key === 'u' || key === 'U') && handlers.canUndo()) {
      event.preventDefault();
      handlers.onUndo();
      return;
    }

    if ((key === 'r' || key === 'R') && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      handlers.onRestart();
      return;
    }

    if (handlers.isBusy()) return;

    switch (key) {
      case 'ArrowRight':
        event.preventDefault();
        board.focusTileInDirection('right');
        break;
      case 'ArrowLeft':
        event.preventDefault();
        board.focusTileInDirection('left');
        break;
      case 'ArrowUp':
        event.preventDefault();
        board.focusTileInDirection('up');
        break;
      case 'ArrowDown':
        event.preventDefault();
        board.focusTileInDirection('down');
        break;
      case 'Tab':
        event.preventDefault();
        if (event.shiftKey) board.focusPreviousTile();
        else board.focusNextTile();
        break;
      case 'Enter':
      case ' ':
        if (target instanceof Element && target.closest('.hex-tile')) {
          return;
        }
        event.preventDefault();
        board.slideFocusedTile();
        break;
      default:
        break;
    }
  };

  return {
    bind: () => document.addEventListener('keydown', onKeyDown),
    unbind: () => document.removeEventListener('keydown', onKeyDown),
  };
}

export function sortTileIdsForFocus(tileIds: TileId[]): TileId[] {
  return [...tileIds].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
