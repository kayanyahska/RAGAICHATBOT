'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Loader2, UploadCloudIcon, AlertCircle, X } from 'lucide-react';
import { Badge } from '../ui/badge';

export interface FileUploadModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess: (fileId: string) => void;
  chatId?: string; // Add optional chatId prop
}

export function FileUploadModal({
  isOpen,
  onOpenChange,
  onUploadSuccess,
  chatId,
}: FileUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [embeddingProgress, setEmbeddingProgress] = useState(0);
  const [embeddingStatus, setEmbeddingStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const embeddingCheckInterval = useRef<NodeJS.Timeout | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) {
      setSelectedFile(event.target.files[0]);
      setError(null); // Clear previous errors
    } else {
      setSelectedFile(null);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      // Prevent adding duplicate tags
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const checkEmbeddingStatus = async (fileId: string) => {
    try {
      const response = await fetch(
        `/api/debug/file-status?chatId=${chatId || 'none'}`,
      );
      const data = await response.json();

      // Find the specific file
      const file = data.allUserFiles.find((f: any) => f.id === fileId);

      if (file) {
        if (file.isEmbedded) {
          // File is embedded, stop checking and close modal
          setEmbeddingProgress(100);
          setEmbeddingStatus('Embedding completed successfully!');
          setIsEmbedding(false);

          if (embeddingCheckInterval.current) {
            clearInterval(embeddingCheckInterval.current);
            embeddingCheckInterval.current = null;
          }

          // Wait a moment to show completion, then close
          setTimeout(() => {
            onUploadSuccess(fileId);
            handleClose();
          }, 1500);

          return true;
        } else {
          // File is not embedded yet, continue checking
          setEmbeddingProgress(Math.min(embeddingProgress + 10, 90));
          setEmbeddingStatus('Processing file content...');
          return false;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking embedding status:', error);
      return false;
    }
  };

  const startEmbeddingProgress = (fileId: string) => {
    setUploadedFileId(fileId);
    setIsEmbedding(true);
    setEmbeddingProgress(10);
    setEmbeddingStatus('Starting embedding process...');

    // Check embedding status every 2 seconds
    embeddingCheckInterval.current = setInterval(async () => {
      const isComplete = await checkEmbeddingStatus(fileId);
      if (isComplete) {
        // Interval will be cleared in checkEmbeddingStatus
        return;
      }
    }, 2000);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('needToEmbed', 'true'); // As per your API requirement

    // Add chatId if provided
    if (chatId) {
      formData.append('originalChatId', chatId);
    }

    // Add tags to the request
    if (tags.length > 0) {
      formData.append('tags', JSON.stringify(tags));
    }

    try {
      const response = await fetch('/api/files/upload', {
        // Your API endpoint
        method: 'POST',
        body: formData,
        // Headers are not strictly necessary for FormData by default fetch
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      if (result.success && result.fileId) {
        // Start embedding progress tracking instead of immediately closing
        startEmbeddingProgress(result.fileId);
        setIsUploading(false);
      } else {
        throw new Error(
          result.error || 'Upload completed but no file ID returned.',
        );
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'An unexpected error occurred during upload.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    // Clean up embedding check interval
    if (embeddingCheckInterval.current) {
      clearInterval(embeddingCheckInterval.current);
      embeddingCheckInterval.current = null;
    }

    setSelectedFile(null);
    setIsUploading(false);
    setIsEmbedding(false);
    setEmbeddingProgress(0);
    setEmbeddingStatus('');
    setError(null);
    setTags([]);
    setTagInput('');
    setUploadedFileId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Reset file input
    }
    onOpenChange(false);
  };

  useEffect(() => {
    return () => {
      if (embeddingCheckInterval.current) {
        clearInterval(embeddingCheckInterval.current);
        embeddingCheckInterval.current = null;
      }
    };
  }, []);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <UploadCloudIcon className="mr-2 h-5 w-5" /> Upload New File
          </DialogTitle>
          <DialogDescription>
            Select a file from your computer to upload. Supported types include
            PDF, DOCX, TXT, etc.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <Label htmlFor="file-upload" className="sr-only">
              Choose file
            </Label>
            <Input
              id="file-upload"
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={isUploading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 dark:file:bg-primary/20 dark:file:text-primary dark:hover:file:bg-primary/30 cursor-pointer"
            />
          </div>
          <div>
            <Label htmlFor="tags" className="block text-sm font-medium mb-1">
              Tags (optional)
            </Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <Badge key={tag} className="gap-1 px-2 py-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-xs rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              id="tags"
              type="text"
              placeholder="Add tags and press Enter"
              ref={tagInputRef}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              disabled={isUploading}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Add tags to help organize your files. Press Enter to add each tag.
            </p>
          </div>
          {selectedFile && (
            <div className="text-sm text-muted-foreground">
              Selected file: {selectedFile.name} (
              {(selectedFile.size / 1024).toFixed(1)} KB)
            </div>
          )}

          {/* Embedding Progress */}
          {isEmbedding && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Processing File</span>
                <span className="text-muted-foreground">
                  {embeddingProgress}%
                </span>
              </div>
              <Progress value={embeddingProgress} className="w-full" />
              <div className="text-sm text-muted-foreground">
                {embeddingStatus}
              </div>
              <div className="text-xs text-muted-foreground">
                This may take a few minutes for large files. The dialog will
                close automatically when complete.
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded-md">
              <AlertCircle className="mr-2 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isUploading || isEmbedding}
              >
                {isEmbedding ? 'Processing...' : 'Cancel'}
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isUploading || isEmbedding || !selectedFile}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                </>
              ) : isEmbedding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />{' '}
                  Processing...
                </>
              ) : (
                'Upload File'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
