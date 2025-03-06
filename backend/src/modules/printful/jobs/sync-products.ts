import { MedusaContainer } from "@medusajs/framework/types";
import PrintfulService from "../service";

/**
 * Scheduled job to automatically sync products from Printful to Medusa
 */
export default async function syncPrintfulProducts(container: MedusaContainer) {
  const printfulService: PrintfulService = container.resolve("printful-service");
  const logger = container.resolve("logger");
  
  // Skip if not initialized
  if (!printfulService.isReady()) {
    logger.warn("Printful service not initialized, skipping product sync");
    return;
  }
  
  try {
    logger.info("Starting scheduled Printful product sync");
    
    const result = await printfulService.syncProducts();
    
    logger.info(
      `Printful product sync completed: ${result.created} created, ${result.updated} updated, ${result.failed} failed`
    );
  } catch (error) {
    logger.error(`Error in Printful product sync job: ${error.message}`);
  }
}

export const config = {
  name: "printful-sync-products",
  schedule: "0 0 * * *", // Daily at midnight
};