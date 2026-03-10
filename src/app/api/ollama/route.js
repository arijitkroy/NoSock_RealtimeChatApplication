import { NextResponse } from "next/server";
import { Ollama } from "ollama";

export async function POST(req) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
    }

    const ollama = new Ollama({
      host: "https://ollama.com",
      headers: {
        Authorization: "Bearer " + process.env.OLLAMA_API_KEY,
      },
    });

    const response = await ollama.chat({
      model: "gpt-oss:120b",
      messages: messages,
      stream: true,
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const part of response) {
            controller.enqueue(new TextEncoder().encode(part.message.content));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Ollama API Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
