import { updateManagedFile, getAllTags } from '@/lib/db/queries';
import { inngest } from './client';
import { MDocument } from '@mastra/rag';
import { openai } from '@ai-sdk/openai';
import { xai } from '@ai-sdk/xai';
import { ollama } from 'ollama-ai-provider';
import { embedMany, generateObject } from 'ai';
import { store as vectorStore } from '@/lib/db/vector-store'; // Use your configured store
import { z } from 'zod';
import { extractText, getDocumentProxy } from 'unpdf';
import { getVectorDimensions } from '@/lib/ai/utils';

// Define the event payload type for clarity
interface FileEmbedRequestedEvent {
  name: 'file/embed.requested';
  data: {
    managedFileId: string;
    name: string;
    blobUrl: string;
    blobDownloadUrl: string;
    mimeType: string;
  };
  user: {
    id: string;
  };
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

// Helper function to get the best available model for generation
const getBestGenerationModel = () => {
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

export const embedFileOnUpload = inngest.createFunction(
  { id: 'embed-file-on-upload', name: 'Embed File on Upload' },
  { event: 'file/embed.requested' as FileEmbedRequestedEvent['name'] }, // Type assertion for event name
  async ({ event, step, publish }) => {
    const { managedFileId, name, blobUrl, blobDownloadUrl, mimeType } =
      event.data;
    const { id: userId } = event.user;

    const channel = `user:${userId}`;
    const topic = 'embed-file-status';

    // Publish initial status
    await publish({
      channel: channel,
      topic: topic,
      data: {
        managedFileId: managedFileId,
        status: 'started',
        step: 'initialize',
        message: 'Starting file processing',
        progress: 0,
      },
    });

    // Check mimeType
    if (
      !mimeType.startsWith('text/') &&
      !mimeType.startsWith('application/pdf')
    ) {
      console.warn(
        `Unsupported mimeType for embedding: ${mimeType}. Skipping embedding for file ${managedFileId}`,
      );

      await publish({
        channel: channel,
        topic: topic,
        data: {
          managedFileId: managedFileId,
          status: 'error',
          step: 'mime-check',
          message: `Unsupported file type: ${mimeType}`,
          progress: 0,
        },
      });

      return { success: false, message: 'Unsupported mimeType' };
    }

    let fileContentText: string[];
    try {
      await publish({
        channel: channel,
        topic: topic,
        data: {
          managedFileId: managedFileId,
          status: 'processing',
          step: 'fetching',
          message: 'Fetching file content',
          progress: 10,
        },
      });

      const response = await fetch(blobUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch file from blob: ${response.statusText}`,
        );
      }
      const fileBuffer = await response.arrayBuffer();

      await publish({
        channel: channel,
        topic: topic,
        data: {
          managedFileId: managedFileId,
          status: 'processing',
          step: 'parsing',
          message: 'Parsing file content',
          progress: 20,
        },
      });

      if (mimeType === 'application/pdf') {
        const pdf = await getDocumentProxy(new Uint8Array(fileBuffer));
        const { text } = await extractText(pdf, {
          mergePages: false,
        });
        fileContentText = text;
      } else if (mimeType.startsWith('text/')) {
        fileContentText = [new TextDecoder().decode(fileBuffer)];
      } else {
        // For other binary types (images, docx, etc.), text extraction is more complex.
        // Mastra's MDocument might handle some directly, or you might need specific parsers.
        // For now, we'll log and skip embedding for unsupported types if not plain text/pdf.

        await publish({
          channel: channel,
          topic: topic,
          data: {
            managedFileId: managedFileId,
            status: 'error',
            step: 'parsing',
            message: `Unsupported file type for text extraction: ${mimeType}`,
            progress: 20,
          },
        });

        console.warn(
          `Unsupported mimeType for direct text extraction: ${mimeType}. Skipping embedding for file ${managedFileId}`,
        );
        // Update status to reflect it won't be embedded if no text could be extracted.
        // Or, you could mark as requiring manual attention.
        // For this example, we won't update to isEmbedded = true if we can't process.
        return {
          success: false,
          message: `Unsupported mimeType for text extraction: ${mimeType}`,
        };
      }
    } catch (error) {
      await publish({
        channel: channel,
        topic: topic,
        data: {
          managedFileId: managedFileId,
          status: 'error',
          step: 'parsing',
          message: `Error processing file: ${error instanceof Error ? error.message : String(error)}`,
          progress: 20,
        },
      });

      console.error(
        `Error fetching or parsing file ${managedFileId} from ${blobUrl}:`,
        error,
      );
      return {
        success: false,
        message: `Error processing file: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    await publish({
      channel: channel,
      topic: topic,
      data: {
        managedFileId: managedFileId,
        status: 'processing',
        step: 'analyzing',
        message: 'Generating summary and tags',
        progress: 30,
      },
    });

    // No need to fetch taxonomies, we'll generate tags directly
    const existingTags = await getAllTags(userId);

    const { summary, tags } = await step.run(
      'generate-summary-and-tags',
      async () => {
        const { object } = await generateObject({
          model: getBestGenerationModel(),
          schema: z.object({
            summary: z.string(),
            tags: z.array(z.string()).max(5),
          }),
          prompt: `Extract the summary and up to 5 tags from the following text. 
                   When choosing tags, prefer using existing tags if they fit: [${existingTags.join(', ')}]. 
                   Don't create new tags.
                   
                   Text: ${fileContentText.join('\n')}`,
        });
        return object;
      },
    );

    await publish({
      channel: channel,
      topic: topic,
      data: {
        managedFileId: managedFileId,
        status: 'processing',
        step: 'chunking',
        message: 'Breaking document into chunks',
        progress: 50,
      },
    });

    // Create chunks
    const chunks = await step.run('chunk-document', async () => {
      const chunkingTasks = fileContentText.map(async (page, i) => {
        const doc = MDocument.fromText(page); // Use fromText after extraction
        const chunks = await doc.chunk({
          strategy: 'recursive', // Or other strategies as appropriate
          size: 512,
          overlap: 50,
          separator: '\n', // Default is fine
          extract: {
            title: true,
            questions: true,
            keywords: true,
            summary: true,
          }, // If you want Mastra to extract metadata (may use LLM)
        });
        // Include additional metadata that will be used for embedding
        chunks.forEach((chunk) => {
          chunk.metadata.page = i + 1;
          chunk.metadata.fileName = name;
        });
        return chunks;
      });
      return (await Promise.all(chunkingTasks)).flat();
    });
    console.log('Successfully generated chunks', chunks.length);

    await publish({
      channel: channel,
      topic: topic,
      data: {
        managedFileId: managedFileId,
        status: 'processing',
        step: 'embedding',
        message: 'Generating embeddings',
        progress: 70,
      },
    });

    const { embeddings } = await step.run('generate-embeddings', async () => {
      const embeddingModel = getBestEmbeddingModel();
      const modelName = embeddingModel.modelId || 'nomic-embed-text';
      const dimensions = getVectorDimensions(modelName);

      console.log(
        `🔍 Generating embeddings with ${modelName} (${dimensions} dimensions)`,
      );

      return embedMany({
        values: chunks.map(
          (chunk) => `${JSON.stringify(chunk.metadata)}\n\n${chunk.text}`,
        ), // Use your own metadata template here
        model: embeddingModel,
      });
    });
    console.log('Successfully generated embeddings', embeddings.length);

    await publish({
      channel: channel,
      topic: topic,
      data: {
        managedFileId: managedFileId,
        status: 'processing',
        step: 'storing',
        message: 'Storing embeddings in vector database',
        progress: 85,
      },
    });

    await step.run('upsert-embeddings', async () => {
      return vectorStore.upsert({
        indexName: process.env.INDEX_NAME as string, // Ensure this index exists and matches dimensions
        vectors: embeddings,
        metadata: chunks.map((chunk) => ({
          text: chunk.text,
          fileId: managedFileId,
          fileName: name,
          blobDownloadUrl: blobDownloadUrl,
          blobUrl: blobUrl,
          mimeType: mimeType,
          userId: userId, // Or OrgID
          ...chunk.metadata,
        })),
      });
    });
    console.log('Successfully upserted embeddings', embeddings.length);

    await publish({
      channel: channel,
      topic: topic,
      data: {
        managedFileId: managedFileId,
        status: 'processing',
        step: 'finishing',
        message: 'Updating file status',
        progress: 95,
      },
    });

    await step.run('update-db-status', async () => {
      return updateManagedFile({
        id: managedFileId,
        isEmbedded: true,
        aiSummary: summary,
        tags,
      });
    });
    console.log('Successfully updated db status');

    await publish({
      channel: channel,
      topic: topic,
      data: {
        managedFileId: managedFileId,
        status: 'completed',
        step: 'complete',
        message: 'File processed successfully',
        progress: 100,
      },
    });

    return {
      success: true,
      message: `File ${managedFileId} processed and embedded.`,
    };
  },
);
