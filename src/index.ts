import "dotenv/config";
import { runAgent } from "./agent";

const main = async () => {
  await runAgent(`Classify this text into [Environment, Social, Governance]: 
        'The company donated 2 million euros to local community programs.'`);

  await runAgent(`Extract the main keywords from: 
    'Carbon neutrality targets require investment in renewable energy, 
    supply chain transparency, and stakeholder reporting frameworks.'`);

  await runAgent(`What tools do you have available?`); //? tests direct answer — no tool call
};

main().catch(console.error)