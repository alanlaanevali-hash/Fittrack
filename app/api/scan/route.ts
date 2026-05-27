import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { image, type } = await request.json()

  const systemPrompt = type === 'polar'
    ? `You are reading a Polar sports watch summary screenshot. Extract these values and return ONLY valid JSON, nothing else:
{
  "duration_min": number (total minutes, convert from HH:MM:SS),
  "dist": number (km, use dot as decimal),
  "hr": number (average HR, integers only),
  "calories": number,
  "pace": "string in M:SS format" or null,
  "speed": number or null,
  "type": "run_easy" or "run_tempo" or "bike_easy" or "bike_hard" or "recovery_walk" or "brick"
}
Labels may be in Estonian: Kestus=duration, Distants=distance, Keskm HR=avg HR, Kalorid=calories, Keskm tempo=avg pace. If pace exists it's a run, if speed exists it's a bike. Return null for missing fields.`
    : `You are reading a Foodvisor meal tracking screenshot. Extract meal data and return ONLY valid JSON, nothing else:
{
  "meal_type": "breakfast" or "lunch" or "dinner" or "snack",
  "food_name": "string describing the meal",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number
}
Return null for any missing values.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
          { type: 'text', text: 'Extract the data from this screenshot and return only JSON.' }
        ]
      }],
      system: systemPrompt,
    })
  })

  const data = await response.json()
  const text = data.content?.[0]?.text || '{}'
  
  try {
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return NextResponse.json({ success: true, data: parsed })
  } catch {
    return NextResponse.json({ success: false, error: 'Could not parse screenshot' })
  }
}
