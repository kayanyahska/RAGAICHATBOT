# Ollama Configuration Guide

## Quick Setup for Ollama as Primary Model

### 1. Create .env.local file

Create a `.env.local` file in your project root with:

```bash
# Ollama Configuration (Primary Model)
OLLAMA_BASE_URL=http://localhost:11434

# Database Configuration (if you have it)
POSTGRES_URL=your_postgres_url_here

# Vector Store Configuration
INDEX_NAME=document_embeddings

# NextAuth Configuration
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000

# Vercel Blob Configuration (if you have it)
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token_here

# Inngest Configuration (if you have it)
INNGEST_EVENT_KEY=your_inngest_event_key_here
INNGEST_SIGNING_KEY=your_inngest_signing_key_here
```

### 2. Verify Ollama is Running

```bash
# Check if Ollama is running
ollama list

# Should show:
# NAME              ID       SIZE   MODIFIED
# mistral           ...      4.4GB  ...
# nomic-embed-text  ...      274MB  ...
```

### 3. Test the Setup

```bash
# Test chat model
ollama run mistral "Hello!"

# Test embedding model
ollama run nomic-embed-text "Test text"
```

## Benefits of Using Ollama

✅ **No Rate Limits** - Unlimited API calls  
✅ **No API Costs** - Completely free  
✅ **Privacy** - All processing local  
✅ **Reliability** - No external dependencies  
✅ **Speed** - Fast local inference  

## Model Information

- **Mistral**: 7B parameter model for chat and generation
- **Nomic Embed Text**: High-quality embeddings for search
- **Memory Usage**: ~4GB for Mistral, ~2GB for embeddings

## Troubleshooting

1. **Ollama not running**: `brew services start ollama`
2. **Models not found**: `ollama pull mistral` and `ollama pull nomic-embed-text`
3. **Connection refused**: Check if Ollama is running on port 11434
4. **Slow performance**: Consider using a smaller model or better hardware

## Next Steps

1. Create the `.env.local` file with the configuration above
2. Restart your development server: `npm run dev`
3. Test uploading files and chatting
4. Enjoy unlimited AI interactions! 🚀
