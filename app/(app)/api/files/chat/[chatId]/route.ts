import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  getFilesByChatId,
  addFileToChat,
  removeFileFromChat,
  getChatById,
  saveChat,
} from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const { chatId } = await params;

    const session = await auth();
    const guestSession = request.cookies.get('guest-session');

    if (!session?.user && !guestSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if chat exists and user has access
    const chat = await getChatById({ id: chatId });
    if (!chat) {
      // For testing, return empty array instead of 404
      return NextResponse.json([]);
    }

    // For guest sessions, allow access to all chats
    if (guestSession) {
      const files = await getFilesByChatId(chatId);
      return NextResponse.json(files);
    }

    // For authenticated users, check access
    if (
      session?.user &&
      chat.visibility === 'private' &&
      chat.userId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const files = await getFilesByChatId(chatId);
    return NextResponse.json(files);
  } catch (error) {
    console.error('Failed to get chat files:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const { chatId } = await params;
    console.log('=== ADDING FILE TO CHAT API ===');
    console.log('Chat ID:', chatId);

    const session = await auth();
    const guestSession = request.cookies.get('guest-session');

    console.log('Session:', !!session?.user);
    console.log('Guest session:', !!guestSession);

    if (!session?.user && !guestSession) {
      console.log('Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For guest sessions, allow all operations
    if (guestSession) {
      const { fileId } = await request.json();
      console.log('Guest session - File ID:', fileId);

      if (!fileId) {
        return NextResponse.json(
          { error: 'File ID is required' },
          { status: 400 },
        );
      }

      // Create chat if it doesn't exist for guest users
      const chat = await getChatById({ id: chatId });
      console.log('Existing chat for guest:', !!chat);

      if (!chat) {
        console.log('Creating new chat for guest');
        try {
          await saveChat({
            id: chatId,
            userId: 'guest-user',
            title: 'Guest Chat',
            visibility: 'private',
          });
          console.log('✅ Chat created successfully for guest');
        } catch (error) {
          console.error('❌ Failed to create chat for guest:', error);
          return NextResponse.json(
            { error: 'Failed to create chat' },
            { status: 500 },
          );
        }
      }

      const result = await addFileToChat({ chatId, fileId });
      console.log('Add file result for guest:', !!result);

      if (!result) {
        return NextResponse.json(
          { error: 'Failed to add file to chat' },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true });
    }

    // For authenticated users, check access
    const chat = await getChatById({ id: chatId });
    console.log('Existing chat for user:', !!chat);

    if (!chat) {
      // Create chat if it doesn't exist
      if (session?.user) {
        console.log('Creating new chat for user');
        try {
          await saveChat({
            id: chatId,
            userId: session.user.id,
            title: 'New Chat',
            visibility: 'private',
          });
          console.log('✅ Chat created successfully for user');
        } catch (error) {
          console.error('❌ Failed to create chat for user:', error);
          return NextResponse.json(
            { error: 'Failed to create chat' },
            { status: 500 },
          );
        }
      }
    } else if (session?.user && chat.userId !== session.user.id) {
      console.log('Forbidden - user mismatch');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { fileId } = await request.json();
    console.log('User session - File ID:', fileId);

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 },
      );
    }

    const result = await addFileToChat({ chatId, fileId });
    console.log('Add file result for user:', !!result);

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to add file to chat' },
        { status: 500 },
      );
    }

    console.log('=== END ADDING FILE TO CHAT API ===');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to add file to chat:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const { chatId } = await params;
    const session = await auth();
    const guestSession = request.cookies.get('guest-session');

    if (!session?.user && !guestSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if chat exists and user has access
    const chat = await getChatById({ id: chatId });
    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // For guest sessions, allow access to all chats
    if (guestSession) {
      // Continue with the operation
    } else if (session?.user && chat.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { fileId } = await request.json();

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 },
      );
    }

    const result = await removeFileFromChat({ chatId, fileId });

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to remove file from chat' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to remove file from chat:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
