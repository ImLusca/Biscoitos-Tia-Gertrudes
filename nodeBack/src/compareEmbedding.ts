import { embeddingsRefs } from "./jsons/embeddings/embeddingsRef.json";
import { Referencia } from "./types";
import { cosineSimilarity } from "./utils";

const DEFAULT_REFERENCIA: Referencia = {
  item: "",
  page: "",
  descricao: "",
  terms: [],
  termsEmbeddings: [],
};

export interface EmbeddingSimilarity {
  similaridade: number;
  item: Omit<Referencia, "termsEmbeddings" | "terms">;
}

export const compareEmbeddings = (
  embedding: number[]
): EmbeddingSimilarity[] => {
  const referenceSimilarities: EmbeddingSimilarity[] = [];
  try {
    embeddingsRefs.forEach((reference: Referencia) => {
      let bestSimilarity = 0.0;

      reference.termsEmbeddings?.forEach((termEmbedding) => {
        const similarity = cosineSimilarity(embedding, termEmbedding);
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
        }
      });

      const { terms, termsEmbeddings, ...resto } = reference;
      referenceSimilarities.push({ similaridade: bestSimilarity, item: resto });
    });

    referenceSimilarities.sort((a, b) => b.similaridade - a.similaridade);

    return referenceSimilarities.slice(0, 5);
  } catch (error) {
    console.error("Erro ao comparar embeddings:", error);
    return referenceSimilarities;
  }
};
