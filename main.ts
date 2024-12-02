import { ChromaClient } from "chromadb";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { generateText } from "ai";
import { ollama } from "ollama-ai-provider";
import { highlight } from "cli-highlight";
import crypto from "crypto";

const client = new ChromaClient({ path: "http://localhost:8000" });

const collection = await client.getOrCreateCollection({
  name: "rag_tutorial_collection",
});

function generateContentHash(content) {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const typesFilePath = path.join(__dirname, "example-src/types.d.ts");
const typesFile = await fs.readFile(typesFilePath, "utf8");
const typesFileHash = generateContentHash(typesFile);

const utilsFilePath = path.join(__dirname, "example-src/utils.ts");
const utilsFile = await fs.readFile(utilsFilePath, "utf8");
const utilsFileHash = generateContentHash(utilsFile);

await collection.add({
  documents: [typesFile, utilsFile],
  ids: [typesFileHash, utilsFileHash],
});

const jsFilePath = path.join(__dirname, "example-src/example.js");
const jsFile = await fs.readFile(jsFilePath, "utf8");

console.log("\nJavaScript code: \n");
console.log(highlight(jsFile, { language: "javascript" }));

const results = await collection.query({
  queryTexts: jsFile,
  nResults: 1,
});

const searchDocs = results.documents[0].join("\n");

const system = `
    You are a TypeScript developer. Convert this JavaScript code to TypeScript.

    Only output the converted code.

    Use the TypeScript code below to conver the JavaScript file to TypeScript.

    ${searchDocs}
`;

console.log("Converting JavaScript to TypeScript...\n");
const { text } = await generateText({
  model: ollama("qwen2.5-coder:0.5b"),
  system,
  prompt: jsFile,
});

const trimmedText = text.replace(/```(typescript|javascript)|```/g, "").trim();

console.log("TypeScript code: \n");
console.log(highlight(trimmedText, { language: "typescript" }));
