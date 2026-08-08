
interface Message {
    role: "user" | "assistant";
    content: string;
}

interface RequestBody {
    model: string;
    max_tokens: number;
    system?: string;
    messages: Message[];
}