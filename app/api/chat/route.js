import { getRelevantContext } from '@/lib/retrieval';
import { NextResponse } from 'next/server';

// ── Provider config ────────────────────────────────────────────────
// Switch between "ollama", "gemini", or "groq" by changing AI_PROVIDER in .env.local
const AI_PROVIDER = process.env.AI_PROVIDER || 'groq'; // "ollama" | "gemini" | "groq"

// Ollama config
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:1b';

// Gemini config
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

// Groq config
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

export async function POST(req) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const latestMessage = messages[messages.length - 1];

    // 1. Truncate history to save tokens (last 4 messages)
    const historyLimit = 4;
    const truncatedMessages = messages.slice(-historyLimit);
    const latestMsg = truncatedMessages[truncatedMessages.length - 1];

    if (latestMsg.role !== 'user') {
      return NextResponse.json({ error: 'Latest message must be a user message' }, { status: 400 });
    }

    const relevantChunks = await getRelevantContext(latestMsg.content, 2);
    const contextText = relevantChunks.map(c => `[SOURCE: ${c.source}]\n${c.text}`).join('\n\n---\n\n');

    // 3. Conditional QuickLinks (Inject only if needed)
    const userQuery = latestMsg.content.toLowerCase();
    const needsNav = /how|where|find|page|pricing|contact|link|help|guide/.test(userQuery) || relevantChunks.length === 0;
    const quickLinks = needsNav ? `
QuickLinks: [Home](/), [Infra](/infrastructure), [CI/CD](/ci-cd), [Security](/security), [Pricing](/pricing), [Blogs](/blogs), [Whitepapers](/whitepaper), [Contact](/contact).` : '';

    // 4. Expert System Prompt (Strict Accuracy)
    const systemPrompt = `You are the Official QuickInfra Expert Assistant. Your goal is 100% technical accuracy based ONLY on the provided documentation.

KNOWLEDGE BASE:
${contextText}

STRICT OPERATING RULES:
1. ONLY USE THE PROVIDED KNOWLEDGE. If the information is not in the "KNOWLEDGE BASE" above, say: "I'm sorry, I don't have specific information in our documentation regarding that. Please contact support."
2. NEVER HALLUCINATE. Do not invent service names or features. (e.g., Use "AWS CodeCommit", never "AWSCommit").
3. USE VERBATIM TERMINOLOGY. Always use "OpenTofu", "Terraform", and specific AWS service names as written.
4. Format the responses in a presentable and well mannered way. (e.g., Use bullet points, bold text, etc.)
5. CITATION: When possible, mention the source of the information (e.g., "According to our Whitepapers...").
6. TONE: Professional, technical, and concise. 
7. LENGTH: 4-8 sentences.
8. NO TYPOS OR FORMATTING ERRORS. Ensure the response is polished, grammatically correct, and visually perfect.
${quickLinks}`;

    const filteredMessages = truncatedMessages.filter(m => m.role !== 'system');

    // ── Route to the correct provider ──────────────────────────────
    if (AI_PROVIDER === 'gemini') {
      return await handleGemini(systemPrompt, filteredMessages);
    } else if (AI_PROVIDER === 'groq') {
      return await handleGroq(systemPrompt, filteredMessages);
    } else {
      return await handleOllama(systemPrompt, filteredMessages);
    }

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing your request.' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Ollama handler (local model)
// ═══════════════════════════════════════════════════════════════════════
async function handleOllama(systemPrompt, filteredMessages) {
  const payload = {
    model: OLLAMA_MODEL,
    messages: [{ role: 'system', content: systemPrompt }, ...filteredMessages],
    stream: true,
    options: {
      num_predict: 150
    }
  };

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`Ollama error (${response.status}):`, errText);
    return NextResponse.json(
      { error: 'Failed to communicate with local Ollama server.' },
      { status: 500 }
    );
  }

  // Ollama already returns NDJSON — pass through directly
  return new Response(response.body, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Gemini handler (Google API)
// ═══════════════════════════════════════════════════════════════════════
async function handleGemini(systemPrompt, filteredMessages) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not set in .env.local' },
      { status: 500 }
    );
  }

  // Convert messages to Gemini format: role "assistant" → "model"
  const geminiContents = filteredMessages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const payload = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: geminiContents,
    generationConfig: { maxOutputTokens: 300 }
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`Gemini error (${response.status}):`, errText);
    return NextResponse.json(
      { error: 'Failed to communicate with Gemini API.' },
      { status: 500 }
    );
  }

  // Transform Gemini SSE stream → NDJSON (same format the frontend expects)
  const transformStream = new TransformStream({
    transform(chunk, controller) {
      const text = new TextDecoder().decode(chunk);
      const lines = text.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (content) {
            // Emit in Ollama-compatible NDJSON format
            const ndjsonLine = JSON.stringify({ message: { content } }) + '\n';
            controller.enqueue(new TextEncoder().encode(ndjsonLine));
          }
        } catch (err) {
          // Skip malformed chunks
        }
      }
    },
  });

  return new Response(response.body.pipeThrough(transformStream), {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════
// Groq handler (OpenAI-compatible API)
// ═══════════════════════════════════════════════════════════════════════
async function handleGroq(systemPrompt, filteredMessages) {
  if (!GROQ_API_KEY) {
    return NextResponse.json(
      { error: 'GROQ_API_KEY is not set in .env.local' },
      { status: 500 }
    );
  }

  const payload = {
    model: GROQ_MODEL,
    messages: [{ role: 'system', content: systemPrompt }, ...filteredMessages],
    stream: true,
    max_tokens: 300,
  };

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`Groq error (${response.status}):`, errText);
    return NextResponse.json(
      { error: 'Failed to communicate with Groq API.' },
      { status: 500 }
    );
  }

  // Transform Groq SSE stream → NDJSON (same format the frontend expects)
  const transformStream = new TransformStream({
    transform(chunk, controller) {
      const text = new TextDecoder().decode(chunk);
      const lines = text.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed?.choices?.[0]?.delta?.content;
          if (content) {
            const ndjsonLine = JSON.stringify({ message: { content } }) + '\n';
            controller.enqueue(new TextEncoder().encode(ndjsonLine));
          }
        } catch (err) {
          // Skip malformed chunks
        }
      }
    },
  });

  return new Response(response.body.pipeThrough(transformStream), {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
