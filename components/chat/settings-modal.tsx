'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/toast';

interface SettingsModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  isFirstTime: boolean;
  onSettingsSaved: () => void; // Callback to indicate settings have been saved (and first-time flag should be set)
}

export const OPENAI_API_KEY_STORAGE_KEY = 'openai_api_key';
export const X_AI_API_KEY_STORAGE_KEY = 'x_ai_api_key';

export function SettingsModal({
  isOpen,
  onOpenChange,
  isFirstTime,
  onSettingsSaved,
}: SettingsModalProps) {
  const [openAiApiKey, setOpenAiApiKey] = useState('');
  const [xAiApiKey, setXAiApiKey] = useState('');

  useEffect(() => {
    const storedOpenAiKey = localStorage.getItem(OPENAI_API_KEY_STORAGE_KEY);
    const storedXAiKey = localStorage.getItem(X_AI_API_KEY_STORAGE_KEY);
    if (storedOpenAiKey) {
      setOpenAiApiKey(storedOpenAiKey);
    }
    if (storedXAiKey) {
      setXAiApiKey(storedXAiKey);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem(OPENAI_API_KEY_STORAGE_KEY, openAiApiKey);
    localStorage.setItem(X_AI_API_KEY_STORAGE_KEY, xAiApiKey);
    toast({
      type: 'success',
      description: 'API keys saved successfully.',
    });
    onOpenChange(false);
    onSettingsSaved();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isFirstTime ? 'Welcome! Setup Your API Keys' : 'Settings'}
          </DialogTitle>
          <DialogDescription>
            {isFirstTime
              ? 'To get started, please enter your API keys. These will be stored locally in your browser and are used for chat and embedding functionalities.'
              : 'Manage your API keys for chat and embedding. These are stored locally.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="openai-key" className="text-right">
              OpenAI API Key
            </Label>
            <Input
              id="openai-key"
              value={openAiApiKey}
              onChange={(e) => setOpenAiApiKey(e.target.value)}
              placeholder="sk-..."
              className="col-span-3"
              type="password"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="xai-key" className="text-right">
              X AI API Key
            </Label>
            <Input
              id="xai-key"
              value={xAiApiKey}
              onChange={(e) => setXAiApiKey(e.target.value)}
              placeholder="Your X AI API Key"
              className="col-span-3"
              type="password"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
