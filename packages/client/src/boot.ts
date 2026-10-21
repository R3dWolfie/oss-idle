import { moveHost } from '@oss-idle/shared/hostMove';
import { STAGING } from './dev/devTools';

// before the game's modules load: on the old host they would open the save it hands over
await moveHost();
if (STAGING) await (await import('./dev/devMenu')).chooseDevTools();
await import('./main');
