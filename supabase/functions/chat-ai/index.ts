import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // 1. Handle CORS Preflight (OPTIONS request) - Must return 200 OK
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    // 2. Validate API Key
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("VITE_GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY secret");
    }

    // 3. Initialize Supabase Client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // 4. Get User Info
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error("Unauthorized");
    }

    // 5. Parse Request
    const { messages, systemPrompt } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      throw new Error("Invalid body: 'messages' array is required");
    }

    // 6. Save User Message (the last one in the incoming list)
    const userMessage = messages[messages.length - 1];
    if (userMessage && userMessage.sender === "user") {
        await supabaseClient.from("chat_messages").insert({
            user_id: user.id,
            text: userMessage.text,
            sender: "user",
        });
    }

    // 7. Build Prompt
    let prompt = systemPrompt ? `${systemPrompt}\n\n` : "";
    prompt += messages
      .map((m: any) =>
        m.sender === "user" ? `User: ${m.text}` : `Assistant: ${m.text}`
      )
      .join("\n");
    prompt += "\nAssistant:";

    // 8. Call Gemini API
    const model = "gemini-2.5-flash"; 
    
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=` +
        GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    // 9. Handle Gemini Errors
    if (!geminiRes.ok) {
      const errorData = await geminiRes.json();
      console.error("Gemini API Error:", errorData);
      throw new Error(errorData.error?.message || "Gemini API error");
    }

    const data = await geminiRes.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I'm here to help!";

    // 10. Save AI Reply
    await supabaseClient.from("chat_messages").insert({
        user_id: user.id,
        text: reply,
        sender: "ai",
    });

    // 11. Success Response
    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    // 12. Catch-all Error Handling
    console.error("Edge Function Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: error.message === "Unauthorized" ? 401 : 500,
    });
  }
});
