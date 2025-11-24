import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { type CorrectionObject } from "@shared/schema";

// Inicializa o cliente (pega a chave do process.env.OPENAI_API_KEY automaticamente)
const openai = new OpenAI();

// 1. Definimos o Schema que a OpenAI DEVE seguir.
// Isso garante que a resposta sempre venha no formato exato que precisamos.
const AiCorrectionSchema = z.object({
  category: z.enum(['grammar', 'style', 'clarity', 'structure', 'content', 'research']),
  // A IA deve retornar o texto exato que ela quer corrigir para buscarmos o índice depois
  exactQuote: z.string(),
  comment: z.string(),
});

const AiResponseSchema = z.object({
  grammarScore: z.number(),
  styleScore: z.number(),
  clarityScore: z.number(),
  structureScore: z.number(),
  contentScore: z.number(),
  researchScore: z.number(),
  overallScore: z.number(),
  corrections: z.array(AiCorrectionSchema),
});

interface AIReviewResult {
  grammarScore: number;
  styleScore: number;
  clarityScore: number;
  structureScore: number;
  contentScore: number;
  researchScore: number;
  overallScore: number;
  corrections: CorrectionObject[];
}

/**
 * Analisa uma redação usando GPT-4o com Saídas Estruturadas.
 */
export async function analyzeEssayWithOpenAI(title: string, content: string): Promise<AIReviewResult> {

  const model = process.env.AI_MODEL || "llama-3.3-70b-versatile";

  try{
  
    const completion = await openai.chat.completions.create({

      
      model: model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an expert academic writing tutor. Analyze the essay and provide structured feedback in JSON format.
          
          Scoring Guide:
          - Evaluate 6 categories: grammar, style, clarity, structure, content, research.
          - **Assign a score from 0 to 200 for EACH category.**
          - Be rigorous but fair.
          
          Corrections Guide:
          - Identify specific issues in the text.
          - **Focus on the most impactful errors (Quality over Quantity).**
          - **Do not list every single typo if there are many; group them or highlight the major ones.**
          - **Aim for 3 to 10 high-quality corrections.** (This is a guideline, not a strict rule)
          - For 'exactQuote', perform a copy-paste of the text segment you are referring to. It must match the user text exactly.

          Output JSON Schema:
          {
            "grammarScore": number,
            "styleScore": number,
            "clarityScore": number,
            "structureScore": number,
            "contentScore": number,
            "researchScore": number,
            "overallScore": number,
            "corrections": [
              { "category": "grammar"|"style"|"clarity"|"structure"|"content"|"research", "exactQuote": "string", "comment": "string" }
            ]
          }`
        },
        {
          role: "user",
          content: `Title: ${title}\n\nEssay Content:\n${content}`
        }
      ],
      temperature: 0.2,
    });

  const responseContent = completion.choices[0].message.content;

  if (!responseContent) {
    throw new Error("IA retornou resposta vazia");
  }

  const rawJson = JSON.parse(responseContent);

  const aiResponse = AiResponseSchema.parse(rawJson);

  const calculatedOverallScore = 
      aiResponse.grammarScore + 
      aiResponse.styleScore + 
      aiResponse.clarityScore + 
      aiResponse.structureScore + 
      aiResponse.contentScore + 
      aiResponse.researchScore;

  // 2. Pós-processamento: Calcular índices reais
  // A IA nos deu o texto ("exactQuote"), agora precisamos achar onde ele está no conteúdo original.
    const finalCorrections: CorrectionObject[] = aiResponse.corrections.map(c => {
    const startIndex = content.indexOf(c.exactQuote);
    
    // Se não achou (a IA alucinou o texto), retornamos -1 para filtrar depois ou lidamos com fallback
    if (startIndex === -1) {
      console.warn(`[Grog] Could not find quote: "${c.exactQuote}"`);
      return null;
    }

    return {
      category: c.category,
      selectedText: c.exactQuote,
      textStartIndex: startIndex,
      textEndIndex: startIndex + c.exactQuote.length,
      comment: c.comment,
    };
  }).filter((c): c is CorrectionObject => c !== null);

  return {
    ...aiResponse,
    overallScore:calculatedOverallScore,
    corrections: finalCorrections
  };
} catch (error) {
    console.error("Erro na chamada da Groq:", error);
    throw new Error("Falha ao analisar redação com IA");
  }
}