console.log("Hello from Functions!\nHi dude! - Angelo");

// AI STUFF YAHOOOOO
import { GoogleGenAI, Type, Schema } from 'npm:@google/genai';

// Standard CORS headers so your Vue app can communicate with the function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  console.log("Hi");

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

    // lockedParts is now a list of { category, tag, partId, name, price } —
    // the exact SKU the user owns/wants for each locked slot. The model must
    // copy these into the response unchanged (same id/tag/name/price) and
    // build the rest of the system around them.
    const lockedSection = Array.isArray(lockedParts) && lockedParts.length
      ? `Locked parts (must appear verbatim in the response, same id/tag/name/price):\n${JSON.stringify(lockedParts, null, 2)}`
      : 'No parts are locked — pick every slot freely.';

    const prompt = `
      You are an expert PC builder. Build a PC for a budget of PHP ${budget}.

      Rules:
      1. Return exactly one part for each tag: CPU, MOBO, GPU, RAM, PSU, STORAGE, CASE, COOLER.
      2. Ensure compatibility (match CPU socket to Motherboard socket, RAM type to MB ram_type, MB form factor to case, cooler socket to CPU, PSU wattage covers system TDP).
      3. Keep total price near the budget. Prefer staying at or under the budget.
      4. Calculate an estimated performance score (out of 10000).
      5. LOCKED PARTS: For any locked part below, include it in your response with the exact same id, tag, name, and price. Build around it — pick compatible parts for every other slot.

      ${lockedSection}

      Here is the catalog of available parts:
      ${JSON.stringify(catalog)}
    `;

    // 2. Initialize Gemini using Deno's environment variables
    const ai = new GoogleGenAI({ apiKey: Deno.env.get('GEMINI_API_KEY') as string });

    console.log("Generating the build of a lifetime with a budget of " + budget);

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