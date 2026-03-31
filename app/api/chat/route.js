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
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

export async function POST(req) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const latestMessage = messages[messages.length - 1];

    if (latestMessage.role !== 'user') {
      return NextResponse.json({ error: 'Latest message must be a user message' }, { status: 400 });
    }

    const userQuery = latestMessage.content;
    const relevantChunks = await getRelevantContext(userQuery, 3);

    const contextText = relevantChunks.length > 0
      ? relevantChunks.map(c => `[Source: ${c.source}]\n${c.text}`).join('\n\n')
      : 'No specific context found in QuickInfra documentation for this query.';

    const systemPrompt = `You are the QuickInfra Cloud Assistant on the QuickInfra website.

You have access to three knowledge sources:
1. Official platform documentation (features, workflows, and capabilities)
2. Technical whitepapers
3. Blog posts with best practices and guides

Rules:
- Answer ONLY using the provided QuickInfra context.
- If the question is unrelated to QuickInfra Cloud, say you can only help with QuickInfra-related questions.
- Do not invent features, pricing, integrations, or capabilities.
- Keep answers concise, helpful, and accurate.
- If the retrieved context is insufficient, acknowledge that you don't have enough details and direct the user to the most relevant page from the list below.
- When linking pages, use markdown links like [Page Name](/path).

Available Pages on QuickInfra Website:
- [Home](/) — Platform overview, key features, and stats
- [Infrastructure Automation](/infrastructure) — Auto provisioning, Terraform, IaC
- [CI/CD Pipelines](/ci-cd) — One-click CI/CD setup
- [Security & Compliance](/security) — SOC2, HIPAA, PCI-DSS, DevSecOps
- [Cloud Migration](/cloud-migration) — Template-based migration
- [InfraOps Monitoring](/monitoring) — Real-time observability, cost alerts
- [AI/ML Infrastructure](/ai-ml) — AI workload infrastructure
- [Platform Overview](/platform) — Full platform capabilities
- [For Startups](/startups-and-founders) — Startup-specific solutions
- [For Engineering Teams](/engineering-teams) — Developer productivity
- [For Non-Tech SMEs](/non-tech-smes) — Managed cloud solutions
- [Pricing](/pricing) — Plans and pricing
- [AWS Partnership](/aws-partner) — AWS Select Partner details
- [About Us](/about) — Company information
- [Blogs](/blogs) — Technical articles and guides
- [Whitepapers](/whitepaper) — Downloadable research reports
- [Contact Us](/contact) — Get in touch, request demo
- [Careers](/careers) — Job openings
- [QuickInfra Console](https://console.quickinfra.cloud/) — Login to platform

Retrieved Context:
${contextText}`;

    const filteredMessages = messages.filter(m => m.role !== 'system');

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
