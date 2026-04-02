import { getRelevantContext } from '../lib/retrieval.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function validate() {
  const query = "How can i use quickinfra can help me use devops";
  console.log(`Query: ${query}`);
  
  const relevantChunks = await getRelevantContext(query, 5);
  console.log(`Retrieved ${relevantChunks.length} chunks.`);
  
  relevantChunks.forEach((c, i) => {
    console.log(`\n--- Chunk ${i+1} [Score: ${c.score.toFixed(4)}] [Source: ${c.source}] ---`);
    console.log(c.text.substring(0, 200) + '...');
  });

  if (relevantChunks.length === 0) {
    console.log("No relevant chunks found with threshold 0.45!");
  }
}

validate();
