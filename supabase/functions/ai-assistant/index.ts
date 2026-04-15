import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const AI_API_KEY = Deno.env.get('AI_API_KEY')

serve(async (req) => {
  const { prompt, userId } = await req.json()

  try {
    // 1. Call AI to parse prompt (Simulated)
    // In production, use OpenAI/Gemini to get structured JSON:
    // { "action": "CREATE_HABIT", "payload": { "title": "Read 10 mins", "frequency": "daily" } }
    
    // For now, let's provide a basic parsing logic or assume the AI model returns:
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a productivity assistant for the Batsir app. Parse natural language into structured actions: CREATE_HABIT, UPDATE_HABIT, ADD_LOG, UPDATE_SCHEDULE. Return only JSON." },
          { role: "user", content: prompt }
        ]
      })
    }).then(r => r.json());

    const { action, payload } = JSON.parse(aiResponse.choices[0].message.content);

    // 2. Execute Action on Supabase
    let result;
    switch (action) {
      case 'CREATE_HABIT':
        result = await supabase.from('habits').insert({ ...payload, user_id: userId }).select();
        break;
      case 'UPDATE_HABIT':
        result = await supabase.from('habits').update(payload).eq('id', payload.id).select();
        break;
      case 'ADD_LOG':
        result = await supabase.from('logs').insert({ ...payload }).select();
        break;
      case 'UPDATE_SCHEDULE':
        result = await supabase.from('schedules').update(payload).eq('id', payload.id).select();
        break;
    }

    return new Response(
      JSON.stringify({ success: true, action, data: result?.data }),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
})
