import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  let body: {
    leadName: string;
    status: string;
    requirement?: string;
    lastInteractionNotes: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { leadName, status, requirement, lastInteractionNotes } = body;

  if (!leadName || !lastInteractionNotes) {
    return NextResponse.json(
      { error: "leadName and lastInteractionNotes are required" },
      { status: 400 }
    );
  }

  const prompt = `You are helping Ashok, a real estate broker at Clickbric Properties in India, write a short WhatsApp follow-up message to a lead.

Lead details:
- Name: ${leadName}
- Status: ${status}
${requirement ? `- Requirement: ${requirement}` : ""}

Last interaction notes:
${lastInteractionNotes}

Write a short, casual WhatsApp message from Ashok to ${leadName} as the next follow-up, based on the last interaction above.

Rules:
- Address the lead by first name only
- Keep it under 3 sentences
- Casual and conversational, not formal or corporate
- Reference something specific from the last interaction notes
- Do not use emojis
- Do not use phrases like "I hope this message finds you well"
- Sign off as "Ashok"
- Write only the message text, nothing else`;

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
