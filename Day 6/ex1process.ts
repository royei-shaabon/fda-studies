
import { RawOrder, isRawOrder } from "./ex1validation";

function processOrders(data: unknown[]): void {
    const validOrders: RawOrder[] = data.filter(isRawOrder);
}