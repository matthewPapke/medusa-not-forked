// src/modules/printful/api/webhook/route.ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import PrintfulService from "../../service";
import { PrintfulWebhookEvent } from "../../types/printful-api";
import { IFulfillmentService, IOrderService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * Handle Printful webhooks
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const printfulService: PrintfulService = req.scope.resolve("printful-service");
  const fulfillmentService: IFulfillmentService = req.scope.resolve(Modules.FULFILLMENT);
  const orderService: IOrderService = req.scope.resolve(Modules.ORDER);
  
  try {
    // Verify signature if provided
    const signature = req.headers['x-printful-signature'] as string;
    if (signature) {
      const rawBody = JSON.stringify(req.body);
      const isValid = printfulService.validateWebhookSignature(signature, rawBody);
      
      if (!isValid) {
        res.status(401).json({
          message: "Invalid webhook signature"
        });
        return;
      }
    }
    
    const webhookEvent = req.body as PrintfulWebhookEvent;
    
    switch (webhookEvent.type) {
      case 'package_shipped':
        await handlePackageShipped(webhookEvent, orderService, fulfillmentService);
        break;
        
      case 'order_created':
        // Handle order creation confirmation
        break;
        
      case 'order_failed':
        // Handle order failure
        break;
        
      case 'order_canceled':
        // Handle order cancellation
        break;
        
      case 'order_put_on_hold':
        // Handle order on hold
        break;
        
      default:
        // Log unknown event type
        console.log(`Unhandled Printful webhook event type: ${webhookEvent.type}`);
    }
    
    res.status(200).json({
      message: "Webhook processed successfully"
    });
  } catch (error) {
    console.error("Error processing Printful webhook:", error);
    res.status(500).json({
      message: "Error processing webhook",
      error: error.message
    });
  }
}

/**
 * Handle package shipped event
 */
async function handlePackageShipped(
  webhookEvent: PrintfulWebhookEvent,
  orderService: IOrderService,
  fulfillmentService: IFulfillmentService
): Promise<void> {
  const printfulOrder = webhookEvent.data.order;
  const medusaOrderId = printfulOrder.external_id;
  
  try {
    // Find the Medusa order
    const order = await orderService.retrieveOrder(medusaOrderId);
    
    if (!order) {
      console.error(`Order not found for Printful order ${printfulOrder.id}`);
      return;
    }
    
    // Find the fulfillment for this order - fixing the filter
    const fulfillments = await fulfillmentService.listFulfillments({
      filter: {
        order_id: { eq: medusaOrderId }
      }
    });
    
    if (fulfillments.length === 0) {
      console.error(`No fulfillments found for order ${medusaOrderId}`);
      return;
    }
    
    // Update the fulfillment status to shipped - fixing property names
    for (const fulfillment of fulfillments) {
      await fulfillmentService.updateFulfillment(fulfillment.id, {
        // Use data field for custom data
        data: {
          ...fulfillment.data,
          printful_shipment_id: webhookEvent.data.shipment_id,
          printful_carrier: webhookEvent.data.carrier,
          printful_tracking_url: webhookEvent.data.tracking_url,
          printful_tracking_number: webhookEvent.data.tracking_number
        }
      });
      
      // If you need to update tracking numbers, you'll need to use a different approach
      // as the direct property isn't available. Consider adding it to the data object above.
    }
    
    // Optionally notify the customer about shipment
    // This would typically be done through a notification service
    
    console.log(`Updated order ${medusaOrderId} status based on Printful shipment`);
  } catch (error) {
    console.error(`Error handling Printful package shipped event: ${error.message}`);
    throw error;
  }
}