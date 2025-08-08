import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getChatsByFileId } from '@/lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const { fileId } = await params;
    const session = await auth();
    const guestSession = request.cookies.get('guest-session');

    if (!session?.user && !guestSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const chats = await getChatsByFileId(fileId);
    return NextResponse.json(chats);
  } catch (error) {
    console.error('Failed to get chats for file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
