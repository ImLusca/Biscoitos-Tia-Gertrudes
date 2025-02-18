import Fastify from "fastify";
import { OpenAI } from "openai";
import dotenv from "dotenv";

//import { embeddingsRefs } from "./jsons/embeddings/largeEmbeddingsRef.json";
import { Options, Referencia, Terms } from "./types";
import { checkForOptions, cosineSimilarity, preprocessInput } from "./utils";
import { Embeddings } from "openai/resources";
import { compareEmbeddings } from "./compareEmbedding";

dotenv.config();

const fastify = Fastify({ logger: true });
const openai = new OpenAI({ apiKey: process.env.OPEN_API_KEY });

fastify.post<{ Body: { embedding: number[] } }>(
  "/compare-embeddings",
  (request, reply) => {
    const { embedding } = request.body;

    return reply.send(compareEmbeddings(embedding));
  }
);

fastify.post<{ Body: { text: string } }>("/embed", async (request, reply) => {
  try {
    const { text } = request.body;

    const preproccessedText = preprocessInput(text);

    console.log(preproccessedText);

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: preproccessedText,
    });

    return reply.send({ embedding: response.data[0].embedding });
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

fastify.post<{ Body: { options: Options } }>(
  "/embeddingsOptions",
  async (request, reply) => {
    try {
      const { options } = request.body;
      if (!options) {
        return reply.status(400).send({ error: "options must be provided" });
      }

      const categories = [
        "sort_raising",
        "sort_descending",
        "filter_positive",
        "filter_negative",
      ] as const;

      const allTerms = categories.flatMap(
        (category) => options[category].terms
      );

      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: allTerms,
      });

      let index = 0;
      const optionsWithEmbeddings = Object.fromEntries(
        categories.map((category) => {
          const termsWithEmbeddings = options[category].terms.map((term) => ({
            term,
            embedding: response.data[index++].embedding,
          }));
          return [category, { terms: termsWithEmbeddings }];
        })
      );

      return reply.send({ options: optionsWithEmbeddings });
    } catch (error) {
      return reply.status(500).send({
        error: "Failed to generate embeddings",
        details: error,
      });
    }
  }
);

fastify.listen({ port: 3000 }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`Server running at ${address}`);
});
