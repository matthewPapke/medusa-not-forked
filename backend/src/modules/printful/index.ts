import { ModuleProviderExports } from '@medusajs/framework/types';
import { PrintfulService } from './service';

const services = [PrintfulService];

const providerExport: ModuleProviderExports = {
  services,
};

export default providerExport;