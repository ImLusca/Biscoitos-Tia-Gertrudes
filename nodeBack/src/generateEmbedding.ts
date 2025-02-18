import { OpenAI } from "openai";
import { preprocessInput } from "./utils";

export const generateEmbedding = async (openai: OpenAI, userInput: string) => {
  const preproccessedText = preprocessInput(userInput);

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: preproccessedText,
  });

  console.log(response.data[0].embedding);

  return response.data[0].embedding;
};
