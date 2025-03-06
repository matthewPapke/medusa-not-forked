import { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';
import { IOrderModuleService } from '@medusajs/framework/types';
import { Modules } from '@medusajs/framework/utils';
import { PrintfulService } from '../service';

/**
 * Subscriber that forwards new orders to Printful when they're placed in Medusa
 */
export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  // Get required services
  const printfulService: PrintfulService = container.resolve("printful-service");
  const orderService: IOrderModuleService = container.resolve(Modules.ORDER);
  
  // Skip if printful service isn't initialized
  if (!printfulService.isReady()) {
    console.log('Printful service not initialized, skipping order sync');
    return;
  }
  
  try {
    // Get the full order with necessary relations
    const order = await orderService.retrieveOrder(data.id, {
      relations: [
        'items',
        'shipping_address',
        'billing_address',
        'region',
        'customer'
      ]
    });
    
    // Check if this order should be sent to Printful
    // Only process orders that contain Printful products
    const containsPrintfulProducts = order.items.some(item => 
      item.metadata?.printful_variant_id
    );
    
    if (!containsPrintfulProducts) {
      console.log(`Order ${order.id} does not contain Printful products, skipping`);
      return;
    }
    
    // Filter out non-Printful products
    const printfulItems = order.items.filter(item => 
      item.metadata?.printful_variant_id
    );
    
    // Only process if we have Printful items
    if (printfulItems.length === 0) {
      console.log(`Order ${order.id} has no valid Printful items, skipping`);
      return;
    }
    
    // Create a modified order object with only Printful items
    const printfulOrder = {
      ...order,
      items: printfulItems,
    };
    
    // Send the order to Printful
    console.log(`Sending order ${order.id} to Printful with ${printfulItems.length} items`);
    const result = await printfulService.createOrder(printfulOrder);
    
    console.log(`Successfully created Printful order for Medusa order ${order.id}`);
    
    // Optionally update the order in Medusa with Printful order ID
    await orderService.updateOrders(order.id, {
      metadata: {
        ...order.metadata,
        printful_order_id: result.id.toString(),
        printful_order_status: result.status,
        printful_created_at: result.created
      }
    });
    
    console.log(`Updated Medusa order ${order.id} with Printful order ID ${result.id}`);
  } catch (error) {
    console.error(`Failed to create Printful order for Medusa order ${data.id}: ${error.message}`);
    // Consider implementing retry logic or alerting for failed orders
  }
}

export const config: SubscriberConfig = {
  event: 'order.placed'
};