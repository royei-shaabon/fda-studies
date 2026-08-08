interface RawProduct5 {
  product_name?: string;
  price_cents?: string;
  in_stock?: string;
}

interface Product5 {
    name: string;
    price: number;
    inStock: boolean;
}

function isProduct5Raw(data: unknown): data is RawProduct5{
    return(
        typeof data === "object" &&
        data !== null &&
        (!("product_name" in data) ||
        typeof (data as any).product_name === "string") &&
        (!("price_cents" in data) || 
        typeof (data as any).price_cents === "string") &&
        (!("in_stock" in data) || 
        typeof (data as any).in_stock === "string")   
    );
}

console.log(isProduct5Raw({})); // empty object — everything's absent
console.log(isProduct5Raw({ product_name: "Widget" })); // partial, but correct type
console.log(isProduct5Raw({ product_name: 123 })); // wrong type
console.log(isProduct5Raw("hello")); // not an object at all
console.log(isProduct5Raw(null)); // null

function normalizeProduct5(raw: RawProduct5): Product5 | null {
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

const rawProducts5: RawProduct5[] = [
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

const results5 = rawProducts5.map(normalizeProduct5);
console.log(results5);





