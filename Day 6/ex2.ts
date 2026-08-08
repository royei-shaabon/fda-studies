const calculatorTool = {
  name: "calculate_discount",
  description: "Calculates the final price after applying a percentage discount. Use this whenever the user asks about a discounted price — never compute discounts yourself.",
  input_schema: {
    type: "object",
    properties: {
      originalPrice: {
        type: "number",
        description: "The original price in USD, before discount. Must be positive."
      },
      discountPercent: {
        type: "number",
        description: "The discount percentage as a whole number between 0 and 100 (e.g. 20 for 20%)."
      }
    },
    required: ["originalPrice", "discountPercent"]
  }
};