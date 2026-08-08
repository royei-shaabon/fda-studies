function applyDiscount(price: number, discountPercent?:number){
    return price - (price * ((discountPercent ?? 0)/100));
}

function applyDiscount1(price: number, discountPercent: number = 0){
    return price - (price * (discountPercent/100));
}

console.log(applyDiscount(100, undefined));
console.log(applyDiscount1(100, undefined));
/*console.log(applyDiscount1(100, null)); הערך NULL לא נחשב ויוצר בעיה*/