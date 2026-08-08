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

function normalizeProduct1(raw: RawProduct): Product | null {
    const parsedPrice = parseInt(raw.price_cents, 10);

    if (Number.isNaN(parsedPrice)){
        return null;
    }

    return {
        name: raw.product_name,
        price: parsedPrice / 100,
        inStock: raw.in_stock === "1",
    }
}

const rawProduct1: RawProduct = {
    product_name: "Widget",
    price_cents: "ABG",
    in_stock: "1",
};

const product1 = normalizeProduct1(rawProduct1);

if (product1 === null) {
    console.log(null);
} else {
    console.log(product1);
}




