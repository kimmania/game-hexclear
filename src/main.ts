import { registerSW } from 'virtual:pwa-register';
import { bootstrap } from './app';
import { isEditMode } from './editor/editMode';
import { bootstrapEditor } from './editor/editorApp';
import { initInstallHint } from './ui/installHint';
import { initServiceWorkerUpdates, showServiceWorkerUpdatePrompt } from './ui/swUpdate';

if (isEditMode()) {
  bootstrapEditor().catch((error) => {
    console.error('Failed to start editor:', error);
  });
} else {
  initServiceWorkerUpdates();

  registerSW({
    immediate: true,
    onNeedRefresh() {
      showServiceWorkerUpdatePrompt();
    },
  });

  bootstrap()
    .then(() => initInstallHint())
    .catch((error) => {
      console.error('Failed to start app:', error);
    });
}
