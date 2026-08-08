interface Message5 {
    role: "user" | "assistant";
    content: string;
}

interface RequestBody5 {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Message5[];
}

function addTurn5(
    history: Message5[],
    role: "user" | "assistant",
    content: string,
): Message5[] {
    if (history.length === 0 && role === "assistant"){
        throw new Error("First message must be from user");
    }
    
    if (history.length > 0 && history[history.length - 1].role === role){
        throw new Error("Role must alternate between user and assistant");
    }

    return [...history, { role, content } ];
}

function buildRequest5(history: Message5[]): RequestBody5 {
    return {
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: "Classify the support ticket into exactly one category: billing, technical, account, or other. Return only the category name as a single lowercase word. Do not add explanations, punctuation, or any other text.",
        messages: history,
    };
}




interface ApiResponse5 {
  content: { type: "text"; text: string }[];
  stop_reason: string;
}

async function sendMessage5(history: Message5[]): Promise<string> {
    const request5 = buildRequest5(history);
    const jsRequest5 = JSON.stringify(request5);
    const response5 = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: jsRequest5,
    })

    if (!response5.ok) {
        throw new Error(`Failure, response status: ${response5.status}`);
    }

    const data5 = await response5.json();

    if (!Array.isArray(data5.content) || data5.content.length === 0){
        throw new Error("API response content is empty or invalid");
    }

    const firstBlock5 = data5.content[0];
    if (typeof firstBlock5.text !== "string"){
        throw new Error("Content must be a string");
    }

    return firstBlock5.text;
}


async function sendMessageStreaming(history: Message5[], onChunk: (text: string) => void): Promise<string> {
    const chunks = ["billing", ""];

    let fullText = "";

    for (const chunk of chunks) {
        await new Promise(resolve => setTimeout(resolve, 300));

        fullText += chunk;
        onChunk(chunk);
    }
     return fullText;
}

