import { llmWithTools } from "./LLM";

//? Smoke test to verify that the LLM and tools are working together correctly
export const smokeTest = async () => {
  try {
    const response = await llmWithTools.invoke([
      {
        role: "user",
        content: `Can you classify this text into categories 
            [Environment, Social, Goverance]: 'The company reduced its carbon emissions 
            by 30% this year.'`,
      },
    ]);
    console.log("=== LLM Response ===");
    console.log("Content: ", response.content);
    console.log("Tool calls: ", JSON.stringify(response.tool_calls, null, 2));
  } catch (error) {
    console.error("Error during smoke test:", error);
  }
};