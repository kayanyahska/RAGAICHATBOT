'use client';

import React, { useState, } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileTextIcon,
  ChevronDownIcon,
  BookOpenIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Define the structure of the source data based on the provided JSON
export interface SourceDataProviderMetadata {
  page?: number;
  text?: string;
  fileId?: string;
  userId?: string;
  blobUrl?: string;
  fileName?: string;
  mimeType?: string;
  documentTitle?: string;
  sectionSummary?: string;
  blobDownloadUrl?: string;
  excerptKeywords?: string;
  questionsThisExcerptCanAnswer?: string;
}

export interface SourceDataType {
  id: string;
  url: string;
  providerMetadata?: SourceDataProviderMetadata;
}

interface SourceCardProps {
  source: SourceDataType;
  citationNumber: number;
  onViewSource: (fileUrl: string, title?: string) => void;
  className?: string;
}

export const SourceCard: React.FC<SourceCardProps> = ({
  source,
  citationNumber,
  onViewSource,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const { page, text, blobUrl, fileName, documentTitle, mimeType } =
    source.providerMetadata || {};

  const displayTitle = documentTitle || fileName || 'Untitled Source';
  const viewableUrl = `${blobUrl}#page=${page}` || source.url;

  const handleViewSourceClick = () => {
    onViewSource(viewableUrl, displayTitle);
  };

  return (
    <Card className={`${className} mb-2 shadow-sm source-card`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-sm">
                {citationNumber}
              </Badge>
              <FileTextIcon className="h-5 w-5 text-muted-foreground" />
              <CardTitle
                className="text-base font-medium leading-none cursor-pointer hover:underline"
                onClick={handleViewSourceClick}
              >
                {displayTitle}
              </CardTitle>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-9 p-0">
                <ChevronDownIcon
                  className={`h-4 w-4 transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
                <span className="sr-only">Toggle details</span>
              </Button>
            </CollapsibleTrigger>
          </div>
          {(fileName || page) && (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              {fileName && <span>{fileName}</span>}
              {fileName && page && <span>&bull;</span>}
              {page && <span>Page {page}</span>}
            </div>
          )}
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="p-4 pt-0 max-w-[37.5vw]">
            {text && (
              <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">
                {text}
              </p>
            )}
            {source.providerMetadata?.text && (
              <p className="text-sm text-muted-foreground mb-3 truncate">
                <strong>Snippet:</strong> {source.providerMetadata.text}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewSourceClick}
              className="text-xs"
            >
              <BookOpenIcon className="mr-2 h-3.5 w-3.5" />
              View Source
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
