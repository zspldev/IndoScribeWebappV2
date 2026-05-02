import { DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';

interface FileInfoProps {
  filename: string;
  duration?: number;
  onRemove?: () => void;
}

export default function FileInfo({ filename, duration, onRemove }: FileInfoProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 p-4 bg-muted rounded-lg" data-testid="file-info">
      <DocumentTextIcon className="w-5 h-5 text-primary flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate" data-testid="text-filename">
          {filename}
        </p>
        {duration !== undefined && (
          <p className="text-xs text-muted-foreground">
            Duration: {formatDuration(duration)}
          </p>
        )}
      </div>
      {onRemove && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="flex-shrink-0"
          data-testid="button-remove-file"
        >
          <XMarkIcon className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
