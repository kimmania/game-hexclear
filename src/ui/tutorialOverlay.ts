import { dismissTutorial } from '../game/tutorial';

type TutorialStep = {
  title: string;
  body: string;
};

const STEPS: TutorialStep[] = [
  {
    title: 'Slide hexes off the board',
    body: 'Tap a tile to slide it in the direction its arrow points. Clear every hex to win the level.',
  },
  {
    title: 'Blocked moves',
    body: 'If another tile or a wall is in the way, the slide is blocked. Clear the path first — blocked taps still count as moves.',
  },
  {
    title: 'Frozen tiles',
    body: 'Frozen hexes cannot slide while a neighbor remains. Clear adjacent tiles first — a cyan ring means the ice has thawed and the tile can move.',
  },
];

export function openTutorialOverlay(onClose: () => void): void {
  closeTutorialOverlay();

  let stepIndex = 0;

  const overlay = document.createElement('div');
  overlay.id = 'tutorial-overlay';
  overlay.className = 'modal-overlay tutorial-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'tutorial-title');

  const panel = document.createElement('div');
  panel.className = 'modal-panel tutorial-panel';

  const kicker = document.createElement('p');
  kicker.className = 'tutorial-kicker';
  kicker.textContent = 'How to play';

  const title = document.createElement('h2');
  title.id = 'tutorial-title';
  title.className = 'modal-title tutorial-title';

  const body = document.createElement('p');
  body.className = 'tutorial-body';

  const progress = document.createElement('p');
  progress.className = 'tutorial-progress';
  progress.setAttribute('aria-live', 'polite');

  const actions = document.createElement('div');
  actions.className = 'tutorial-actions';

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'btn';
  backBtn.textContent = 'Back';

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'btn btn-primary';
  nextBtn.textContent = 'Next';

  const skipBtn = document.createElement('button');
  skipBtn.type = 'button';
  skipBtn.className = 'btn tutorial-skip';
  skipBtn.textContent = 'Skip tutorial';

  function finish(): void {
    dismissTutorial();
    closeTutorialOverlay();
    onClose();
  }

  function renderStep(): void {
    const step = STEPS[stepIndex]!;
    title.textContent = step.title;
    body.textContent = step.body;
    progress.textContent = `Step ${stepIndex + 1} of ${STEPS.length}`;
    backBtn.disabled = stepIndex === 0;
    nextBtn.textContent = stepIndex === STEPS.length - 1 ? 'Start playing' : 'Next';
    nextBtn.focus();
  }

  backBtn.addEventListener('click', () => {
    if (stepIndex > 0) {
      stepIndex -= 1;
      renderStep();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (stepIndex < STEPS.length - 1) {
      stepIndex += 1;
      renderStep();
      return;
    }
    finish();
  });

  skipBtn.addEventListener('click', finish);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) finish();
  });

  actions.append(backBtn, nextBtn);
  panel.append(kicker, title, body, progress, actions, skipBtn);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  renderStep();
}

export function closeTutorialOverlay(): void {
  document.getElementById('tutorial-overlay')?.remove();
}

export function isTutorialOpen(): boolean {
  return document.getElementById('tutorial-overlay') !== null;
}
