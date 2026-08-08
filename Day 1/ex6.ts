function fetchStock(sku: string): Promise<boolean> {
    return new Promise((resolve) => {
        setTimeout(() => {
            if (sku === "OUT_OF_STOCK") {
                resolve(false);
            } else {
                resolve(true);
            }
          }, 1000);
    });
}

async function checkStock(sku: string) {
    const result = await fetchStock(sku);
    if (result) {
        console.log('In Stock');
    }
    else {
        console.log('Out Of Stock');
    }
}

checkStock('123456d');
checkStock("OUT_OF_STOCK");