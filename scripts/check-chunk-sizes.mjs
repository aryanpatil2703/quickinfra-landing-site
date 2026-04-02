import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Pinecone } from '@pinecone-database/pinecone';

async function checkChunkSizes() {
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pc.index(process.env.PINECONE_INDEX_NAME);

  // We can't list all, but we can query with a dummy vector
  const dummyVector = new Array(768).fill(0.1);
  const results = await index.query({
    vector: dummyVector,
    topK: 10,
    includeMetadata: true
  });

  console.log(`Found ${results.matches.length} matches.`);
  results.matches.forEach((m, i) => {
    const text = m.metadata ? String(m.metadata.text || '') : '';
    const source = m.metadata ? String(m.metadata.source || 'Unknown') : 'Unknown';
    console.log(`Chunk ${i}: Source: ${source}, Length: ${text.length} chars (~${Math.round(text.length/4)} tokens)`);
    if (text.length > 500) {
        console.log("--- START PREVIEW (First 100 chars) ---");
        console.log(text.substring(0, 100));
        console.log("--- END PREVIEW ---");
    }
  });
}

checkChunkSizes().catch(console.error);
