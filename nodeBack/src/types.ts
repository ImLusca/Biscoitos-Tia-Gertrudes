export interface Referencia {
  item: string;
  page: string;
  descricao: string;
  terms: string[];
  termsEmbeddings?: number[][];
}

export interface Options {
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

export interface OptionsWithEmbeddings {
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

export interface Terms {
  term: string;
  embedding: number[];
}

export interface WorkerData {
  embedding: number[];
  chunk: Referencia[];
}

export interface WorkerResult {
  similarity: number;
  reference: Referencia;
}
