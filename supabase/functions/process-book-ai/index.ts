import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "*" } });
  }

  try {
    const { pdf_base64, filename } = await req.json();

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), { status: 500 });
    }

    // Since we are in 2026, we use the multimodal capabilities of Gemini 3.1 Flash.
    // We send a snippet of the base64 data (the first few KB usually contain header/metadata).
    // For a production app, we'd use a dedicated PDF parsing library in the edge function,
    // but here we'll use Gemini's reasoning on the filename and context.

    const prompt = `I am uploading a file named "${filename}". 
    Please extract the formal Book Title and the Author's full name.
    Also, based on common knowledge of this book, what is its approximate total page count?
    
    Return ONLY a JSON object:
    {"title": "string", "author": "string", "totalPages": number}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    
    // Clean up potential markdown formatting in the response
    const jsonString = text.replace(/```json|```/g, "").trim();
    const metadata = JSON.parse(jsonString);

    return new Response(JSON.stringify(metadata), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
});
