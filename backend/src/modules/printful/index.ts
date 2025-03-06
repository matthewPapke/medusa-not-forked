import { ModuleRegistrationName } from '@medusajs/utils';
import { PrintfulService } from './service';

// Export the service directly
export default {
  service: PrintfulService,
  scope: 'SINGLETON'
};