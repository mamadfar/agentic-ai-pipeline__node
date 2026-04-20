import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import {
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";

import { llmWithTools } from "./LLM";
import { tools } from "./tools";
// import { smokeTest } from "./llm.test";

// smokeTest();

// ============================================================
//* SYSTEM PROPMT
// Giving the agent a domain identity improves tool selection
// accuracy and makes responses relevant to Sunhat's use case
// ============================================================

const SYSTEM_PROMPT = new SystemMessage(
  `You are an ESG (Environmental, Social, Goverance) data analyst assistant working for a 
sustainability reporting platform.
You have access to tools that help you process sustainability-related text:
- Use classify_text to categorize ESG content
- Use summarize_text to create concise overviews of long reports  
- Use extract_keywords to identify key themes in sustainability documents

Always use the most appropriate tool for the user's request. 
If a request requires multiple tools, use them in sequence.
Be concise and professional in your final responses.
`,
);

// ============================================================
//* NODE 1: The LLM node
// Receives the current message history, calls the LLM,
// returns the new AI message (which may contain tool_calls)
// ============================================================

const callLLM = async (state: typeof MessagesAnnotation.State) => {
  const response = await llmWithTools.invoke([
    SYSTEM_PROMPT,
    ...state.messages,
  ]);

  //? We return the new messages and LangGraph's reducer APPENDs it to state.messages automatically
  return { messages: [response] };
};

// ============================================================
//* NODE 2: The Tool node
// LangGraph's built-in ToolNode reads the tool_calls from the
// last AIMessage, executes the matching tool, and returns
// a ToolMessage with the result — all automatically.
// ============================================================

const toolNode = new ToolNode(tools);

// ============================================================
//* CONDITIONAL EDGE
// should we call a tool or stop?
// This function runs AFTER the LLM node to decide next step.
// ============================================================

const shouldContinue = (
  state: typeof MessagesAnnotation.State,
): "tools" | typeof END => {
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

  //? If the LLM returned tool_calls → go to the tool node
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return "tools";
  }

  //? Otherwise the LLM gave a final text answer → end the loop
  return END;
};

// ============================================================
//* BUILD THE GRAPH
// ============================================================

const graph = new StateGraph(MessagesAnnotation)
  //? Register our two nodes
  .addNode("llm", callLLM)
  .addNode("tools", toolNode)

  //? Entry point: always start at the LLM node
  .addEdge(START, "llm")

  //? After LLM runs: decide whether to call tools or end
  .addConditionalEdges("llm", shouldContinue)

  //? After tools run: ALWAYS go back to the LLM
  //? (LLM will read the tool result and decide what to do next)
  .addEdge("tools", "llm")

  .compile();

// ============================================================
//* RUN THE AGENT
// test with 3 different inputs
// ============================================================

export const runAgent = async (userInput: string): Promise<void> => {
  console.log("\n" + "=".repeat(60));
  console.log("USER: ", userInput);
  console.log("=".repeat(60) + "\n");

  try {
    const result = await graph.invoke(
      {
        messages: [new HumanMessage(userInput)],
      },
      {
        //? Hard cap on loop iterations - prevents runaway agents
        //? If the agent hasn't finished in 10 steps, something is wrong and we should stop
        recursionLimit: 10,
      },
    );

    //? The final answer is always the last message in state
    const finalMessage = result.messages[result.messages.length - 1];
    console.log("AGENT: ", finalMessage.content);

    //? Full message history - loop
    console.log("\n------------ Full message trace ------------\n");

    result.messages.forEach((msg: BaseMessage, i: number) => {
      const role = msg.constructor.name;
      const content =
        typeof msg.content === "string"
          ? msg.content.slice(0, 100)
          : JSON.stringify(msg.content).slice(0, 100);

      console.log(`[${i}] ${role}: ${content}`);
    });
  } catch (error) {
    //? GraphRecursionError lands here if recursionLimit is exceeded
    if (error instanceof Error && error.message.includes("recursion")) {
      console.error("Agent exceeded maximum steps. The loop did not converge.");
    } else {
      console.error(
        "Agent error:",
        error instanceof Error ? error.message : error,
      );
    }
  }
};

// ============================================================
//* STREAMING RUNNER
// shows the agent "thinking" live
// ============================================================

export const runAgentStreaming = async (userInput: string): Promise<void> => {
  console.log("\n" + "=".repeat(60));
  console.log("USER: ", userInput);
  console.log("=".repeat(60) + "\n");

  try {
    const stream = await graph.stream(
      {
        messages: [new HumanMessage(userInput)],
      },
      {
        //? "updates" mode emits each node's output as it completes -
        //? we see the tool call, then the tool result, then final answer, all in real time
        streamMode: "updates",
        recursionLimit: 10,
      },
    );

    for await (const chunk of stream) {
      //? Each chunk is { nodeName: { messages: [...] } }
      const nodeName = Object.keys(chunk)[0];
      const nodeOutput = chunk[nodeName as keyof typeof chunk];

      if (nodeName === "tools") {
        //? Tool result coming in
        const toolMsg = nodeOutput.messages[nodeOutput.messages.length - 1];
        console.log(`\n[TOOL RESULT] ${toolMsg.content}`);
      } else if (nodeName === "llm") {
        //? LLM output - either a tool call decision or final answer
        const aiMsg = nodeOutput.messages[
          nodeOutput.messages.length - 1
        ] as AIMessage;

        if (aiMsg.tool_calls && aiMsg.tool_calls.length > 0) {
          //? LLM decided to call a tool - show which one and why
          aiMsg.tool_calls.forEach((toolCall) => {
            console.log(`\n[TOOL CALL] → ${toolCall.name}`);
            console.log(`  args: ${JSON.stringify(toolCall.args)}`);
          });
        } else {
          //? LLM gave a final answer - show it
          console.log(`\n[FINAL ANSWER] ${aiMsg.content}`);
        }
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("recursion")) {
      console.error("Agent exceeded maximum steps.");
    } else {
      console.error(
        "Agent error:",
        error instanceof Error ? error.message : error,
      );
    }
  }
};
