import { ModuleProviderExports } from '@medusajs/framework/types';
import PrintfulService from './service';

export const PRINTFUL_SERVICE_KEY = 'printful-service';

const services = [PrintfulService];

const providerExport: ModuleProviderExports = {
  services,
};

export default providerExport;