interface Message4 {
    role: "user" | "assistant";
    content: string;
}

interface RequestBody4 {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Message4[];
}

function addTurn4(
    history: Message4[],
    role: "user" | "assistant",
    content: string,
): Message4[] {
    if (history.length === 0 && role === "assistant"){
        throw new Error("First message must be from user");
    }
    
    if (history.length > 0 && history[history.length - 1].role === role){
        throw new Error("Role must alternate between user and assistant");
    }

    return [...history, { role, content } ];
}

function buildRequest4(history: Message4[]): RequestBody4 {
    return {
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: "Classify the support ticket into exactly one category: billing, technical, account, or other. Return only the category name as a single lowercase word. Do not add explanations, punctuation, or any other text.",
        messages: history,
    };
}

//ex4

interface ApiResponse {
  content: { type: "text"; text: string }[];
  stop_reason: string;
}

async function sendMessage(history: Message4[]): Promise<string> {
    const request = buildRequest4(history);
    const jsRequest = JSON.stringify(request);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: jsRequest,
    })

    if (!response.ok) {
        throw new Error(`Failure, response status: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data.content) || data.content.length === 0){
        throw new Error("API response content is empty or invalid");
    }

    const firstBlock = data.content[0];
    if (typeof firstBlock.text !== "string"){
        throw new Error("Content must be a string");
    }

    return firstBlock.text;
}