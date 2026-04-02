import { Pinecone } from '@pinecone-database/pinecone';

const pc = new Pinecone({
  apiKey: 'pcsk_7KsxhM_RYzgGW1iALHeAhvRYTUBUM2Mk6XiVjFthzbAZbWnG1EQqhTGaQfmYQC3bAyLqgq'
});

async function createIndex() {
  try {
    const indexName = 'quickinfra';
    console.log(`Creating index ${indexName}...`);
    
    await pc.createIndex({
      name: indexName,
      dimension: 768, // Google text-embedding-004
      metric: 'cosine',
      spec: { 
        serverless: { 
          cloud: 'aws', 
          region: 'us-east-1' 
        } 
      }
    });

    console.log(`Index ${indexName} created successfully.`);
  } catch (error) {
    if (error.name === 'PineconeConflictError') {
      console.log('Index already exists.');
    } else {
      console.error('Error creating index:', error);
    }
  }
}

createIndex();
