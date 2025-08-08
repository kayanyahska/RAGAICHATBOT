# Ollama Fallback Setup Guide

This project now supports Ollama as a fallback model when other AI providers hit rate limits or API keys expire.

## Prerequisites

1. **Install Ollama**: Follow the official installation guide at https://ollama.ai/
2. **Pull Mistral Model**: Run `ollama pull mistral` to download the Mistral model
3. **Pull Nomic Embed Text**: Run `ollama pull nomic-embed-text` for embeddings

## Configuration

Add these environment variables to your `.env.local` file:

```bash
# Ollama Configuration (Fallback Models)
OLLAMA_BASE_URL=http://localhost:11434
# OR
OLLAMA_HOST=localhost:11434

# Your existing API keys (if you have them)
OPENAI_API_KEY=your_openai_api_key_here
XAI_API_KEY=your_xai_api_key_here
```

## How It Works

The system will automatically fall back to Ollama models in this order:

1. **Primary**: OpenAI (if API key is available)
2. **Secondary**: xAI (if API key is available)
3. **Fallback**: Ollama Mistral (if running locally)

## Models Used

- **Chat/Generation**: `mistral` (7B parameter model)
- **Embeddings**: `nomic-embed-text` (high-quality embeddings)
- **Reasoning**: `mistral` with reasoning middleware

## Benefits

- ✅ **No Rate Limits**: Local models don't have API rate limits
- ✅ **No API Costs**: Free to use once installed
- ✅ **Privacy**: All processing happens locally
- ✅ **Reliability**: No dependency on external API availability

## Troubleshooting

1. **Ollama not running**: Start Ollama with `ollama serve`
2. **Model not found**: Run `ollama pull mistral` and `ollama pull nomic-embed-text`
3. **Connection refused**: Check if Ollama is running on port 11434

## Performance Notes

- **First Run**: Models will be downloaded (can take several minutes)
- **Inference Speed**: Depends on your hardware (CPU/GPU)
- **Memory Usage**: Mistral requires ~4GB RAM, Nomic Embed requires ~2GB RAM

## Testing

To test if Ollama is working:

```bash
# Test chat model
ollama run mistral "Hello, how are you?"

# Test embedding model
ollama run nomic-embed-text "Test text for embedding"
```
