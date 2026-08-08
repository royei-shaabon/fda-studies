const lookupProductTool = {
  name: "lookup_product",
  description: "Look up and return product details by product ID from the available product dataset. Use this tool whenever product information is needed instead of guessing product details.",
  input_schema: {
    type: "object",
    properties: {
      productId: {
        type: "string",
        description: "The unique product identifier (SKU) used to retrieve the product details. It is a string that may contain both letters and numbers, and each product has exactly one unique ID. If the provided product ID does not exist in the dataset, do not invent or guess product details. Return a clear 'ID not found' result."
      }
    },
    required: ["productId"]
  }
};