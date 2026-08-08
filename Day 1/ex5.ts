const isEligibleForFreeShipping = (orderTotal: number, minimumThreshold: number): boolean => {
  return orderTotal >= minimumThreshold;
}

const isEligibleForFreeShipping1 = (orderTotal: number, minimumThreshold: number): boolean => 
  orderTotal >= minimumThreshold;

console.log(isEligibleForFreeShipping1);