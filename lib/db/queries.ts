import 'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  type SQL,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  message,
  vote,
  type DBMessage,
  type Chat,
  stream,
  managedFile,
  type DBManagedFileType,
  tag,
  chatFile,
  type ChatFile,
} from './schema';
import type { ArtifactKind } from '@/components/artifact/artifact';
import { generateUUID } from '../utils';
import { generateHashedPassword } from './utils';
import type { VisibilityType } from '@/components/chat/visibility-selector';
import { store as vectorStore } from './vector-store';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// Type for creating a new managed file, omitting auto-generated/managed fields
export type NewManagedFile = Omit<
  DBManagedFileType,
  'id' | 'uploadedAt' | 'isEmbedded'
>;

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error('Failed to get user from database');
    throw error;
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await db.insert(user).values({ email, password: hashedPassword });
  } catch (error) {
    console.error('Failed to create user in database');
    throw error;
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    return await db.insert(user).values({ email, password }).returning({
      id: user.id,
      email: user.email,
    });
  } catch (error) {
    console.error('Failed to create guest user in database');
    throw error;
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    console.log('=== SAVING CHAT TO DATABASE ===');
    console.log('Chat ID:', id);
    console.log('User ID:', userId);
    console.log('Title:', title);
    console.log('Visibility:', visibility);

    const result = await db
      .insert(chat)
      .values({
        id,
        userId,
        title,
        visibility,
        createdAt: new Date(),
      })
      .returning();

    console.log('✅ Chat saved successfully:', result);
    return result[0];
  } catch (error) {
    console.error('❌ Failed to save chat:', error);
    console.error('Error details:', {
      id,
      userId,
      title,
      visibility,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (error) {
    console.error('Failed to delete chat by id from database');
    throw error;
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id),
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Array<Chat> = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new Error(`Chat with id ${startingAfter} not found`);
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new Error(`Chat with id ${endingBefore} not found`);
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (error) {
    console.error('Failed to get chats by user from database');
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error('Failed to get chat by id from database');
    throw error;
  }
}

export async function saveMessages({
  messages,
}: {
  messages: Array<DBMessage>;
}) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    console.error('Failed to save messages in database', error);
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    console.error('Failed to get messages by chat id from database', error);
    throw error;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    console.error('Failed to upvote message in database', error);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error('Failed to get votes by chat id from database', error);
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (error) {
    console.error('Failed to save document in database');
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (error) {
    console.error(
      'Failed to delete documents by id after timestamp from database',
    );
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error('Failed to save suggestions in database');
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    console.error(
      'Failed to get suggestions by document version from database',
    );
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    console.error('Failed to get message by id from database');
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
        );
    }
  } catch (error) {
    console.error(
      'Failed to delete messages by id after timestamp from database',
    );
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error('Failed to update chat visibility in database');
    throw error;
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: { id: string; differenceInHours: number }) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000,
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, 'user'),
        ),
      )
      .execute();

    return stats?.count ?? 0;
  } catch (error) {
    console.error(
      'Failed to get message count by user id for the last 24 hours from database',
    );
    throw error;
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (error) {
    console.error('Failed to create stream id in database');
    throw error;
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (error) {
    console.error('Failed to get stream ids by chat id from database');
    throw error;
  }
}

export async function createManagedFile(
  newFile: NewManagedFile,
): Promise<DBManagedFileType | null> {
  try {
    const [result] = await db
      .insert(managedFile)
      .values({
        ...newFile,
        uploadedAt: new Date(),
        isEmbedded: false,
      })
      .returning();
    return result || null;
  } catch (error) {
    console.error('Failed to create managed file in database', error);
    return null;
  }
}

export async function updateManagedFile({
  id,
  isEmbedded,
  aiSummary,
  tags,
}: {
  id: string;
  isEmbedded: boolean;
  aiSummary: string;
  tags: string[];
}): Promise<DBManagedFileType | null> {
  try {
    const [result] = await db
      .update(managedFile)
      .set({ isEmbedded, aiSummary, tags })
      .where(eq(managedFile.id, id))
      .returning();
    return result || null;
  } catch (error) {
    console.error('Failed to update managed file', error);
    return null;
  }
}

export async function getManagedFileById(
  id: string,
): Promise<DBManagedFileType | null> {
  try {
    const [result] = await db
      .select()
      .from(managedFile)
      .where(eq(managedFile.id, id));
    return result || null;
  } catch (error) {
    console.error('Failed to get managed file by id', error);
    return null;
  }
}

export async function getManagedFilesByUserId(
  userId: string,
): Promise<DBManagedFileType[]> {
  try {
    const results = await db
      .select()
      .from(managedFile)
      .where(eq(managedFile.userId, userId))
      .orderBy(desc(managedFile.uploadedAt));
    return results;
  } catch (error) {
    console.error('Failed to get managed files by user id', error);
    return [];
  }
}

export async function deleteManagedFile(
  id: string,
): Promise<DBManagedFileType | null> {
  try {
    // First find the file to check if it's embedded
    const fileToDelete = await getManagedFileById(id);
    if (!fileToDelete) return null;

    // Delete from vector store if embedded
    if (fileToDelete.isEmbedded) {
      const indexName = process.env.INDEX_NAME as string;
      try {
        // Get all vectors for the file
        const vector = new Array(1536).fill(0) as number[];
        const vectors = await vectorStore.query({
          queryVector: vector,
          indexName,
          topK: 1000,
          filter: {
            fileId: id,
          },
        });

        // Delete vectors from the index
        for (const vector of vectors) {
          await vectorStore.deleteIndex({ indexName });
        }
      } catch (vectorStoreError) {
        console.error('Error deleting from vector store', vectorStoreError);
        // Continue with DB deletion even if vector store deletion fails
      }
    }

    // Delete from database
    const [result] = await db
      .delete(managedFile)
      .where(eq(managedFile.id, id))
      .returning();

    return result || null;
  } catch (error) {
    console.error('Failed to delete managed file', error);
    return null;
  }
}

export async function getAllTags(userId: string): Promise<string[]> {
  try {
    const tags = await db
      .select({ name: tag.name })
      .from(tag)
      .where(eq(tag.userId, userId))
      .orderBy(asc(tag.name));
    return tags.map((t) => t.name);
  } catch (error) {
    console.error('Failed to get tags', error);
    return [];
  }
}

export async function createTagIfNotExists(
  tagName: string,
  userId: string,
): Promise<boolean> {
  try {
    await db
      .insert(tag)
      .values({ name: tagName, userId })
      .onConflictDoNothing();
    return true;
  } catch (error) {
    console.error('Failed to create tag', error);
    return false;
  }
}

export async function deleteTag(id: string): Promise<boolean> {
  try {
    const result = await db.delete(tag).where(eq(tag.id, id)).returning();
    return result.length > 0;
  } catch (error) {
    console.error('Failed to delete tag from database');
    return false;
  }
}

// Chat-File relationship functions
export async function addFileToChat({
  chatId,
  fileId,
}: {
  chatId: string;
  fileId: string;
}): Promise<ChatFile | null> {
  try {
    console.log('=== ADDING FILE TO CHAT IN DATABASE ===');
    console.log('Chat ID:', chatId);
    console.log('File ID:', fileId);

    // First, check if the file already has an originalChatId set
    const existingFile = await db
      .select({ originalChatId: managedFile.originalChatId })
      .from(managedFile)
      .where(eq(managedFile.id, fileId))
      .limit(1);

    // If the file doesn't have an originalChatId set, update it with the current chatId
    if (existingFile.length > 0 && !existingFile[0].originalChatId) {
      console.log('Updating originalChatId for file:', fileId);
      await db
        .update(managedFile)
        .set({ originalChatId: chatId })
        .where(eq(managedFile.id, fileId));
    }

    const result = await db
      .insert(chatFile)
      .values({ chatId, fileId })
      .returning();

    console.log('Database insert result:', result);
    return result[0] || null;
  } catch (error) {
    console.error('Failed to add file to chat:', error);
    console.error('Error details:', {
      chatId,
      fileId,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
}

export async function removeFileFromChat({
  chatId,
  fileId,
}: {
  chatId: string;
  fileId: string;
}): Promise<boolean> {
  try {
    const result = await db
      .delete(chatFile)
      .where(and(eq(chatFile.chatId, chatId), eq(chatFile.fileId, fileId)))
      .returning();
    return result.length > 0;
  } catch (error) {
    console.error('Failed to remove file from chat');
    return false;
  }
}

export async function getFilesByChatId(
  chatId: string,
): Promise<DBManagedFileType[]> {
  try {
    console.log('=== GETTING FILES BY CHAT ID ===');
    console.log('Chat ID:', chatId);

    // First get the file IDs for this chat
    const chatFileIds = await db
      .select({ fileId: chatFile.fileId })
      .from(chatFile)
      .where(eq(chatFile.chatId, chatId));

    if (chatFileIds.length === 0) {
      console.log('No files found for chat');
      return [];
    }

    // Then get the actual file data for these IDs
    const result = await db
      .select({
        id: managedFile.id,
        name: managedFile.name,
        blobUrl: managedFile.blobUrl,
        blobDownloadUrl: managedFile.blobDownloadUrl,
        mimeType: managedFile.mimeType,
        size: managedFile.size,
        aiSummary: managedFile.aiSummary,
        tags: managedFile.tags,
        uploadedAt: managedFile.uploadedAt,
        userId: managedFile.userId,
        isEmbedded: managedFile.isEmbedded,
        originalChatId: managedFile.originalChatId,
      })
      .from(managedFile)
      .where(
        inArray(
          managedFile.id,
          chatFileIds.map((cf) => cf.fileId),
        ),
      );

    console.log('Database query result:', result);
    console.log('Files found for chat:', result.length);
    console.log(
      'File names found:',
      result.map((f) => f.name),
    );

    return result;
  } catch (error) {
    console.error('Failed to get files by chat ID:', error);
    return [];
  }
}

export async function getChatsByFileId(fileId: string): Promise<Chat[]> {
  try {
    const result = await db
      .select({
        id: chat.id,
        createdAt: chat.createdAt,
        title: chat.title,
        userId: chat.userId,
        visibility: chat.visibility,
      })
      .from(chat)
      .innerJoin(chatFile, eq(chat.id, chatFile.chatId))
      .where(eq(chatFile.fileId, fileId));

    return result;
  } catch (error) {
    console.error('Failed to get chats by file ID');
    return [];
  }
}

export async function isFileInChat({
  chatId,
  fileId,
}: {
  chatId: string;
  fileId: string;
}): Promise<boolean> {
  try {
    const result = await db
      .select()
      .from(chatFile)
      .where(and(eq(chatFile.chatId, chatId), eq(chatFile.fileId, fileId)));

    return result.length > 0;
  } catch (error) {
    console.error('Failed to check if file is in chat');
    return false;
  }
}

export async function getFilesByOriginalChatId(
  originalChatId: string,
): Promise<DBManagedFileType[]> {
  try {
    console.log('=== GETTING FILES BY ORIGINAL CHAT ID ===');
    console.log('Original Chat ID:', originalChatId);

    const result = await db
      .select({
        id: managedFile.id,
        name: managedFile.name,
        blobUrl: managedFile.blobUrl,
        blobDownloadUrl: managedFile.blobDownloadUrl,
        mimeType: managedFile.mimeType,
        size: managedFile.size,
        aiSummary: managedFile.aiSummary,
        tags: managedFile.tags,
        uploadedAt: managedFile.uploadedAt,
        userId: managedFile.userId,
        isEmbedded: managedFile.isEmbedded,
        originalChatId: managedFile.originalChatId,
      })
      .from(managedFile)
      .where(eq(managedFile.originalChatId, originalChatId));

    console.log('Database query result:', result);
    console.log('Files originally uploaded to chat:', result.length);
    console.log(
      'File names originally uploaded to chat:',
      result.map((f) => f.name),
    );

    return result;
  } catch (error) {
    console.error('Failed to get files by original chat ID:', error);
    return [];
  }
}
