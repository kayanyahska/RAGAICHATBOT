import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getManagedFilesByUserId, deleteManagedFile } from '@/lib/db/queries';

export async function GET() {
  try {
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const files = await getManagedFilesByUserId(userId);

    return NextResponse.json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await request.json();
  const deleted = await deleteManagedFile(id);
  return NextResponse.json(deleted);
}
