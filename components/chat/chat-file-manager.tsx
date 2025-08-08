'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileTextIcon, PlusIcon, XIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { FileUploadModal } from '@/components/file-manager/file-upload-modal';
import { fetcher } from '@/lib/utils';
import type { DBManagedFileType } from '@/lib/db/schema';

interface ChatFileManagerProps {
  chatId: string;
  userId: string;
}

export function ChatFileManager({ chatId, userId }: ChatFileManagerProps) {
  const [chatFiles, setChatFiles] = useState<any[]>([]);
  const [allFiles, setAllFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [embeddingProgress, setEmbeddingProgress] = useState<
    Record<string, number>
  >({});

  // Fetch chat-specific files and all user files
  const fetchFiles = async () => {
    try {
      console.log('=== FETCHING FILES FOR CHAT:', chatId, '===');

      const [chatFilesData, allFilesData] = await Promise.all([
        fetcher(`/api/files/chat/${chatId}`),
        fetcher(`/api/files`),
      ]);

      console.log('Chat files data:', chatFilesData);
      console.log('All files data:', allFilesData);
      console.log(
        'All file names:',
        allFilesData.map((f: any) => f.name),
      );

      // Get the IDs of files that are already in this chat
      const chatFileIds = new Set(chatFilesData.map((file: any) => file.id));
      console.log('Chat file IDs:', Array.from(chatFileIds));

      // Get the names of files that are already in this chat
      const chatFileNames = new Set(
        chatFilesData.map((file: any) => file.name),
      );
      console.log('Chat file names:', Array.from(chatFileNames));

      // Check if any files in allFilesData have names containing "Zac" or "compressed"
      const zacFiles = allFilesData.filter(
        (f: any) =>
          f.name.toLowerCase().includes('zac') ||
          f.name.toLowerCase().includes('compressed'),
      );
      console.log('Files with "Zac" or "compressed" in name:', zacFiles);

      // Show files that were originally uploaded to this chat but are not currently in the chat
      const filesOriginallyUploadedToThisChat = allFilesData.filter(
        (f: any) => f.originalChatId === chatId,
      );
      console.log(
        'Files originally uploaded to this chat:',
        filesOriginallyUploadedToThisChat,
      );

      // Files that are available to add (originally uploaded to this chat but not currently in chat)
      const availableFiles = filesOriginallyUploadedToThisChat.filter(
        (file: any) =>
          !chatFilesData.some((chatFile: any) => chatFile.id === file.id),
      );
      console.log(
        'Available files (originally uploaded but not in chat):',
        availableFiles,
      );
      console.log(
        'Available file names (originally uploaded but not in chat):',
        availableFiles.map((f: any) => f.name),
      );

      // Deduplicate available files by ID (show only unique files)
      const uniqueAvailableFiles = availableFiles.filter(
        (file: any, index: number, self: any[]) =>
          index === self.findIndex((f: any) => f.id === file.id),
      );
      console.log('Unique available files:', uniqueAvailableFiles);
      console.log(
        'Unique available file names:',
        uniqueAvailableFiles.map((f: any) => f.name),
      );

      setChatFiles(chatFilesData);
      setAllFiles(uniqueAvailableFiles);

      console.log('=== END FETCHING FILES ===');
    } catch (error) {
      console.error('Failed to fetch files:', error);
      // Set empty arrays on error to prevent showing wrong data
      setChatFiles([]);
      setAllFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [chatId]);

  const addFileToChat = async (fileId: string) => {
    try {
      console.log('=== ADDING FILE TO CHAT ===');
      console.log('Chat ID:', chatId);
      console.log('File ID:', fileId);

      const result = await fetcher(`/api/files/chat/${chatId}`, {
        method: 'POST',
        body: JSON.stringify({ fileId }),
      });

      console.log('Add file result:', result);

      if (result.success) {
        console.log('✅ File successfully added to chat');
      } else {
        console.log('❌ Failed to add file to chat:', result.error);
      }

      await fetchFiles(); // Refresh the list
    } catch (error) {
      console.error('Failed to add file to chat:', error);
    }
  };

  const removeFileFromChat = async (fileId: string) => {
    try {
      await fetcher(`/api/files/chat/${chatId}`, {
        method: 'DELETE',
        body: JSON.stringify({ fileId }),
      });
      await fetchFiles(); // Refresh the list
    } catch (error) {
      console.error('Failed to remove file from chat:', error);
    }
  };

  const handleFileUploadSuccess = async (fileId: string) => {
    setIsUploadModalOpen(false);

    // Automatically add the uploaded file to this chat
    try {
      await addFileToChat(fileId);
    } catch (error) {
      console.error('Failed to add uploaded file to chat:', error);
    }

    fetchFiles(); // Refresh the list
  };

  const linkExistingFiles = async () => {
    try {
      console.log('=== LINKING ORIGINALLY UPLOADED FILES ===');

      // Get files that were originally uploaded to this chat
      const filesOriginallyUploadedToThisChat = allFiles.filter(
        (file: any) => file.originalChatId === chatId,
      );

      console.log(
        'Files originally uploaded to this chat:',
        filesOriginallyUploadedToThisChat,
      );

      if (filesOriginallyUploadedToThisChat.length === 0) {
        console.log('No files were originally uploaded to this chat');
        return;
      }

      // Filter out files that are already linked to this chat
      const filesNotLinked = filesOriginallyUploadedToThisChat.filter(
        (file: any) =>
          !chatFiles.some((chatFile: any) => chatFile.id === file.id),
      );

      console.log(
        'Files originally uploaded but not linked:',
        filesNotLinked.map((f: any) => f.name),
      );

      if (filesNotLinked.length === 0) {
        console.log('All originally uploaded files are already linked');
        return;
      }

      // Add each file to the chat
      let linkedCount = 0;
      for (const file of filesNotLinked) {
        const response = await fetch(`/api/files/chat/${chatId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileId: file.id }),
        });

        if (response.ok) {
          linkedCount++;
        }
      }

      console.log(`✅ Linked ${linkedCount} originally uploaded files to chat`);
      // Refresh the files list
      await fetchFiles();
    } catch (error) {
      console.error('Error linking files:', error);
    }
  };

  const checkFileStatus = async () => {
    try {
      const response = await fetch(`/api/debug/file-status?chatId=${chatId}`);
      const data = await response.json();
      console.log('=== FILE STATUS DEBUG ===');
      console.log('Chat ID:', chatId);
      console.log('File Status Data:', data);

      // Update embedding progress
      const newProgress: Record<string, number> = {};
      data.chatFiles.forEach((file: any) => {
        if (!file.isEmbedded) {
          // Simulate progress for unembedded files
          newProgress[file.id] = Math.min(
            (embeddingProgress[file.id] || 0) + 10,
            90,
          );
        }
      });
      setEmbeddingProgress(newProgress);

      // Show alert with summary
      alert(`File Status:
Chat Files: ${data.summary.totalChatFiles}
Embedded: ${data.summary.embeddedChatFiles}
Total User Files: ${data.summary.totalUserFiles}
Embedded: ${data.summary.embeddedUserFiles}`);
    } catch (error) {
      console.error('Error checking file status:', error);
    }
  };

  // Monitor embedding progress for unembedded files
  useEffect(() => {
    const unembeddedFiles = chatFiles.filter((file) => !file.isEmbedded);
    if (unembeddedFiles.length === 0) return;

    const interval = setInterval(() => {
      setEmbeddingProgress((prev) => {
        const newProgress = { ...prev };
        unembeddedFiles.forEach((file) => {
          if (!file.isEmbedded) {
            newProgress[file.id] = Math.min(
              (newProgress[file.id] || 0) + 5,
              90,
            );
          }
        });
        return newProgress;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [chatFiles]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileTextIcon className="h-5 w-5" />
            Chat Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading files...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileTextIcon className="h-5 w-5" />
            Chat Files ({chatFiles.length})
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={linkExistingFiles}
              disabled={isLoading}
            >
              Link Originally Uploaded Files
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={checkFileStatus}
              disabled={isLoading}
            >
              Check File Status
            </Button>
            <Dialog
              open={isUploadModalOpen}
              onOpenChange={setIsUploadModalOpen}
            >
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Files
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Files to Chat</DialogTitle>
                  <DialogDescription>
                    Upload new files or add existing files to this chat for
                    context-aware conversations.
                  </DialogDescription>
                </DialogHeader>
                <FileUploadModal
                  isOpen={isUploadModalOpen}
                  onOpenChange={setIsUploadModalOpen}
                  onUploadSuccess={handleFileUploadSuccess}
                  chatId={chatId}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chatFiles.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No files added to this chat yet. Upload files to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {/* Deduplicate files by ID before rendering */}
            {chatFiles
              .filter(
                (file, index, self) =>
                  index === self.findIndex((f) => f.id === file.id),
              )
              .map((file, index) => (
                <div
                  key={`${file.id}-${index}`}
                  className="flex items-center justify-between p-2 border rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{file.name}</span>
                    {file.tags && file.tags.length > 0 && (
                      <div className="flex gap-1">
                        {file.tags.slice(0, 2).map((tag: string) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {file.tags.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{file.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Embedding Status */}
                    {!file.isEmbedded && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="w-16 bg-muted rounded-full h-1">
                          <div
                            className="bg-primary h-1 rounded-full transition-all duration-300"
                            style={{
                              width: `${embeddingProgress[file.id] || 0}%`,
                            }}
                          />
                        </div>
                        <span>Processing...</span>
                      </div>
                    )}
                    {file.isEmbedded && (
                      <Badge
                        variant="outline"
                        className="text-xs text-green-600"
                      >
                        ✓ Embedded
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFileFromChat(file.id)}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {allFiles.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Available Files</h4>
            <div className="space-y-2">
              {allFiles
                .filter(
                  (file, index, self) =>
                    index === self.findIndex((f) => f.id === file.id),
                )
                .filter(
                  (file) =>
                    !chatFiles.some((chatFile) => chatFile.id === file.id),
                )
                .map((file, index) => (
                  <div
                    key={`${file.id}-${index}`}
                    className="flex items-center justify-between p-2 border rounded-md bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{file.name}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => addFileToChat(file.id)}
                    >
                      <PlusIcon className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
