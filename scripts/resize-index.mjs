import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME;

const pc = new Pinecone({ apiKey: PINECONE_API_KEY });

async function resizeIndex() {
  try {
    console.log(`Deleting existing index: ${PINECONE_INDEX_NAME}...`);
    await pc.deleteIndex(PINECONE_INDEX_NAME);
    console.log('Index deleted. Waiting 30s for cleanup...');
    await new Promise(r => setTimeout(r, 30000));

    console.log(`Creating new index with 3072 dimensions...`);
    await pc.createIndex({
      name: PINECONE_INDEX_NAME,
      dimension: 3072,
      metric: 'cosine',
      spec: { 
        serverless: { 
          cloud: 'aws', 
          region: 'us-east-1' 
        } 
      }
    });
    console.log('Index created successfully.');
  } catch (err) {
    console.error('Error during index management:', err.message);
  }
}

resizeIndex();
