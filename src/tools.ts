import { tool } from "@langchain/core/tools";
import { z } from "zod";

// ================================================
// TOOL 1: Text Classification
// ================================================

const classifyTextTool = tool(
  async ({ text, categories }) => {
    const lower = text.toLowerCase();

    const matched = categories.find((category) =>
      lower.includes(category.toLowerCase()),
    );
    const result = matched ?? categories[0];

    return `Classification result: "${result}". Confidence: high.`;
  },
  {
    name: "classify_text",
    description: `Classifies a piece of text into one of the provided categories. 
    Use this when the user wants to categorize or label text.`,

    schema: z.object({
      text: z.string().describe("The text to classify"),
      categories: z
        .array(z.string())
        .describe("List of possible categories to classify into"),
    }),
  },
);

// ============================================================
// TOOL 2: Text Summarization
// ============================================================

const summarizeTextTool = tool(
  async ({ text, max_words }) => {
    const words = text.split(" ");
    const truncated = words.slice(0, max_words).join(" ");
    const summary =
      words.length > max_words ? truncated + "... [truncated]" : truncated;

    return `Summary: (max ${max_words} words): "${summary}"`;
  },
  {
    name: "summarize_text",
    description: `Summarizes a long piece of text into a shorter version. Use 
    this when the user wants to brief overivew or digest of content.`,
    schema: z.object({
      text: z.string().describe("The text to summarize"),
      max_words: z
        .number()
        .default(50)
        .describe("Maximum number of words in the summary"),
    }),
  },
);

// ============================================================
// TOOL 3: Keyword Extraction
// ============================================================

const extractKeywordsTool = tool(async ({ text, max_keywords }) => {
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "is",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "and",
    "or",
    "but",
    "it",
    "this",
    "that",
    "with",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
  ]);

  const wordFreq = new Map<string, number>();

  text
    .toLowerCase()
    .replace(/[^a-z\s]/g, "") // strip punctuation
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word)) // filter short and stop words
    .forEach((word) => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    const keywords = [...wordFreq.entries()]
    .sort((a, b) => b[1] - a[1]) // sort by frequency
    .slice(0, max_keywords) // take top N
    .map(([word]) => word); // extract just the words

    return `Top keywords: ${keywords.join(", ")}`;
}, {
    name: "extract_keywords",
    description: `Extracts the most important keywords or topics from a text. 
    Use this when the user wants to understand the main themes of a document.`,
    schema: z.object({
      text: z.string().describe("The text to extract keywords from"),
      max_keywords: z
        .number()
        .default(5)
        .describe("Maximum number of keywords to return"),
    }),
});

export const tools = [classifyTextTool, summarizeTextTool, extractKeywordsTool];

