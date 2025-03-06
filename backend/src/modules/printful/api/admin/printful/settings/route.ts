// src/modules/printful/api/admin/printful/settings/route.ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { PrintfulService } from "../../../../service";

// Add this interface to properly type the request body
interface SettingsRequestBody {
  apiKey: string;
}

/**
 * Update Printful integration settings
 */
export async function POST(
  req: MedusaRequest<SettingsRequestBody>,
  res: MedusaResponse
): Promise<void> {
  const printfulService: PrintfulService = req.scope.resolve("printful");
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