import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Clients are initialized lazily
let pineconeClient = null;
let googleAI = null;

/**
 * Get Pinecone client
 */
export function getPineconeClient() {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
  }
  return pineconeClient;
}

/**
 * Get Google AI client
 */
export function getGoogleAI() {
  if (!googleAI) {
    googleAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return googleAI;
}

/**
 * Generate embedding for text using gemini-embedding-001 (768 dimensions)
 */
export async function generateEmbedding(text) {
  const genAI = getGoogleAI();
  const model = genAI.getGenerativeModel({ model: 'models/gemini-embedding-001' });
  
  const result = await model.embedContent({
    content: { parts: [{ text }] }
  });
  return result.embedding.values;
}
