import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function classifyTicket(ticketText: string): Promise<string> {
  // 1. Call anthropic.messages.create() with a system prompt that instructs
  //    the model to classify into: billing, technical, account, or other —
  //    single lowercase word, nothing else.
  // 2. Access response.content — find the first text block and extract .text
  //    (don't just index [0].text blindly — check the block's type first,
  //    since content can contain non-text blocks)
  // 3. Return the classification string.
}