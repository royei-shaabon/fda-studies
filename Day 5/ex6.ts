import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});


async function classifyTicket(ticketText: string): Promise<string> {
    const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6", 
        max_tokens: 200, 
        system: "Classify the support ticket as billing, technical, account, or other. Return exactly one lowercase word and nothing else.", 
        messages: [
            { role: "user", content: ticketText }
        ],
    })

    if (response.content.length === 0){
        throw new Error("Response content is empty");
    }

    const firstBlock = response.content[0];
    if (firstBlock.type !== "text"){
        throw new Error("Expected a text content block");
    }

    return firstBlock.text;

}

async function main() {
    const result = await classifyTicket("I was charged twice this month");
    console.log(result);
}

main();