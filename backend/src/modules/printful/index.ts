// src/modules/printful/index.ts
import { ModuleProviderExports } from '@medusajs/framework/types';
import { PrintfulService } from './service';

// The key must match exactly with what's used in medusa-config.js
export const PRINTFUL_SERVICE_KEY = 'printful-service';

// Define service registration
const serviceRegistration = {
  key: PRINTFUL_SERVICE_KEY,
  service: () => PrintfulService,
  scope: 'SINGLETON'
};

// Export the module
const services = [serviceRegistration];