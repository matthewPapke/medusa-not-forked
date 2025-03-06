// src/modules/printful/index.ts
import PrintfulService from './service';

// Define this as a constant to use in medusa-config.js
export const PRINTFUL_MODULE_KEY = 'printful';

// This is what Medusa expects for service registration
export default {
  scope: 'singleton',
  resolve: () => PrintfulService
};