import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { loadReferenceCache } from "./referenceCache";

import {
  getAirportMetricTool,
  rankAirportsTool,
  runTool,
} from "./tools";


dotenv.config({ path: "../.env" });
// Creates the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});


// Require the model name from the environment
const MODEL = "claude-sonnet-4-5-20250929";


// Defines the agent's role and business limitations
const SYSTEM_PROMPT = `
You are an Airport Investment Intelligence Agent.

Your goal is to help identify U.S. airports where additional terminal capacity
may be justified by strong, sustained passenger demand.

Use the provided tools for all airport metrics, rankings, and scores.

Important rules:
- Never calculate scores, percentages, rankings, or airport metrics yourself.
- All quantitative airport results must come from the tools.
- Use get_airport_metric when the user asks about one specific metric,
  including comparisons across multiple airports.
- If the user asks about congestion, congestion levels, delays, or delay rates,
  always use get_airport_metric with metric="delay_rate", unless the user
  explicitly asks for overall Terminal Demand Pressure or expansion candidacy.
- Use rank_airports when the user asks about overall Terminal Demand Pressure,
  ranking, investment candidacy, or terminal expansion candidates.
- Do not invent airport membership for unsupported regions.
- If a region is unsupported, explain that clearly.
- Terminal Demand Pressure is a screening proxy, not true terminal utilization,
  profitability, financial ROI, or exact unmet passenger demand.
- Exact unmet passenger demand cannot be quantified from the available data.
  For questions about unmet demand, use Terminal Demand Pressure as a proxy
  when possible and clearly state the limitation.
- Monthly YoY is supporting context only and is not part of the weighted score.
- Treat departure delay rate as a proxy for operational pressure, not direct
  evidence of terminal capacity constraints.
- When ranking a supported region, make clear that the result covers the
  airports included in the current supported region mapping/reference set,
  not necessarily every airport in that geographic region.
- When explaining tool results, do not add airport-specific factual claims that
  are not present in the tool output.
- Long-haul share means the share of outbound passengers traveling on nonstop
  segments over 1,864 miles. Do not describe it as complete passenger itineraries.
- Normalized scores are relative to the fixed reference population used by this
  MVP, not necessarily all U.S. airports.
- Historical passenger growth is the average annual YoY growth across complete
  years from 2022 to 2025. Do not describe it as CAGR or a five-year growth rate.
- Current passenger scale means total outbound passengers across the latest
  12 available T-100 months. Do not describe it as total airport passengers.
- Terminal Demand Pressure may indicate demand pressure worth further
  investigation, but it is not evidence that unmet passenger demand exists.
- Do not derive or invent additional metrics such as CAGR from tool results.
- When the user asks which metric contributes most to a final score, use the
  weightedContributions values returned by rank_airports. Do not rank
  contributions by normalized score alone.
- Explain results clearly using the tool output and state important limitations.
- Do not calculate percentages or other derived values from tool results.
  If a derived value is not explicitly returned by a tool, do not report it.
`;


// Runs the model until it produces a normal text response
async function runWithTools(
  messages: Anthropic.MessageParam[],
  cache: Awaited<ReturnType<typeof loadReferenceCache>>,
): Promise<string> {

  while (true) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages,

      // Expose both airport tools to the model
      tools: [
        getAirportMetricTool,
        rankAirportsTool,
      ] as Anthropic.Tool[],
    });


    // Keep the assistant response in conversation history
    messages.push({
      role: "assistant",
      content: response.content,
    });


    // Find all tool calls in this response
    const toolUses = response.content.filter(
      block => block.type === "tool_use"
    );


    // If no tool was requested, return the model's text answer
    if (toolUses.length === 0) {
      const textBlocks = response.content.filter(
        block => block.type === "text"
      );

      return textBlocks
        .map(block => block.text)
        .join("\n");
    }


    // Run every requested tool
const toolResults: Anthropic.ToolResultBlockParam[] =
  toolUses.map(toolUse => {

    // Show which tool the model selected
    console.log(
      "Tool call:",
      toolUse.name,
      toolUse.input
    );

    try {
      const result = runTool(
        cache,
        toolUse.name,
        toolUse.input,
      );

      return {
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: JSON.stringify(result),
      };
    } catch (error) {
      return {
        type: "tool_result",
        tool_use_id: toolUse.id,
        is_error: true,
        content: JSON.stringify({
          ok: false,
          error: "tool_execution_error",
        }),
      };
    }
  });


    // Tool results are returned to the model as a user turn
    messages.push({
      role: "user",
      content: toolResults,
    });
  }
}


// Runs the interactive chat agent
async function main() {

  // Load the precomputed cache once at startup
  const cache = await loadReferenceCache();

  console.log(
    `Reference cache loaded: ${cache.computedAt}`
  );


  // Stores the full conversation history
  const messages: Anthropic.MessageParam[] = [];


  // Creates the terminal chat interface
  const rl = createInterface({
    input,
    output,
  });


  console.log(
    "\nAirport Investment Intelligence Agent"
  );

  console.log(
    'Type "exit" to quit.\n'
  );


  while (true) {
    const userInput = await rl.question("You: ");


    // End the chat cleanly
    if (userInput.trim().toLowerCase() === "exit") {
      break;
    }


    // Ignore empty messages
    if (userInput.trim() === "") {
      continue;
    }


    // Add the user's message to conversation history
    messages.push({
      role: "user",
      content: userInput,
    });


    try {
      // Let the agent choose and run tools as needed
      const answer = await runWithTools(
        messages,
        cache,
      );

      console.log(`\nAgent: ${answer}\n`);
    } catch (error) {
      console.error(
        "\nAgent error:",
        error
      );
    }
  }


  rl.close();
}


// Start the agent
main().catch(console.error);