import { Pinecone } from '@pinecone-database/pinecone';

const pc = new Pinecone({
  apiKey: 'pcsk_7KsxhM_RYzgGW1iALHeAhvRYTUBUM2Mk6XiVjFthzbAZbWnG1EQqhTGaQfmYQC3bAyLqgq'
});

async function listIndexes() {
  try {
    const indexes = await pc.listIndexes();
    console.log('Existing indexes:', JSON.stringify(indexes, null, 2));
  } catch (error) {
    console.error('Error listing indexes:', error);
  }
}

listIndexes();
