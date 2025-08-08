import { openai } from '@ai-sdk/openai';
import { xai } from '@ai-sdk/xai';
import { ollama } from 'ollama-ai-provider';
import { tool } from 'ai';
import { z } from 'zod';
import type { Session } from 'next-auth';
import type { DataStreamWriter } from 'ai';
import { store as vectorStore } from '@/lib/db/vector-store';
import { embed } from 'ai';
import { getFilesByChatId } from '@/lib/db/queries';

interface SearchKnowledgeBaseProps {
  session: Session;
  dataStream: DataStreamWriter;
  chatId?: string; // Add optional chatId parameter
}

// Helper function to get the best available embedding model with fallback
const getBestEmbeddingModel = () => {
  // Prioritize Ollama embeddings - no rate limits!
  if (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_HOST) {
    return ollama.embedding('nomic-embed-text');
  }

  if (process.env.OPENAI_API_KEY) {
    return openai.embedding('text-embedding-3-small');
  }

  throw new Error(
    'No embedding model available. Please set OLLAMA_BASE_URL or OPENAI_API_KEY',
  );
};

// Helper function to get the best available model for reranking
const getBestRerankModel = () => {
  // Prioritize Ollama Mistral - no rate limits!
  if (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_HOST) {
    return ollama('mistral');
  }

  if (process.env.OPENAI_API_KEY) {
    return openai('gpt-4o-mini');
  }

  if (process.env.XAI_API_KEY) {
    return xai('grok-2-vision-1212');
  }

  throw new Error(
    'No AI provider configured. Please set OLLAMA_BASE_URL, OPENAI_API_KEY, or XAI_API_KEY',
  );
};

export const searchKnowledgeBase = ({
  session,
  dataStream,
  chatId,
}: SearchKnowledgeBaseProps) =>
  tool({
    description:
      'Search the knowledge base for relevant information from files added to this chat',
    parameters: z.object({
      query: z.string(),
    }),
    execute: async ({ query }) => {
      try {
        console.log(
          'Search knowledge base called with query:',
          query,
          'for chat:',
          chatId,
        );

        if (!chatId) {
          console.log('No chatId provided, returning empty results');
          return [];
        }

        // First, get all files that are added to this chat
        const chatFiles = await getFilesByChatId(chatId);
        console.log('Files in chat', chatId, ':', chatFiles.length);

        if (chatFiles.length === 0) {
          console.log('No files in this chat, returning empty results');
          return [];
        }

        // Generate embedding for the query
        const { embedding } = await embed({
          model: getBestEmbeddingModel(),
          value: query,
        });

        // Search the vector store with file-specific filter
        const results = await vectorStore.query({
          indexName: 'document_embeddings',
          queryVector: embedding,
          topK: 20, // Get more results to filter
          filter: {
            fileId: { $in: chatFiles.map((f) => f.id) }, // Only search files from this chat
          },
        });

        console.log(
          'Search results for chat',
          chatId,
          ':',
          results.length,
          'results',
        );

        if (results && results.length > 0) {
          return results.map((result: any) => ({
            content: result.content,
            metadata: result.metadata,
            score: result.score,
          }));
        }

        return [];
      } catch (error) {
        console.error('Error searching knowledge base:', error);
        return [];
      }
    },
  });
