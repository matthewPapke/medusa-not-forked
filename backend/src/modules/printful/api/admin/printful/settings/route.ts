// src/modules/printful/api/admin/printful/sync/route.ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import PrintfulService from "../../../../service";

/**
 * Manual sync trigger for Printful products and inventory
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const printfulService: PrintfulService = req.scope.resolve("printful");
  const logger = req.scope.resolve("logger");

  // Check if service is ready
  if (!printfulService.isReady()) {
    res.status(400).json({
      success: false,
      message: "Printful service is not initialized. Please configure API key first."
    });
    return;
  }

  try {
    // Use explicit any type to avoid TypeScript errors
    const body = req.body as any;
    const doSyncProducts = body.products !== false; // Default to true
    const doSyncInventory = body.inventory !== false; // Default to true
    
    const results: Record<string, any> = {};
    
    // Sync products if requested
    if (doSyncProducts) {
      logger.info("Starting manual Printful product sync");
      const productResult = await printfulService.syncProducts();
      results.products = productResult;
    }
    
    // Sync inventory if requested
    if (doSyncInventory) {
      logger.info("Starting manual Printful inventory sync");
      const inventoryResult = await printfulService.syncInventory();
      results.inventory = inventoryResult;
    }
    
    res.status(200).json({
      success: true,
      results
    });
  } catch (error) {
    logger.error(`Error in manual Printful sync: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Error syncing with Printful: ${error.message}`
    });
  }
}