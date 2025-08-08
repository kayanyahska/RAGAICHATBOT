import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getManagedFilesByUserId, getFilesByChatId } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const guestSession = request.cookies.get('guest-session');

    if (!session?.user && !guestSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session?.user?.id || 'guest-user';
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    console.log('=== DEBUG API ===');
    console.log('User ID:', userId);
    console.log('Chat ID:', chatId);

    // Get all files for the user
    const allFiles = await getManagedFilesByUserId(userId);
    console.log('All files for user:', allFiles.length);
    console.log(
      'File names:',
      allFiles.map((f) => f.name),
    );

    // Get files for specific chat if provided
    let chatFiles = [];
    if (chatId) {
      chatFiles = await getFilesByChatId(chatId);
      console.log('Files for chat:', chatFiles.length);
      console.log(
        'Chat file names:',
        chatFiles.map((f) => f.name),
      );
    }

    // Find files with "Zac" or "compressed" in name
    const zacFiles = allFiles.filter(
      (f) =>
        f.name.toLowerCase().includes('zac') ||
        f.name.toLowerCase().includes('compressed'),
    );
    console.log(
      'Files with "Zac" or "compressed":',
      zacFiles.map((f) => ({ id: f.id, name: f.name })),
    );

    return NextResponse.json({
      allFiles: allFiles.map((f) => ({ id: f.id, name: f.name })),
      chatFiles: chatFiles.map((f) => ({ id: f.id, name: f.name })),
      zacFiles: zacFiles.map((f) => ({ id: f.id, name: f.name })),
      userId,
      chatId,
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
