interface RawProduct4 {
  product_name?: string;
  price_cents?: string;
  in_stock?: string;
}

interface Product4 {
    name: string;
    price: number;
    inStock: boolean;
}

function normalizeProduct4(raw: RawProduct4): Product4 | null {
    if (raw.product_name === undefined || raw.price_cents === undefined) {
        return null;
    }

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

const rawProducts4: RawProduct4[] = [
    {
        price_cents: "ABG",
        in_stock: "1",
    },{
        product_name: "Widget2",
        price_cents: "123",
        in_stock: "1",
    },{
        product_name: "Widget3",
        price_cents: "234",
    }
];

const results4 = rawProducts4.map(normalizeProduct4);
console.log(results4);





