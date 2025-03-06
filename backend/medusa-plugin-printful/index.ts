// src/plugins/printful/index.ts
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import PrintfulService from './service';

export default (container, options) => {
  // Create a new instance of your service with the container
  const printfulService = new PrintfulService({
    logger: container.resolve(ContainerRegistrationKeys.LOGGER),
    ...container
  }, options);
  
  // Register the service with the container
  container.registerAdd('printfulService', () => printfulService);
  
  return printfulService;
};