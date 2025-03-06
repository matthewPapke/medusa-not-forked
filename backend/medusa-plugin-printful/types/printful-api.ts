/**
 * Printful API Types
 */

export interface PrintfulVariantOption {
  id: string;
  name: string;
  value: string;
}

export interface PrintfulVariant {
  id: number;
  external_id: string;
  sync_variant_id: number;
  name: string;
  synced: boolean;
  variant_id: number;
  retail_price: number;
  currency: string;
  sku: string;
  files: PrintfulFile[];
  options: PrintfulVariantOption[];
}

export interface PrintfulFile {
  id: number;
  type: string;
  hash: string;
  url: string;
  filename: string;
  mime_type: string;
  size: number;
  width: number;
  height: number;
  dpi: number;
  status: string;
  created: string;
  thumbnail_url: string;
  preview_url: string;
  visible: boolean;
  is_temporary: boolean;
}

export interface PrintfulProduct {
  id: number;
  external_id: string;
  name: string;
  variants: number;
  synced: number;
  thumbnail_url: string;
  is_ignored: boolean;
  description: string;
  currency: string;
  created: string;
  updated: string;
  sync_product_id: number;
  sync_variants: PrintfulVariant[];
}

export interface PrintfulInventoryVariant {
  id: number;
  external_id: string;
  sync_variant_id: number;
  name: string;
  synced: boolean;
  variant_id: number;
  retail_price: number;
  currency: string;
  sku: string;
}

export interface PrintfulInventorySync {
  sync_product_id: number;
  external_id: string;
  name: string;
  variants: number;
  synced: number;
  variant: PrintfulInventoryVariant;
  inventory: {
    [key: string]: number; // warehouse_id: quantity
  };
}

export interface PrintfulAddress {
  name: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state_code: string;
  country_code: string;
  zip: string;
  phone?: string;
  email?: string;
}

export interface PrintfulOrderItem {
  external_id?: string;
  variant_id: string | number;
  quantity: number;
  retail_price?: number;
  name?: string;
  sku?: string;
}

export interface PrintfulOrder {
  id: number;
  external_id: string;
  status: string;
  shipping: PrintfulAddress;
  items: PrintfulOrderItem[];
  retail_costs: {
    subtotal: number;
    discount: number;
    shipping: number;
    tax: number;
    total: number;
    currency: string;
  };
  recipient: {
    name: string;
    email: string;
    address1: string;
    city: string;
    state_code: string;
    country_code: string;
    zip: string;
  };
  created: string;
  updated: string;
}

export interface PrintfulWebhookEvent {
  type: string;
  data: {
    order: PrintfulOrder;
    [key: string]: any;
  };
  timestamp: number;
  signature: string;
}