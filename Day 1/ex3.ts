type PaytmentMethod = "credit_card" | "paypal" | "bank_transfer";

interface Orderrr {
    orderId: string;
    total: number;
    isPaid: boolean;
    paymentMethod: PaytmentMethod;
}

let myorder: Orderrr = {
    orderId: "123456r",
    total: 100,
    isPaid: true,
    paymentMethod: "paypal",
}

