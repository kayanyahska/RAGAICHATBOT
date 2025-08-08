import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';
import {
  createManagedFile,
  type NewManagedFile,
  createTagIfNotExists,
} from '@/lib/db/queries';
import { inngest } from '@/src/inngest/client';

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 10 * 1024 * 1024, {
      message: 'File size should be less than 10MB',
    })
    .refine(
      (file) =>
        [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
          'application/msword', // .doc
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
          'application/vnd.ms-excel', // .xls
          'text/csv',
          'text/plain',
          'image/jpeg',
          'image/png',
          'image/gif',
        ].includes(file.type),
      {
        message:
          'Invalid file type. Supported types: PDF, DOCX, DOC, XLSX, XLS, CSV, TXT, JPG, PNG, GIF',
      },
    ),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (request.body === null) {
    return new Response('Request body is empty', { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(', ');

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const originalFilename = (formData.get('file') as File).name;
    const fileBuffer = await file.arrayBuffer();
    const originalChatId = formData.get('originalChatId') as string; // Get the original chat ID

    // 1. Upload to Vercel Blob
    const blobData = await put(originalFilename, fileBuffer, {
      access: 'public',
    });

    // Check if we need to embed the document
    const needToEmbed = formData.get('needToEmbed') === 'true';
    if (!needToEmbed) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Check if the file is embeddable
    const isEmbeddable =
      file.type.startsWith('text/') || file.type.startsWith('application/pdf');
    if (!isEmbeddable) {
      return NextResponse.json(
        { error: 'File is not embeddable' },
        { status: 400 },
      );
    }

    // Prepare data for createManagedFile, excluding auto-generated fields
    const tagsParam = formData.get('tags');
    let tags: string[] = [];
    if (tagsParam) {
      const parsedTags = JSON.parse(tagsParam as string);
      if (Array.isArray(parsedTags)) {
        tags = parsedTags.filter((tag) => typeof tag === 'string').slice(0, 10);

        // Save each tag to the tags table
        for (const tag of tags) {
          await createTagIfNotExists(tag, session.user.id);
        }
      }
    }

    const newFileData: NewManagedFile = {
      name: originalFilename,
      blobUrl: blobData.url,
      blobDownloadUrl: blobData.url,
      mimeType: file.type,
      size: file.size,
      aiSummary: null, // Initialize aiSummary as null
      tags: tags, // Use the processed tags array
      userId: session.user.id,
      originalChatId: originalChatId || null, // Store the original chat ID
    };

    // 2. Create initial record in our database
    const newDbFile = await createManagedFile(newFileData);

    if (!newDbFile) {
      // TODO: Optionally delete from Vercel Blob if DB insert fails
      return NextResponse.json(
        { error: 'Failed to save file metadata' },
        { status: 500 },
      );
    }

    // 3. Trigger Inngest background job for embedding
    await inngest.send({
      name: 'file/embed.requested', // Event name for Inngest function
      data: {
        managedFileId: newDbFile.id,
        name: newDbFile.name,
        blobUrl: newDbFile.blobUrl,
        blobDownloadUrl: newDbFile.blobDownloadUrl,
        mimeType: newDbFile.mimeType,
      },
      user: { id: session.user.id }, // Optional: pass user context to Inngest
    });

    // Return the blob data and our DB file record (or just a success message)
    return NextResponse.json({
      success: true,
      fileId: newDbFile.id,
      blob: blobData,
    });
  } catch (error) {
    let errorMessage = 'Failed to process request';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error('Upload API error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
