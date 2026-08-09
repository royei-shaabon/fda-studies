import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Product {
  name: string;
  price: number;
  discountPercent: number;
}

type LookupProductResult =
  | {
      found: true;
      product: Product;
    }
  | {
      found: false;
      message: string;
    };

const products: Record<string, Product> = {
  A123: { price: 12, name: "banana", discountPercent: 0 },
  B456: { price: 6, name: "apple", discountPercent: 20 },
  B457: { price: 14, name: "melon", discountPercent: 15 },
  B458: { price: 8, name: "peach", discountPercent: 10 },
};

function lookupProduct(productId: string): LookupProductResult {
  const product = products[productId];

  if (!product) {
    return {
      found: false,
      message: "Product not found",
    };
  }

  return {
    found: true,
    product,
  };
}

function calculateDiscount(
  originalPrice: number,
  discountPercent: number
): number {
  return originalPrice * (1 - discountPercent / 100);
}

const lookupProductTool: Anthropic.Messages.Tool = {
  name: "lookup_product",
  description:
    "Look up product details by product ID. Use this whenever product information is needed. Never guess product details.",
  input_schema: {
    type: "object",
    properties: {
      productId: {
        type: "string",
        description: "The product SKU.",
      },
    },
    required: ["productId"],
  },
};

const calculateDiscountTool: Anthropic.Messages.Tool = {
  name: "calculate_discount",
  description:
    "Calculate a product's final price from its original price and discount percentage. Never guess missing values.",
  input_schema: {
    type: "object",
    properties: {
      originalPrice: {
        type: "number",
      },
      discountPercent: {
        type: "number",
      },
    },
    required: ["originalPrice", "discountPercent"],
  },
};

const systemPrompt = `
You are a product assistant.

Use lookup_product whenever product information is needed.

If the user asks for a final price after discount:
1. First use lookup_product.
2. If the product exists, use calculate_discount with the exact returned price and discountPercent.
3. Never calculate the discount yourself.
4. Never guess product information.

If the product does not exist, tell the user to contact the shift manager.
`;

async function runWithTools(userMessage: string): Promise<string> {
  let messages: Anthropic.Messages.MessageParam[] = [
    {
      role: "user",
      content: userMessage,
    },
  ];

  let response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 200,
    system: systemPrompt,
    tools: [lookupProductTool, calculateDiscountTool],
    messages,
  });

  let toolCalls = 0;

  while (response.stop_reason === "tool_use") {
    toolCalls++;

    if (toolCalls > 5) {
      throw new Error("Too many tool calls");
    }

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.Messages.ToolUseBlock =>
        block.type === "tool_use"
    );

    if (toolUseBlocks.length === 0) {
      throw new Error("Tool use block not found");
    }

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

    for (const toolUseBlock of toolUseBlocks) {
      let toolResult: unknown;

      if (toolUseBlock.name === "lookup_product") {
        const input = toolUseBlock.input;

        if (
          input !== null &&
          typeof input === "object" &&
          "productId" in input &&
          typeof input.productId === "string"
        ) {
          toolResult = lookupProduct(input.productId);
        }
      }

      if (toolUseBlock.name === "calculate_discount") {
        const input = toolUseBlock.input;

        if (
          input !== null &&
          typeof input === "object" &&
          "originalPrice" in input &&
          "discountPercent" in input &&
          typeof input.originalPrice === "number" &&
          typeof input.discountPercent === "number" &&
          Number.isFinite(input.originalPrice) &&
          Number.isFinite(input.discountPercent) &&
          input.originalPrice >= 0 &&
          input.discountPercent >= 0 &&
          input.discountPercent <= 100
        ) {
          toolResult = calculateDiscount(
            input.originalPrice,
            input.discountPercent
          );
        }
      }

      if (toolResult === undefined) {
        throw new Error(
          `Invalid input or unsupported tool: ${toolUseBlock.name}`
        );
      }

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUseBlock.id,
        content: JSON.stringify(toolResult),
      });
    }

    messages = [
      ...messages,
      {
        role: "assistant",
        content: response.content,
      },
      {
        role: "user",
        content: toolResults,
      },
    ];

    response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 200,
      system: systemPrompt,
      tools: [lookupProductTool, calculateDiscountTool],
      messages,
    });
  }

  const textBlock = response.content.find(
    (block): block is Anthropic.Messages.TextBlock =>
      block.type === "text"
  );

  if (!textBlock) {
    throw new Error("Text block not found");
  }

  return textBlock.text;
}

runWithTools("What is the final price of product B456 after its discount?")
  .then(console.log)
  .catch(console.error);