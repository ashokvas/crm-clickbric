import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  let body: {
    leadName: string;
    status: string;
    requirement?: string;
    lastInteractionNotes: string;
    lastInteractionDate?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { leadName, status, requirement, lastInteractionNotes, lastInteractionDate } = body;

  if (!leadName || !lastInteractionNotes) {
    return NextResponse.json(
      { error: "leadName and lastInteractionNotes are required" },
      { status: 400 }
    );
  }

  // Extract first name only
  const firstName = leadName.trim().split(" ")[0];

  const prompt = `You are Ashok, a real estate broker at Clickbric Properties in India. You need to send a WhatsApp follow-up message to ${firstName}.

Here is what happened in your last interaction with ${firstName}${lastInteractionDate ? ` on ${lastInteractionDate}` : ""}:

---
${lastInteractionNotes}
---

Your task: Write the WhatsApp message you will send ${firstName} now, as a direct follow-up to that interaction.

The message must:
- Pick up exactly where the last interaction left off -- address what was discussed, promised, or left unresolved
- Be specific to the notes above, not generic
- Be 2-3 sentences max
- Sound like a natural WhatsApp message, casual and direct
- Address ${firstName} by first name at the start
- End with "- Ashok"
${requirement ? `\nContext: ${firstName} is looking for ${requirement}.` : ""}

Write only the message text. No explanation, no commentary.`;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text.trim() : "";

    return NextResponse.json({ message: text });
  } catch (err) {
    console.error("suggest-message: Claude API error", err);
    return NextResponse.json(
      { error: "Failed to generate message" },
      { status: 500 }
    );
  }
}
