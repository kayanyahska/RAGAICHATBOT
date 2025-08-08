import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { xai } from '@ai-sdk/xai';
import { openai } from '@ai-sdk/openai';
import { ollama } from 'ollama-ai-provider';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

// Helper function to get the best available model with fallback
const getBestAvailableModel = () => {
  // Prioritize Ollama Mistral (local model) - no rate limits!
  if (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_HOST) {
    return ollama('mistral');
  }

  // Check if OpenAI API key is available
  if (process.env.OPENAI_API_KEY) {
    return openai('gpt-4o-mini');
  }

  // Check if xAI API key is available
  if (process.env.XAI_API_KEY) {
    return xai('grok-2-vision-1212');
  }

  throw new Error(
    'No AI provider configured. Please set OLLAMA_BASE_URL, OPENAI_API_KEY, or XAI_API_KEY',
  );
};

const getBestReasoningModel = () => {
  // Prioritize Ollama Mistral with reasoning middleware
  if (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_HOST) {
    return wrapLanguageModel({
      model: ollama('mistral'),
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    });
  }

  if (process.env.OPENAI_API_KEY) {
    return wrapLanguageModel({
      model: openai('gpt-4o'),
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    });
  }

  if (process.env.XAI_API_KEY) {
    return wrapLanguageModel({
      model: xai('grok-3-mini-beta'),
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    });
  }

  throw new Error(
    'No AI provider configured. Please set OLLAMA_BASE_URL, OPENAI_API_KEY, or XAI_API_KEY',
  );
};

// Helper function to get embedding model with fallback
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

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        'chat-model': getBestAvailableModel(),
        'chat-model-reasoning': getBestReasoningModel(),
        'title-model': getBestAvailableModel(),
        'artifact-model': getBestAvailableModel(),
      },
      imageModels: {
        'small-model': process.env.OPENAI_API_KEY
          ? openai.image('dall-e-3')
          : xai.image('grok-2-image'),
      },
    });
