// Importing each action module registers it (side effect). Import order doesn't
// matter except multiAction, which looks up other actions dynamically at render
// time via getAction()/allActions() — never at module scope — so no cycle issue.
import './text';
import './clipboard';
import './url';
import './location';
import './wifi';
import './contact';
import './formData';
import './call';
import './sms';
import './email';
import './calendar';
import './reminder';
import './businessCard';
import './binaryTransfer';
import './payment';
import './eventTicket';
import './digitalId';
import './appLink';
import './devicePairing';
import './authorization';
import './configuration';
import './multiAction';

export { allActions, actionsByCategory, getAction, registerAction } from './registry';
export type { ActionDefinition } from './types';
