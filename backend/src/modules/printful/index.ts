import { ModuleRegistrationName } from '@medusajs/utils';
import { PrintfulService } from './service';

export const PRINTFUL_MODULE_KEY = ModuleRegistrationName.PRINTFUL || 'printful';

export default {
  scope: 'SINGLETON',
  resolve: () => PrintfulService,
  dependencies: []
};
