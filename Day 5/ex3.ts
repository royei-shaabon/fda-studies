interface Message3 {
    role: "user" | "assistant";
    content: string;
}

interface RequestBody3 {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Message3[];
}

function addTurn(
    history: Message3[],
    role: "user" | "assistant",
    content: string,
): Message3[] {
    if (history.length === 0 && role === "assistant"){
        throw new Error("First message must be from user");
    }
    
    if (history.length > 0 && history[history.length - 1].role === role){
        throw new Error("Role must alternate between user and assistant");
    }

    return [...history, { role, content } ];
}

function buildRequest(history: Message3[]): RequestBody3 {
    return {
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: "Classify the support ticket into exactly one category: billing, technical, account, or other. Return only the category name as a single lowercase word. Do not add explanations, punctuation, or any other text.",
        messages: history,
    };
}