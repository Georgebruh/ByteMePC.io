/*
Note from the Manlanman himself:
Ngl idt this is needed kay naa raman diay ni sa supabase/functions/generate-thine-build/index.ts.
Planning to delete this later tho if everything is all g.
*/

import { GoogleGenAI, Type, type Schema } from '@google/genai';
import type { Request, Response } from 'express';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateBuild(req: Request, res: Response) {
  // Now we extract the catalog directly from the Vue frontend request
  const { budget, lockedParts, catalog } = req.body;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      suggested: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING }, 
            tag: { type: Type.STRING },
            name: { type: Type.STRING },
            sub: { type: Type.STRING },
            price: { type: Type.NUMBER },
          },
          required: ["id", "tag", "name", "sub", "price"]
        }
      },
      summary: {
        type: Type.OBJECT,
        properties: {
          budget: { type: Type.NUMBER },
          total: { type: Type.NUMBER },
          overBudget: { type: Type.NUMBER },
          perfScore: { type: Type.NUMBER }
        },
        required: ["budget", "total", "overBudget", "perfScore"]
      }
    },
    required: ["suggested", "summary"]
  };

  // 3. Call Gemini
  const prompt = `
    You are an expert PC builder. Build a PC for a budget of PHP ${budget}.
    
    Rules:
    1. Select exactly one part for each tag: CPU, MOBO, GPU, RAM, PSU, STORAGE, CASE, COOLER.
    2. Ensure compatibility (e.g., match CPU socket to Motherboard socket, ensure PSU wattage covers TDP).
    3. Keep total price near the budget.
    4. Calculate an estimated performance score (out of 10000).
    5. LOCKED PARTS: You MUST include the following parts in your final build, no matter what: ${JSON.stringify(lockedParts)} 
    
    Here is the catalog of available parts:
    ${JSON.stringify(catalog)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      }
    });

    res.json(JSON.parse(response.text as string));

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}