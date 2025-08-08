import { config } from 'dotenv';

config({
  path: '.env.local',
});
import { PgVector } from '@mastra/pg';

console.log('POSTGRES_URL', process.env.POSTGRES_URL);
export const vectorStore = new PgVector({
  connectionString: process.env.POSTGRES_URL as string,
});

export const INDEX_NAME = 'document_embeddings';
export const VECTOR_DIMENSION = 1536; // Matching OpenAI text-embedding-3-small

async function initVectorStore() {
  console.log(
    `Initializing vector store and index: ${INDEX_NAME} (${VECTOR_DIMENSION} dimensions)...`,
  );
  try {
    // Mastra's PgVector client might have a method to check if an index exists
    // or createIndex might be idempotent (safe to call if exists).
    // If not, you might need more sophisticated logic here.
    await vectorStore.createIndex({
      indexName: INDEX_NAME,
      dimension: VECTOR_DIMENSION,
      // Add other options like distance metric if configurable and desired, e.g.,
      // metric: 'cosine',
    });
    console.log(`Vector index "${INDEX_NAME}" is ready or has been created.`);
  } catch (error) {
    console.error(
      `Failed to initialize vector store or create index "${INDEX_NAME}":`,
      error,
    );
    process.exit(1); // Exit with error for other issues
  }
}

initVectorStore();
