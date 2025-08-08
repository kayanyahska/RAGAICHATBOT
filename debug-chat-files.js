const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');

// Database connection
const connectionString = process.env.POSTGRES_URL;
const client = postgres(connectionString);
const db = drizzle(client);

async function debugChatFiles() {
  try {
    console.log('=== DEBUGGING CHAT FILES ===');

    // Get all files (using raw SQL for simplicity)
    const allFiles = await client`SELECT * FROM managed_files`;
    console.log('Total files in system:', allFiles.length);
    console.log(
      'File names:',
      allFiles.map((f) => f.name),
    );

    // Get all chat-file associations
    const chatFiles = await client`SELECT * FROM chat_files`;
    console.log('Total chat-file associations:', chatFiles.length);
    console.log('Chat-file associations:', chatFiles);

    // Get all chats
    const allChats = await client`SELECT * FROM chats`;
    console.log('Total chats:', allChats.length);
    console.log(
      'Chat IDs:',
      allChats.map((c) => c.id),
    );

    // Check specific chat
    const targetChatId = 'fe065a0c-4b17-4ae0-8951-46c46e2f7303';
    const chatFilesForTarget = chatFiles.filter(
      (cf) => cf.chat_id === targetChatId,
    );
    console.log(
      `Files linked to chat ${targetChatId}:`,
      chatFilesForTarget.length,
    );
    console.log(
      'Linked file IDs:',
      chatFilesForTarget.map((cf) => cf.file_id),
    );

    // Find files with "Zac" or "compressed" in name
    const zacFiles = allFiles.filter(
      (f) =>
        f.name.toLowerCase().includes('zac') ||
        f.name.toLowerCase().includes('compressed'),
    );
    console.log(
      'Files with "Zac" or "compressed" in name:',
      zacFiles.map((f) => ({ id: f.id, name: f.name })),
    );

    // Check which chats these files are linked to
    for (const file of zacFiles) {
      const linkedChats = chatFiles.filter((cf) => cf.file_id === file.id);
      console.log(
        `File "${file.name}" (${file.id}) is linked to ${linkedChats.length} chats:`,
        linkedChats.map((cf) => cf.chat_id),
      );
    }
  } catch (error) {
    console.error('Error debugging chat files:', error);
  } finally {
    await client.end();
  }
}

debugChatFiles();
