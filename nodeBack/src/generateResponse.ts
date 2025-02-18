import { OpenAI } from "openai";
import { isValidResposta } from "./utils";
import { Referencia, Resposta } from "./types";
import { EmbeddingSimilarity } from "./compareEmbedding";

export const generateResponse = async (
  openai: OpenAI,
  userInput: string,
  references: EmbeddingSimilarity[]
): Promise<Resposta> => {
  const prompt = `
    - Dadas as instruções abaixo, retorne exatamente e apenas um objeto JSON seguindo a interface:
      Resposta {
        page: string;
        sort: boolean;
        filter: boolean;
        sort_value?: string;
        filter_value?: string;
      }
    - Você receberá um input vindo do usuário e uma lista de referências extraídas de uma base maior.
    Caso não consiga encontrar uma resposta, retorne um JSON vazio.
    - O input do usuário é: ${userInput}
    - As referências são: ${JSON.stringify(references)}
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseContent = completion.choices[0]?.message?.content;

    console.log(responseContent);

    if (responseContent) {
      const cleanedResponse = responseContent
        .replace(/```json|```/g, "")
        .trim();
      const parsedResponse = JSON.parse(cleanedResponse);

      if (isValidResposta(parsedResponse)) return parsedResponse;

      console.error("Resposta da API não segue a interface Resposta.");
      return { page: "", sort: false, filter: false };
    }
    console.error("Nenhuma resposta foi retornada pela API.");
    return { page: "", sort: false, filter: false };
  } catch (error) {
    console.error("Erro ao processar a resposta da API:", error);
    return { page: "", sort: false, filter: false };
  }
};
