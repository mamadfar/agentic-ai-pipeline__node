import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { END, MessagesAnnotation, START, StateGraph } from "@langchain/langgraph";

import { llmWithTools } from "./LLM";
import { tools } from "./tools";
import { smokeTest } from "./llm.test";

// smokeTest();

// ============================================================
//* NODE 1: The LLM node
// Receives the current message history, calls the LLM,
// returns the new AI message (which may contain tool_calls)
// ============================================================

const callLLM = async (state: typeof MessagesAnnotation.State) => {
    const response = await llmWithTools.invoke(state.messages);

    //? We return the new messages and LangGraph's reducer APPENDs it to state.messages automatically
    return {messages: [response]}
}

// ============================================================
//* NODE 2: The Tool node
// LangGraph's built-in ToolNode reads the tool_calls from the
// last AIMessage, executes the matching tool, and returns
// a ToolMessage with the result — all automatically.
// ============================================================

const toolNode = new ToolNode(tools)

// ============================================================
// CONDITIONAL EDGE: should we call a tool or stop?
// This function runs AFTER the LLM node to decide next step.
// ============================================================

const shouldContinue = (state: typeof MessagesAnnotation.State): 'tools' | typeof END => {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

    //? If the LLM returned tool_calls → go to the tool node
    if(lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
        return 'tools'
    }

    //? Otherwise the LLM gave a final text answer → end the loop
    return END;
}

// ============================================================
// BUILD THE GRAPH
// ============================================================

const graph = new StateGraph(MessagesAnnotation)
//? Register our two nodes
.addNode('llm', callLLM)
.addNode('tools', toolNode)

//? Entry point: always start at the LLM node
.addEdge(START, 'llm')

//? After LLM runs: decide whether to call tools or end
.addConditionalEdges('llm', shouldContinue)

//? After tools run: ALWAYS go back to the LLM
//? (LLM will read the tool result and decide what to do next)
.addEdge('tools', 'llm')

.compile();

// ============================================================
// RUN THE AGENT — test with 3 different inputs
// ============================================================

export const runAgent = async (userInput: string) => {
    console.log('\n' + '='.repeat(60));
    console.log('USER: ', userInput);
    console.log('='.repeat(60) + '\n');

    const result = await graph.invoke({
        messages: [new HumanMessage(userInput)]
    });

    //? The final answer is always the last message in state
    const finalMessage = result.messages[result.messages.length - 1];
    console.log('AGENT: ', finalMessage.content);

    //? Full message history - loop
    console.log('\n--- Full message trace ---');

    result.messages.forEach((msg: BaseMessage, i: number) => {
        const role = msg.constructor.name;
        const content = typeof msg.content === 'string'
        ? msg.content.slice(0, 100)
        : JSON.stringify(msg.content).slice(0, 100);

        console.log(`[${i}] ${role}: ${content}`);
    })
}