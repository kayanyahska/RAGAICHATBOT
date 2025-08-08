import { cookies } from 'next/headers';

import { Chat } from '@/components/chat/chat';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/artifact/data-stream-handler';
import { auth } from '../(auth)/auth';
import { redirect } from 'next/navigation';
import type { Session } from 'next-auth';

export default async function Page() {
  const session = await auth();
  const cookieStore = await cookies();
  const guestSession = cookieStore.get('guest-session');

  // Create a mock session for testing if no real session
  const mockSession: Session = {
    user: {
      id: 'guest-user',
      type: 'guest' as const,
      name: null,
      email: null,
      image: null,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
  };

  if (!session && !guestSession) {
    redirect('/api/auth/guest');
  }

  const id = generateUUID();

  const modelIdFromCookie = cookieStore.get('chat-model');

  if (!modelIdFromCookie) {
    return (
      <>
        <Chat
          key={id}
          id={id}
          initialMessages={[]}
          initialChatModel={DEFAULT_CHAT_MODEL}
          initialVisibilityType="private"
          isReadonly={false}
          session={session || mockSession}
          autoResume={false}
        />
        <DataStreamHandler id={id} />
      </>
    );
  }

  return (
    <>
      <Chat
        key={id}
        id={id}
        initialMessages={[]}
        initialChatModel={modelIdFromCookie.value}
        initialVisibilityType="private"
        isReadonly={false}
        session={session || mockSession}
        autoResume={false}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
