import OpenAI from "openai";

const prompt = process.argv.slice(2).join(" ").trim();

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY.");
  console.error('Example: export OPENAI_API_KEY="sk-..."');
  process.exit(1);
}

if (!prompt) {
  console.error('Usage: pnpm openai:query "Your prompt here"');
  process.exit(1);
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const response = await client.responses.create({
  model: "gpt-5",
  input: prompt,
});

console.log(response.output_text);
