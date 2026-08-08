interface Order {
    orderId: string;
    total: number;
    isPaid: boolean;
}
let order: Order = {
    orderId: "dfkjh33",
    total: 123,
    isPaid: true,
}

interface Orderr {
    orderId: string;
    total: number;
    isPaid?: boolean;
}

let orderr: Orderr = {
    orderId: "dfkjh33",
    total: 123,
}

console.log(order);
console.log(orderr);

/*let Order: {orderId: string; total: number; isPaid: boolean} = {
    orderId: "dfkjh33",
    total: 123,
    isPaid: true,
};*/

