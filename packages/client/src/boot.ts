import { moveHost } from '@oss-idle/shared/hostMove';

// before the game's modules load: on the old host they would open the save it hands over
await moveHost();
await import('./main');
