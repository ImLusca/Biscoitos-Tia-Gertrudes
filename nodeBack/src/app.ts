import Fastify from "fastify";
import { OpenAI } from "openai";
import dotenv from "dotenv";

// import { embeddingsRefs } from "./jsons/embeddings/embeddingsRef.json";
import { embeddingsRefs } from "./jsons/embeddings/largeEmbeddingsRef.json";
import { optionsEmbeddings } from "./jsons/optionsEmbeddings.json";

dotenv.config();

const fastify = Fastify({ logger: true });
const openai = new OpenAI({ apiKey: process.env.OPEN_API_KEY });

interface Referencia {
  pagina: string;
  descricao: string;
  embedding?: number[];
}

interface Options {
  sort_raising: {
    terms: string[];
  };
  sort_descending: {
    terms: string[];
  };
  filter_positive: {
    terms: string[];
  };
  filter_negative: {
    terms: string[];
  };
}

interface OptionsWithEmbeddings {
  sort_raising: {
    terms: Terms[];
  };
  sort_descending: {
    terms: Terms[];
  };
  filter_positive: {
    terms: Terms[];
  };
  filter_negative: {
    terms: Terms[];
  };
}

interface Terms {
  term: string;
  embedding: number[];
}

const checkForOptions = (
  userInputEmbedding: number[],
  optionsWithEmbeddings: OptionsWithEmbeddings,
  similarityThreshold: number = 0.8
): { option: string; term: string; similarity: number } | null => {
  let bestMatch: { option: string; term: string; similarity: number } | null =
    null;

  const checkTerms = (optionName: string, terms: Terms[]) => {
    for (const term of terms) {
      const similarity = cosineSimilarity(userInputEmbedding, term.embedding);

      if (
        similarity >= similarityThreshold &&
        (!bestMatch || similarity > bestMatch.similarity)
      ) {
        bestMatch = {
          option: optionName,
          term: term.term,
          similarity,
        };
      }
    }
  };

  checkTerms("sort_raising", optionsWithEmbeddings.sort_raising.terms);
  checkTerms("sort_descending", optionsWithEmbeddings.sort_descending.terms);
  checkTerms("filter_positive", optionsWithEmbeddings.filter_positive.terms);
  checkTerms("filter_negative", optionsWithEmbeddings.filter_negative.terms);

  return bestMatch;
};
const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (vecA.length !== vecB.length) {
    throw new Error("Os vetores devem ter o mesmo tamanho.");
  }

  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

  if (magnitudeA === 0 || magnitudeB === 0) {
    throw new Error("Os vetores não podem ter magnitude zero.");
  }

  return dotProduct / (magnitudeA * magnitudeB);
};

fastify.post<{ Body: { embedding: number[] } }>(
  "/compareSimilarities",
  (request, reply) => {
    const { embedding } = request.body;

    const similarities = embeddingsRefs.map((ref: Referencia) => {
      if (!ref.embedding) {
        throw new Error("Referência sem embedding.");
      }
      return {
        ...ref,
        similarity: cosineSimilarity(embedding, ref.embedding),
      };
    });

    similarities.forEach((similarity) => {
      delete similarity.embedding;
    });

    const orderedSimilarities = similarities.sort(
      (a, b) => b.similarity - a.similarity
    );

    return reply.send({ orderedSimilarities });
  }
);

fastify.post<{ Body: { text: string } }>("/embed", async (request, reply) => {
  try {
    const { text } = request.body;

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
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
    try {
      const { refs } = request.body;

      if (!refs || !Array.isArray(refs)) {
        return reply
          .status(400)
          .send({ error: "refs must be an array of Referencia objects" });
      }

      const texts = refs.map((ref) => ref.descricao);

      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: texts,
      });

      const refsComEmbeddings = refs.map((ref, index) => ({
        ...ref,
        embedding: response.data[index].embedding,
      }));

      return reply.send({ refs: refsComEmbeddings });
    } catch (error) {
      return reply
        .status(500)
        .send({ error: "Failed to generate embeddings", details: error });
    }
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

      const allTerms = [
        ...options.sort_raising.terms,
        ...options.sort_descending.terms,
        ...options.filter_positive.terms,
        ...options.filter_negative.terms,
      ];

      // Gerar embeddings para todos os termos
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: allTerms,
      });

      // Mapear os embeddings de volta para as opções
      const optionsWithEmbeddings = {
        sort_raising: {
          terms: options.sort_raising.terms.map((term, index) => ({
            term,
            embedding: response.data[index].embedding,
          })),
        },
        sort_descending: {
          terms: options.sort_descending.terms.map((term, index) => ({
            term,
            embedding:
              response.data[options.sort_raising.terms.length + index]
                .embedding,
          })),
        },
        filter_positive: {
          terms: options.filter_positive.terms.map((term, index) => ({
            term,
            embedding:
              response.data[
                options.sort_raising.terms.length +
                  options.sort_descending.terms.length +
                  index
              ].embedding,
          })),
        },
        filter_negative: {
          terms: options.filter_negative.terms.map((term, index) => ({
            term,
            embedding:
              response.data[
                options.sort_raising.terms.length +
                  options.sort_descending.terms.length +
                  options.filter_positive.terms.length +
                  index
              ].embedding,
          })),
        },
      };

      return reply.send({ options: optionsWithEmbeddings });
    } catch (error) {
      return reply
        .status(500)
        .send({ error: "Failed to generate embeddings", details: error });
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
