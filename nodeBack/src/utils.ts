import { Resposta, Terms } from "./types";
import { optionsEmbeddings } from "./jsons/optionsEmbeddings.json";

const stopwords = new Set([
  "me",
  "dá",
  "da",
  "a",
  "de",
  "em",
  "para",
  "o",
  "os",
  "com",
  "que",
  "pode",
]);

export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (vecA.length !== vecB.length) {
    throw new Error("Os vetores devem ter o mesmo tamanho.");
  }

  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

  return dotProduct / (magnitudeA * magnitudeB);
};

export const preprocessInput = (text: string): string => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\w\s]/g, "")
    .split(" ")
    .filter((word) => word.trim() !== "" && !stopwords.has(word))
    .join(" ");
};

export const checkForOptions = (
  userInputEmbedding: number[],
  similarityThreshold: number = 0.5
): { option: string; term: string; similarity: number } | null => {
  let bestMatch: { option: string; term: string; similarity: number } | null =
    null;

  const checkTerms = (optionName: string, terms: Terms[]) => {
    terms.map((term) => {
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
    });
  };

  checkTerms("sort_raising", optionsEmbeddings.sort_raising.terms);
  checkTerms("sort_descending", optionsEmbeddings.sort_descending.terms);
  checkTerms("filter_positive", optionsEmbeddings.filter_positive.terms);
  checkTerms("filter_negative", optionsEmbeddings.filter_negative.terms);

  return bestMatch;
};

export const isValidResposta = (obj: any): obj is Resposta => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof obj.page === "string" &&
    typeof obj.sort === "boolean" &&
    typeof obj.filter === "boolean" &&
    (obj.sort_item === undefined || typeof obj.sort_item === "string") &&
    (obj.filter_item === undefined || typeof obj.filter_item === "string")
  );
};
