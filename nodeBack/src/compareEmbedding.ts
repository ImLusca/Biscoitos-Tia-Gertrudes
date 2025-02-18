import { embeddingsRefs } from "./jsons/embeddings/embeddingsRef.json";
import { Referencia } from "./types";
import { checkForOptions, cosineSimilarity } from "./utils";

const DEFAULT_REFERENCIA: Referencia = {
  item: "",
  page: "",
  descricao: "",
  terms: [],
  termsEmbeddings: [],
};

export const compareEmbeddings = (embedding: number[]) => {
  let bestMatchReference: Referencia = DEFAULT_REFERENCIA;
  let bestMatch = 0.0;

  embeddingsRefs.forEach((reference: Referencia) => {
    reference.termsEmbeddings?.forEach((termEmbedding) => {
      const similarity = cosineSimilarity(embedding, termEmbedding);
      if (similarity > bestMatch) {
        bestMatch = similarity;
        bestMatchReference = reference;
      }
    });
  });

  const option = checkForOptions(embedding);

  const { terms, termsEmbeddings, ...resto } = bestMatchReference;

  return { similaridade: bestMatch, item: resto, opcao: option };
};
