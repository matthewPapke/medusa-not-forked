import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import PrintfulService from "../../../../service";

/**
 * Get Printful integration settings
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const printfulService: PrintfulService = req.scope.resolve("printful-service");

  const isInitialized = printfulService.isReady();

  try {
    // Get store info if service is initialized
    let storeInfo = null;
    if (isInitialized) {
      storeInfo = await printfulService.getStoreInfo();
    }

    res.status(200).json({
      success: true,
      data: {
        initialized: isInitialized,
        store: storeInfo,
        config: {
          syncInterval: process.env.PRINTFUL_AUTO_SYNC_INTERVAL || "3600000",
          webhookConfigured: !!process.env.PRINTFUL_WEBHOOK_SECRET
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error retrieving Printful settings: ${error.message}`
    });
  }
}

/**
 * Update Printful integration settings
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const printfulService: PrintfulService = req.scope.resolve("printful-service");
  const logger = req.scope.resolve("logger");

  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      res.status(400).json({
        success: false,
        message: "API key is required"
      });
      return;
    }

    // Update API key
    printfulService.setApiKey(apiKey);
    logger.info("Printful API key updated");

    // Test connection by getting store info
    const storeInfo = await printfulService.getStoreInfo();

    res.status(200).json({
      success: true,
      data: {
        initialized: true,
        store: storeInfo
      }
    });
  } catch (error) {
    logger.error(`Error updating Printful settings: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Error updating Printful settings: ${error.message}`
    });
  }
}