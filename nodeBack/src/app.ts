import Fastify from "fastify";
import { OpenAI } from "openai";
import dotenv from "dotenv";

//import { embeddingsRefs } from "./jsons/embeddings/largeEmbeddingsRef.json";
import { Referencia } from "./types";
import { preprocessInput } from "./utils";
import { compareEmbeddings, EmbeddingSimilarity } from "./compareEmbedding";
import { generateResponse } from "./generateResponse";
import { generateEmbedding } from "./generateEmbedding";

dotenv.config();

const fastify = Fastify({ logger: true });
const openai = new OpenAI({ apiKey: process.env.OPEN_API_KEY });

fastify.post<{ Body: { userInput: string } }>(
  "/do-everything",
  async (request, reply) => {
    try {
      const { userInput } = request.body;

      const userEmbedding = await generateEmbedding(openai, userInput);
      const references = compareEmbeddings(userEmbedding);
      const response = await generateResponse(openai, userInput, references);

      return reply.send(response);
    } catch (error) {
      return reply
        .status(500)
        .send({ error: "Failed to do everything", details: error });
    }
  }
);

fastify.post<{
  Body: { userInput: string; references: EmbeddingSimilarity[] };
}>("/generate-response", async (request, reply) => {
  const { userInput, references } = request.body;

  const response = await generateResponse(openai, userInput, references);

  return reply.send(response);
});

fastify.post<{ Body: { embedding: number[] } }>(
  "/compare-embeddings",
  (request, reply) => {
    try {
      const { embedding } = request.body;
      return reply.send(compareEmbeddings(embedding));
    } catch (error) {
      return reply
        .status(500)
        .send({ error: "Failed to compare embeddings", details: error });
    }
  }
);

fastify.post<{ Body: { text: string } }>("/embed", async (request, reply) => {
  try {
    const { text } = request.body;
    return reply.send(await generateEmbedding(openai, text));
  } catch (error) {
    return reply
      .status(500)
      .send({ error: "Failed to generate embeddings", details: error });
  }
});

fastify.post<{ Body: { refs: Referencia[] } }>(
  "/embeddings",
  async (request, reply) => {
    const { refs } = request.body;

    for (const referencia of refs) {
      if (referencia.terms.length > 0) {
        try {
          const response = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: referencia.terms,
          });

          referencia.termsEmbeddings = response.data.map(
            (embedding) => embedding.embedding
          );
        } catch (error) {
          console.error(
            `Erro ao gerar embeddings para ${referencia.item}:`,
            error
          );
        }
      }
      console.log(`${referencia.item} done`);
    }
    return reply.send(refs);
  }
);

fastify.listen({ port: 3000 }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`Server running at ${address}`);
});
