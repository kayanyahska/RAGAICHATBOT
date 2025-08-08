import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getFilesByChatId, getManagedFilesByUserId } from '@/lib/db/queries';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID required' }, { status: 400 });
    }

    // Get files in the chat
    const chatFiles = await getFilesByChatId(chatId);

    // Get all user files
    const allUserFiles = await getManagedFilesByUserId(session.user.id);

    return NextResponse.json({
      chatId,
      chatFiles: chatFiles.map((f) => ({
        id: f.id,
        name: f.name,
        isEmbedded: f.isEmbedded,
        originalChatId: f.originalChatId,
        uploadedAt: f.uploadedAt,
        aiSummary: f.aiSummary,
        tags: f.tags,
      })),
      allUserFiles: allUserFiles.map((f) => ({
        id: f.id,
        name: f.name,
        isEmbedded: f.isEmbedded,
        originalChatId: f.originalChatId,
        uploadedAt: f.uploadedAt,
      })),
      summary: {
        totalChatFiles: chatFiles.length,
        embeddedChatFiles: chatFiles.filter((f) => f.isEmbedded).length,
        totalUserFiles: allUserFiles.length,
        embeddedUserFiles: allUserFiles.filter((f) => f.isEmbedded).length,
      },
    });
  } catch (error) {
    console.error('Debug file status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
