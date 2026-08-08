export interface RawOrder {
  index: string;
  customerName: string;
  productNumber: string;
  products: string[];
  delivered: string;
}

export function isRawOrder(data: unknown): data is RawOrder{
    //filters
    return true;
}

