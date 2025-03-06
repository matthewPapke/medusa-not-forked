// src/modules/printful/service.ts
import { Logger } from '@medusajs/framework/types';
import { MedusaError } from '@medusajs/framework/utils';
import { 
  IInventoryModuleService, 
  IProductModuleService,
  IOrderModuleService,
  InventoryItemDTO, 
  ProductDTO
} from '@medusajs/framework/types';
import { Modules } from '@medusajs/framework/utils';
import { ProductStatus } from '@medusajs/framework/utils';
import { PrintfulProduct, PrintfulVariant, PrintfulOrder, PrintfulInventorySync } from './types/printful-api';

type InjectedDependencies = {
  logger: Logger;
  [Modules.INVENTORY]: IInventoryModuleService;
  [Modules.PRODUCT]: IProductModuleService;
  [Modules.ORDER]: IOrderModuleService;
};

export class PrintfulService {
 static identifier = 'printful';  
  
  protected readonly logger_: Logger;
  protected client: any; // Changed from AxiosInstance to avoid axios dependency
  protected readonly inventoryService_: IInventoryModuleService;
  protected readonly productService_: IProductModuleService;
  protected readonly orderService_: IOrderModuleService;
  protected apiKey: string;
  protected webhookSecret: string;
  protected autoSyncInterval: number;
  protected isInitialized: boolean = false;

  constructor({ 
    logger, 
    [Modules.INVENTORY]: inventoryService,
    [Modules.PRODUCT]: productService,
    [Modules.ORDER]: orderService,
  }: InjectedDependencies, options: Record<string, unknown> = {}) {
    this.logger_ = logger;
    this.inventoryService_ = inventoryService;
    this.productService_ = productService;
    this.orderService_ = orderService;
    
    this.apiKey = process.env.PRINTFUL_API_KEY || '';
    this.webhookSecret = process.env.PRINTFUL_WEBHOOK_SECRET || '';
    this.autoSyncInterval = parseInt(process.env.PRINTFUL_AUTO_SYNC_INTERVAL || '3600000', 10);
    
    // Use node-fetch instead of axios
    this.setupClient();
    
    if (this.apiKey) {
      this.isInitialized = true;
      this.logger_.info('Printful service initialized');
    } else {
      this.logger_.warn('Printful service not initialized: missing API key');
    }
  }

