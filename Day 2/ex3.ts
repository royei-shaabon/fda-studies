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

function normalizeProduct2(raw: RawProduct): Product | null {
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

const rawProducts: RawProduct[] = [
    {
        product_name: "Widget1",
        price_cents: "ABG",
        in_stock: "1",
    },{
        product_name: "Widget2",
        price_cents: "123",
        in_stock: "0",
    },{
        product_name: "Widget3",
        price_cents: "234",
        in_stock: "1",
    },{
        product_name: "Widget4",
        price_cents: "DSD3",
        in_stock: "0",
    }
];

const results = rawProducts.map(normalizeProduct2);

function isProduct(p: Product | null): p is Product {
    return p !== null;
}

const filtered = results.filter(isProduct);

const totalPrice = filtered.reduce((sum, product) => {
    return sum + product.price;
}, 0);

if (filtered.length === 0){
    console.log ("No valid products");
} else {
    const calculatePrice = totalPrice/filtered.length;
    console.log ("The average price is: ", calculatePrice);
}





