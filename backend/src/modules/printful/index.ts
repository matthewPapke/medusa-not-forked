import { ModuleProviderExports } from '@medusajs/framework/types';
import PrintfulService from './service';

// Add this export that's used in medusa-config.js
export const PRINTFUL_MODULE_KEY = 'printful';

const services = [PrintfulService];

const providerExport: ModuleProviderExports = {
  services,
};

export default providerExport;