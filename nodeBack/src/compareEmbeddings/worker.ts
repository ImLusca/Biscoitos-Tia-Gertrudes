import { workerData, parentPort } from "worker_threads";
import { cosineSimilarity } from "../utils";
import { Referencia } from "../types";

interface WorkerData {
  embedding: number[];
  references: Referencia[];
}

interface WorkerResult {
  bestMatch: number;
  bestMatchReference: Referencia | null;
}

function calculateBestMatch(
  embedding: number[],
  references: Referencia[]
): WorkerResult {
  let bestMatch = -1;
  let bestMatchReference: Referencia | null = null;

  references.forEach((reference) => {
    reference.termsEmbeddings?.forEach((termEmbedding) => {
      const similarity = cosineSimilarity(embedding, termEmbedding);
      if (similarity > bestMatch) {
        bestMatch = similarity;
        bestMatchReference = reference;
      }
    });
  });

  return { bestMatch, bestMatchReference };
}

const { embedding, references } = workerData as WorkerData;
const result = calculateBestMatch(embedding, references);
parentPort?.postMessage(result);
