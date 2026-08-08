import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});




const lookupProductTool: Anthropic.Messages.Tool = {
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


async function runWithTools(userMessage: string): Promise<string> {
    const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6", 
        max_tokens: 200, 
        system: "You are a product assistant. Use the available tools whenever product data is needed. Never guess or invent product details.", 
        tools: [lookupProductTool],
        messages: [
            { role: "user", content: userMessage }
        ],
    })

    if (response.stop_reason === "tool_use"){
        const toolUseBlock = response.content.find((block): block is Anthropic.Messages.ToolUseBlock => block.type === "tool_use");

        if (!toolUseBlock) {
            throw new Error("Tool use block not found");
        }
        

        const stubResult = {
            found: true,
            name: "banana",
            price: 19
        }

        const messageArray: Anthropic.Messages.MessageParam[] = [
        {
            role: "user",
            content: userMessage
        },
        {
            role: "assistant",
            content: response.content
        },
        {
            role: "user",
            content:[
                {
                    type: "tool_result",
                    tool_use_id: toolUseBlock.id,
                    content: JSON.stringify(stubResult)
                }
            ]
        }];

        const responseWithTool = await anthropic.messages.create({
            model: "claude-sonnet-4-6", 
            max_tokens: 200, 
            system: "You are a product assistant. Use the available tools whenever product data is needed. Never guess or invent product details.", 
            tools: [lookupProductTool],
            messages: messageArray
        })

        const textBlock = responseWithTool.content.find((block): block is Anthropic.Messages.TextBlock => block.type === "text");

        if (!textBlock) {
            throw new Error("Text block not found");
        }

        return textBlock.text;

    }

    const textBlock = response.content.find((block): block is Anthropic.Messages.TextBlock => block.type === "text");
    if (!textBlock) {
            throw new Error("Text block not found");
        }

    return textBlock.text;
}