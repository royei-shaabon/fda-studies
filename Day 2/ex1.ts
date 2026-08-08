interface RawProduct {
  product_name: string;
  price_cents: string;   // price stored as a string, in cents (e.g. "1999" = $19.99)
  in_stock: string;      // "1" or "0"
}

interface Product {
    name: string;
    price: number;
    inStock: boolean;
}

function normalizeProduct(raw: RawProduct): Product {
    return {
        name: raw.product_name,
        price: parseInt(raw.price_cents, 10) / 100,
        inStock: raw.in_stock === "1",
    }
}

const rawProduct: RawProduct = {
  product_name: "Widget",
  price_cents: "1999",
  in_stock: "1",
};

const product = normalizeProduct(rawProduct);

console.log(product);