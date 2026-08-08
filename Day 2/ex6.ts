interface RawProduct6 {
  product_name?: string;
  price_cents?: string;
  in_stock?: string;
}

interface Product6 {
    name: string;
    price: number;
    inStock: boolean;
}

const messyData: unknown[] = [
  { product_name: "Widget", price_cents: "1999", in_stock: "1" },
  { product_name: "Gadget", price_cents: "abc", in_stock: "0" }, // malformed price
  { price_cents: "500", in_stock: "1" }, // missing product_name
  { product_name: "Thingamajig", price_cents: "2500" }, // missing in_stock
  "not even an object", // completely wrong shape
  null,
  { product_name: 123, price_cents: "999", in_stock: "1" }, // wrong type for product_name
];

const validRawData6 = messyData.filter(isValidRawShape6);

function isValidRawShape6(data: unknown): data is RawProduct6{
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

function normalizeProduct6(raw: RawProduct6): Product6 | null {
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

const results6 = validRawData6.map(normalizeProduct6);

function isProduct6(p: Product6 | null): p is Product6 {
    return p !== null;
}

const filtered6 = results6.filter(isProduct6);

if (filtered6.length === 0){
    console.log ("No valid products");
} else {
    console.log("Survived:", filtered6.length);
    console.log ("Your products are: ", filtered6);
}



