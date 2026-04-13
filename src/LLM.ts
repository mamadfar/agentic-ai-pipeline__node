
import { ChatOpenAI, ChatOpenAICallOptions } from "@langchain/openai";
// import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { tools } from "./tools";

// ============================================================
// LLM SETUP
// ============================================================

//* OpenAI
const llm = new ChatOpenAI<ChatOpenAICallOptions>({
  model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini', //? fast + cheap
  temperature: 0, //? 0 = deterministic, no creativity
  apiKey: process.env.OPENAI_API_KEY
})

//* Gemini
// const llm: ChatGoogleGenerativeAI = new ChatGoogleGenerativeAI({
//   model: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash', //? fast + cheap
//   temperature: 0, //? 0 = deterministic, no creativity
//   apiKey: process.env.GOOGLE_API_KEY
// })

export const llmWithTools = llm.bindTools(tools)