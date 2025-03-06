import { MedusaContainer } from "@medusajs/framework/types";
import PrintfulService from "../service";

/**
 * Scheduled job to automatically sync inventory levels from Printful to Medusa
 */
export default async function syncPrintfulInventory(container: MedusaContainer) {
  const printfulService: PrintfulService = container.resolve("printful-service");
  const logger = container.resolve("logger");
  
  // Skip if not initialized
  if (!printfulService.isReady()) {
    logger.warn("Printful service not initialized, skipping inventory sync");
    return;
  }
  
  try {
    logger.info("Starting scheduled Printful inventory sync");
    
    const result = await printfulService.syncInventory();
    
    logger.info(
      `Printful inventory sync completed: ${result.updated} updated, ${result.failed} failed`
    );
  } catch (error) {
    logger.error(`Error in Printful inventory sync job: ${error.message}`);
  }
}

export const config = {
  name: "printful-sync-inventory",
  schedule: "0 */6 * * *", // Every 6 hours
};