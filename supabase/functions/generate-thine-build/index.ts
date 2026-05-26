console.log("Hello from Functions!\nHi dude! - Angelo");

// AI STUFF YAHOOOOO
import { GoogleGenAI, Type, Schema } from 'npm:@google/genai';

// Standard CORS headers so your Vue app can communicate with the function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // 1. Handle the CORS preflight request from the browser
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Extract the payload sent by your Vue app
    const { budget, lockedParts, catalog } = await req.json();

    // Define the exact JSON structure for the frontend
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

    // 2. Initialize Gemini using Deno's environment variables
    const ai = new GoogleGenAI({ apiKey: Deno.env.get('GEMINI_API_KEY') as string });

    // 3. Call Gemini, we just gonna use flash para fast B)
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      }
    });

    // 4. Send the successful response back to Vue
    return new Response(response.text, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    // Catch any errors and send them back to the frontend cleanly
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});