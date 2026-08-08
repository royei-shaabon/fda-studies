import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});


interface Ticket {
  id: string;
  text: string;
}

interface TicketClassification {
  id: string;
  category: "billing" | "technical" | "account" | "other";
  confidence: "high" | "low";
}

interface ClassificationResult {
    successful: TicketClassification[];
    failedIds: string[];
    failedCount: number;
}

async function classifyTickets(tickets: Ticket[]): Promise<ClassificationResult> {
    const results: TicketClassification[] = [];
    const failures: string[] = [];

    for (const ticket of tickets) {
        try {
            const response = await anthropic.messages.create({
                model: "claude-sonnet-4-6", 
                max_tokens: 200, 
                system: `Classify the support ticket.
                        Return only valid JSON with exactly these fields:
                        {
                        "category": "billing",
                        "confidence": "high"
                        }
                        Allowed values:
                        - category: billing, technical, account, other
                        - confidence: high, low
                        Rules:
                        - Return JSON only.
                        - Do not include explanations.
                        - Do not use markdown or code fences.
                        - Use lowercase values only.`, 
                messages: [
                    { role: "user", content: ticket.text }
                ],
            })

            if (response.content.length === 0){
                failures.push(ticket.id);
                continue;
            }

            const firstBlock = response.content[0];

            if (firstBlock.type !== "text"){
                failures.push(ticket.id);
                continue;
            }

            const cleanedText = stripCodeFences(firstBlock.text);
            const parsed: unknown = JSON.parse(cleanedText);

            if (typeof parsed !== "object" || parsed === null) {
                failures.push(ticket.id);
                continue;
            }

            const candidate = {
                ...parsed,
                id: ticket.id,
            };

            if (isTicketClassification(candidate)) {
                results.push(candidate);
            } else {
                failures.push(ticket.id);
            }
        } catch (error) {
            console.log(`Failed to classify ticket ${ticket.id}`);
            failures.push(ticket.id);
        }
    }
    return {
        successful: results,
        failedIds: failures,
        failedCount: failures.length
    }
}

function isTicketClassification(data: unknown): data is TicketClassification{
    
    if (typeof data !== "object" || data === null)
        return false;

    if (!("id" in data) || typeof data.id !== "string" || data.id.trim() === "")
        return false;

    if (!("category" in data) || typeof data.category !== "string" || !["billing", "technical", "account", "other"].includes(data.category))
        return false;

    if (!("confidence" in data) || typeof data.confidence !== "string" || !["high", "low"].includes(data.confidence))
        return false;

    return true;
}

function stripCodeFences(text: string): string {
    const trimmed = text.trim();

    if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
        return trimmed
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/, "")
            .replace(/\s*```$/, "")
            .trim();
    }

    return trimmed;
}


async function main() {
  const tickets: Ticket[] = [
    {
      id: "1",
      text: "I was charged twice for my subscription.",
    },
    {
      id: "2",
      text: "The app crashes whenever I open the settings page.",
    },
    {
      id: "3",
      text: "I cannot log into my account.",
    },
  ];

  const result = await classifyTickets(tickets);

  console.log(result);
}

main();