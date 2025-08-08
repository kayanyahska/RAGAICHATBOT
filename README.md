Fullstack RAG-as-a-Service Template

**Build your own fullstack AI-powered research assistant for your private knowledge base!**

Chatting with documents is one of the best general use cases for AI, both for personal and enterprise usecases, there are lots of tutorials for building a local system but no one really shows you how to build an integrated one you would launch for a SaaS.

It is a modern serverless Next.js template (extended from [Vercel's AI Chatbot](https://github.com/vercel/ai-chatbot)) built for the Vercel AI SDK, leveraging **Mastra** for Retrieval Augmented Generation (RAG) and **Inngest** for robust background job processing. This template provides a powerful foundation to quickly deploy a sophisticated RAG-as-a-Service application.

Upload your documents here

![image](https://github.com/user-attachments/assets/531a91b7-f103-4a63-95dc-2e4c7484450e)

Chat with them here + do all the things you can do with the Vercel AI chatbot

![research assistant](https://github.com/user-attachments/assets/be1af794-28d7-47dd-a8b0-b84939acb25d)


[![Star on GitHub](https://img.shields.io/github/stars/KenjiPcx/DocBank?style=social)](https://github.com/KenjiPcx/DocBank)

---

Let's build the future of AI together!

### What You Can Build With This

Some ideas I have, centralizing data is the starting point

- Build AI workflows for different verticals, imagine AI for consulting, AI for finance etc
- Extend the template with integrations to Google Drive etc to sync into a central document hub
- Extend the RAG with Agentic RAG
- Launch your own RAG as a service to small businesses
- A document hub for your family

### Special Thanks To

[Vercel's AI Chatbot](https://github.com/vercel/ai-chatbot) for their chatbot implementation

---

## Features

*   **Fullstack RAG Implementation**: End-to-end solution for building AI assistants that can chat with your data.
*   **Private Knowledge Base**: Securely upload and manage your private documents. Your data remains yours.
*   **Intelligent Document Processing**:
    *   Seamless document uploads.
    *   Automatic embedding generation for uploaded content (via Inngest background jobs).
    *   Efficient semantic search and retrieval powered by Mastra.
*   **Conversational AI Interface**: Engage with your knowledge base through an intuitive chat interface, built with the Vercel AI SDK.
*   **Serverless & Scalable**: Built on Next.js for Vercel, ensuring easy deployment, scalability, and cost-efficiency.
*   **Background Job Processing**: Utilizes Inngest for reliable handling of intensive tasks like document processing and embedding generation, ensuring your application remains responsive.
*   **Modern Tech Stack**:
    *   Next.js (App Router)
    *   Vercel AI SDK
    *   Mastra (for RAG)
    *   Inngest (for background jobs)
    *   Tailwind CSS
    *   shadcn/ui
    *   TypeScript

## How It Works

1.  **Upload Documents**: Add your private documents (e.g., PDFs, TXT, DOCX - *please specify exact supported types*) to your knowledge base.
2.  **Automated Processing**: Inngest triggers background jobs to parse, chunk, generate embeddings, and store them (e.g., in Supabase pgvector, Pinecone - *please specify*).
3.  **Ask Questions**: Interact with the AI assistant.
4.  **Intelligent Retrieval**: Mastra performs semantic search for relevant document chunks.
5.  **Augmented Generation**: Retrieved context is passed to an LLM via the Vercel AI SDK for answers.

<!-- ## Deploy Your Own

Deploy your own version to Vercel. You'll need to configure environment variables for your LLM, Inngest, Mastra, and database providers during setup. -->

<!-- [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FYOUR_USERNAME%2FYOUR_REPOSITORY&env=OPENAI_API_KEY,INNGEST_EVENT_KEY,INNGEST_SIGNING_KEY,MASTRA_API_KEY,DATABASE_URL,NEXTAUTH_SECRET&envDescription=Required%20environment%20variables%20for%20Synapse%20AI.&project-name=synapse-ai-rag&repository-name=synapse-ai-rag&demo-title=Synapse%20AI%20RAG%20Service&demo-url=https%3A%2F%2Fyour-demo-url.vercel.app) -->

## Getting Started

### Prerequisites

*   Node.js (e.g., v18.x or v20.x)
*   npm/yarn/pnpm
*   Vercel Account (for deployment)
*   Inngest Account & relevant keys (Event Key, Signing Key for Cloud)
*   Mastra setup (API key, specific configuration for your chosen backend/vector store)
*   LLM Provider API Key (e.g., OpenAI)
*   Database connection string (e.g., Supabase, Neon)
*   Auth.js secret (`NEXTAUTH_SECRET`)

### Running Locally

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
    cd YOUR_REPOSITORY
    ```
2.  **Install Dependencies**:
    ```bash
    pnpm install # Recommended
    # or npm install / yarn install
    ```
3.  **Set Up Environment Variables**:
    Copy `.env.example` to `.env.local` and fill in your credentials. **Do not commit `.env.local`!**
4.  **Set Up DB**:
    You can get most of the variables from Vercel, once you have your postgres url, uncomment the script in `scripts/init-vector-store` and run it to create a PG Vector Store, also run the drizzle migration scripts:
    ```
    pnpm db:generate
    pnpm db:push
    pnpm db:init-vector-store (you have to uncomment the code first, then comment it back when you're done)
    ```
4.  **Run Inngest Dev Server** (for local development with Inngest functions):
    Open a new terminal and run:
    ```bash
    npx inngest-cli dev -u http://localhost:3000/api/inngest
    ```
5.  **Run the Next.js Development Server**:
    ```bash
    pnpm dev
    ```
    Your app should now be running on [http://localhost:3000](http://localhost:3000).

## Customization

*   **LLMs**: Switch models via Vercel AI SDK configurations.
*   **Embeddings**: Configure embedding models in your Mastra setup / document processing pipeline.
*   **Vector Store**: Mastra is flexible; adapt its backend to your chosen vector database.
*   **UI**: Modify components in `components/` and styles (Tailwind CSS).

## Contributing

Contributions are welcome! Please follow standard fork, branch, commit, and PR practices.

