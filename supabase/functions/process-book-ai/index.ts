import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "*" } });
  }

  try {
    const { pdf_base64, title } = await req.json();

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), { status: 500 });
    }

    // This is a simplified implementation. 
    // Ideally, for large PDFs, you'd use the File API of Gemini.
    // For this prototype, we'll send a prompt asking for a summary based on the provided metadata and small context.
    
    const prompt = `I am reading a book titled "${title}". 
    Please provide a structured synthesis of this book including:
    1. A 3-sentence executive summary.
    2. 5 key actionable takeaways for productivity.
    3. The primary "Atomic Principle" this book reinforces.
    
    Format the response as clean Markdown.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    const synthesis = data.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to generate synthesis at this time.";

    return new Response(JSON.stringify({ synthesis }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
});
