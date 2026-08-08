
interface Message2 {
    role: "user" | "assistant";
    content: string;
}

interface RequestBody2 {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Message2[];
}

const firstMessage: RequestBody2 = {
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    system: "Classify the support ticket into exactly one category: billing, technical, account, or other. Return only the category name as a single lowercase word. Do not add explanations, punctuation, or any other text.",
    messages: [
        { role: "user", content: "I was charged twice for my subscription this month" }
    ]
}