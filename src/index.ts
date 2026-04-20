import "dotenv/config";
import { runAgent, runAgentStreaming } from "./agent";

const main = async () => {
  console.log("\n============ Standard invoke ============\n");
  await runAgent(`Classify this text into [Environment, Social, Governance]: 
        'The company donated 2 million euros to local community programs.'`);

  await runAgent(`Extract the main keywords from: 
    'Carbon neutrality targets require investment in renewable energy, 
    supply chain transparency, and stakeholder reporting frameworks.'`);

  await runAgent(`What tools do you have available?`); //? tests direct answer — no tool call

  console.log(
    "\n\n============ Streaming ============\n",
  );
    await runAgentStreaming(
    "First extract keywords, then summarize this text in 20 words: " +
    "'Scope 3 emissions from our supply chain account for 78% of our total " +
    "carbon footprint. We are partnering with 200 suppliers to implement " +
    "science-based targets and improve emissions reporting transparency.'"
  );
};

main().catch((error) => {
  console.error(
    "Unhandled error in main:",
    error instanceof Error ? error.message : error,
  );
});
