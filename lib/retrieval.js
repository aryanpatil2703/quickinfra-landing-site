import { getPineconeClient, generateEmbedding } from './pinecone-client.js';

/**
 * Finds the most relevant chunks in the documents for a given query using Pinecone Semantic Search.
 */
export async function getRelevantContext(query, maxChunks = 4) {
  try {
    // 1. Generate embedding for the user query
    const queryVector = await generateEmbedding(query);

    // 2. Query Pinecone
    const pc = getPineconeClient();
    const index = pc.index(process.env.PINECONE_INDEX_NAME);

    const queryResponse = await index.query({
      vector: queryVector,
      topK: maxChunks,
      includeMetadata: true,
    });

    // 3. Transform to matches
    const matches = queryResponse.matches.map((match) => ({
      text: match.metadata.text,
      source: match.metadata.source,
      score: match.score,
    }));

    // Filter out low scores if necessary (balanced threshold)
    const filteredMatches = matches.filter(m => (m.score || 0) > 0.45);

    return filteredMatches;
  } catch (error) {
    console.error('Error fetching context from Pinecone:', error);
    // Fallback to empty if Pinecone fails (prevent app crash)
    return [];
  }
}