  private setupClient() {
    // Create a simple client using fetch instead of axios
    this.client = {
      get: async (url: string) => {
        const response = await fetch(`https://api.printful.com${url}`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) {
          throw new Error(`Printful API error: ${response.status} ${response.statusText}`);
        }
        return { data: await response.json() };
      },
      post: async (url: string, data: any) => {
        const response = await fetch(`https://api.printful.com${url}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
        if (!response.ok) {
          throw new Error(`Printful API error: ${response.status} ${response.statusText}`);
        }
        return { data: await response.json() };
      }
    };
  }
  
  /**
   * Check if the service is initialized with API credentials
   */
  isReady(): boolean {
    return this.isInitialized;
  }
  
  /**
   * Set API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.setupClient();
    this.isInitialized = true;
    this.logger_.info('Printful API key updated');
  }
  
  /**
   * Validate webhook signature
   */
  validateWebhookSignature(signature: string, body: string): boolean {
    if (!this.webhookSecret) {
      return false;
    }
    
    // Implement signature validation logic based on Printful's requirements
    // This is a placeholder - check Printful's documentation for specifics
    return true;
  }
  
  /**
   * Get store information from Printful
   */
  async getStoreInfo(): Promise<any> {
    try {
      const response = await this.client.get('/store');
      return response.data.result;
    } catch (error) {
      this.logger_.error('Failed to get Printful store info: ' + error.message);
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        'Failed to get Printful store info'
      );
    }
  }
  
  /**
   * Get products from Printful
   */
  async getProducts(): Promise<PrintfulProduct[]> {
    try {
      const response = await this.client.get('/sync/products');
      return response.data.result;
    } catch (error) {
      this.logger_.error('Failed to get Printful products: ' + error.message);
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        'Failed to get Printful products'
      );
    }
  }
  
  /**
   * Get inventory levels from Printful
   */
  async getInventory(): Promise<PrintfulInventorySync[]> {
    try {
      const response = await this.client.get('/sync/variant-inventory');
      return response.data.result;
    } catch (error) {
      this.logger_.error('Failed to get Printful inventory: ' + error.message);
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        'Failed to get Printful inventory'
      );
    }
  }
  
  /**
   * Create or update order in Printful
   */
  async createOrder(order: any): Promise<PrintfulOrder> {
    try {
      const printfulOrder = this.mapMedusaOrderToPrintful(order);
      const response = await this.client.post('/orders', printfulOrder);
      return response.data.result;
    } catch (error) {
      this.logger_.error('Failed to create Printful order: ' + error.message);
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        'Failed to create Printful order'
      );
    }
  }
  
  /**
   * Sync all products from Printful to Medusa
   */
  async syncProducts(): Promise<{created: number, updated: number, failed: number}> {
    if (!this.isInitialized) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        'Printful service is not initialized'
      );
    }
    
    let created = 0;
    let updated = 0;
    let failed = 0;
    
    try {
      const printfulProducts = await this.getProducts();
      this.logger_.info(`Found ${printfulProducts.length} products in Printful`);
      
      for (const printfulProduct of printfulProducts) {
        try {
          const existingProduct = await this.findExistingProduct(printfulProduct);
          
          if (existingProduct) {
            await this.updateMedusaProduct(existingProduct, printfulProduct);
            updated++;
          } else {
            await this.createMedusaProduct(printfulProduct);
            created++;
          }
        } catch (error) {
          this.logger_.error(`Failed to sync product ${printfulProduct.name}: ${error.message}`);
          failed++;
        }
      }
      
      this.logger_.info(`Printful product sync completed: ${created} created, ${updated} updated, ${failed} failed`);
      return { created, updated, failed };
    } catch (error) {
      this.logger_.error('Failed to sync Printful products: ' + error.message);
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        'Failed to sync Printful products'
      );
    }
  }
  
  /**
   * Sync inventory levels from Printful to Medusa
   */
  async syncInventory(): Promise<{updated: number, failed: number}> {
    if (!this.isInitialized) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        'Printful service is not initialized'
      );
    }
    
    let updated = 0;
    let failed = 0;
    
    try {
      const printfulInventory = await this.getInventory();
      this.logger_.info(`Found ${printfulInventory.length} inventory items in Printful`);
      
      for (const item of printfulInventory) {
        try {
          const inventoryItem = await this.findInventoryItemBySku(item.variant.sku);
          
          if (inventoryItem) {
            await this.updateInventoryLevel(inventoryItem, item.inventory);
            updated++;
          } else {
            this.logger_.warn(`Inventory item with SKU ${item.variant.sku} not found in Medusa`);
          }
        } catch (error) {
          this.logger_.error(`Failed to sync inventory for ${item.variant.sku}: ${error.message}`);
          failed++;
        }
      }
      
      this.logger_.info(`Printful inventory sync completed: ${updated} updated, ${failed} failed`);
      return { updated, failed };
    } catch (error) {
      this.logger_.error('Failed to sync Printful inventory: ' + error.message);
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        'Failed to sync Printful inventory'
      );
    }
  }
  
  /**
   * Find a product in Medusa by Printful external ID
   */
  private async findExistingProduct(printfulProduct: PrintfulProduct): Promise<ProductDTO | null> {
    try {
      // Use a simple approach with listing all products and filtering in memory
      const products = await this.productService_.listAndCountProducts({});
      
      // Find products with matching metadata
      const matchingProducts = products[0].filter(p => 
        p.metadata && 
        p.metadata.printful_id === printfulProduct.id.toString()
      );
      
      if (matchingProducts.length > 0) {
        return matchingProducts[0];
      }
      
      return null;
    } catch (error) {
      this.logger_.error(`Failed to find existing product: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Create a new product in Medusa from Printful product
   */
  private async createMedusaProduct(printfulProduct: PrintfulProduct): Promise<ProductDTO> {
    const options = this.extractOptionsFromPrintfulProduct(printfulProduct);
    const variants = this.mapPrintfulVariantsToMedusa(printfulProduct.sync_variants);
    
    // Create product data without 'query' field
    const productData = {
      title: printfulProduct.name,
      handle: printfulProduct.name.toLowerCase().replace(/\s+/g, '-'),
      description: printfulProduct.description || 'Imported from Printful',
      status: ProductStatus.PUBLISHED,
      options,
      variants,
      images: printfulProduct.thumbnail_url 
        ? [{ url: printfulProduct.thumbnail_url }] 
        : [],
      metadata: {
        printful_id: printfulProduct.id.toString(),
        printful_external_id: printfulProduct.external_id,
        printful_sync_product_id: printfulProduct.sync_product_id.toString(),
        printful_last_synced: new Date().toISOString()
      }
    };
    
    const products = await this.productService_.createProducts([productData], {});
    const product = products[0];
    
    this.logger_.info(`Created product in Medusa with ID ${product.id} from Printful ID ${printfulProduct.id}`);
    return product;
  }
  
  /**
   * Update an existing Medusa product with Printful data
   */
  private async updateMedusaProduct(existingProduct: ProductDTO, printfulProduct: PrintfulProduct): Promise<ProductDTO> {
    // Implement update logic - this is complex due to variants and options
    const updated = await this.productService_.updateProducts(existingProduct.id, {
      description: printfulProduct.description || existingProduct.description,
      metadata: {
        ...existingProduct.metadata,
        printful_last_synced: new Date().toISOString()
      }
    }, {});
    
    this.logger_.info(`Updated product in Medusa with ID ${existingProduct.id} from Printful ID ${printfulProduct.id}`);
    return updated;
  }
  
  /**
   * Find inventory item by SKU
   */
  private async findInventoryItemBySku(sku: string): Promise<InventoryItemDTO | null> {
    try {
      // List all inventory items and filter in memory (simplified approach)
      const inventoryItems = await this.inventoryService_.listInventoryItems({});
      
      // Find the one with matching SKU
      const matchingItem = inventoryItems.find(item => item.sku === sku);
      
      return matchingItem || null;
    } catch (error) {
      this.logger_.error(`Failed to find inventory item with SKU ${sku}: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Update inventory levels in Medusa
   */
  private async updateInventoryLevel(inventoryItem: InventoryItemDTO, inventory: { [key: string]: number }): Promise<void> {
    try {
      // Get all inventory levels for this item
      const levels = await this.inventoryService_.listInventoryLevels({
        inventory_item_id: inventoryItem.id,
      });
      
      // Sum the available quantities from Printful
      const totalAvailable = Object.values(inventory).reduce((sum, qty) => sum + qty, 0);
      
      // Update each level
      for (const level of levels) {
        await this.inventoryService_.updateInventoryLevels([{
          id: level.id,
          inventory_item_id: level.inventory_item_id,
          location_id: level.location_id,
          stocked_quantity: totalAvailable
        }], {});
      }
      
      this.logger_.info(`Updated inventory levels for ${inventoryItem.sku} to ${totalAvailable}`);
    } catch (error) {
      this.logger_.error(`Failed to update inventory levels for ${inventoryItem.sku}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Extract options from Printful product
   */
  private extractOptionsFromPrintfulProduct(printfulProduct: PrintfulProduct): any[] {
    // Map of option names to possible values
    const optionMap: Record<string, Set<string>> = {};
    
    // Extract all options from variants
    printfulProduct.sync_variants.forEach(variant => {
      if (variant.options) {
        variant.options.forEach(option => {
          if (!optionMap[option.name]) {
            optionMap[option.name] = new Set();
          }
          optionMap[option.name].add(option.value);
        });
      }
    });
    
    // Convert to Medusa options format
    return Object.entries(optionMap).map(([title, values]) => ({
      title,
      values: Array.from(values)
    }));
  }
  
  /**
   * Map Printful variants to Medusa variants
   */
  private mapPrintfulVariantsToMedusa(printfulVariants: PrintfulVariant[]): any[] {
    return printfulVariants.map(variant => {
      // Build options object
      const options: Record<string, string> = {};
      if (variant.options) {
        variant.options.forEach(option => {
          options[option.name] = option.value;
        });
      }
      
      return {
        title: variant.name,
        sku: variant.sku,
        prices: [
          {
            amount: Math.round(variant.retail_price * 100), // Convert to cents
            currency_code: variant.currency || 'usd'
          }
        ],
        options,
        metadata: {
          printful_variant_id: variant.id.toString(),
          printful_external_id: variant.external_id,
          printful_sync_variant_id: variant.sync_variant_id.toString()
        }
      };
    });
  }
  
  /**
   * Map Medusa order to Printful order format
   */
  private mapMedusaOrderToPrintful(order: any): any {
    // This needs to be implemented based on both Medusa and Printful schemas
    // This is a placeholder implementation
    return {
      external_id: order.id,
      shipping: {
        name: `${order.shipping_address.first_name} ${order.shipping_address.last_name}`,
        address1: order.shipping_address.address_1,
        address2: order.shipping_address.address_2 || '',
        city: order.shipping_address.city,
        state_code: order.shipping_address.province,
        country_code: order.shipping_address.country_code,
        zip: order.shipping_address.postal_code,
        phone: order.shipping_address.phone || '',
        email: order.email
      },
      items: order.items.map((item: any) => ({
        external_id: item.id,
        variant_id: item.metadata?.printful_variant_id,
        quantity: item.quantity,
        retail_price: item.unit_price / 100, // Convert from cents
        name: item.title,
        sku: item.sku,
      }))
    };
  }
}