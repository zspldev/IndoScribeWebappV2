import { useCallback, useState } from 'react';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

export default function FileUploadZone({ onFileSelect, onError, disabled }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const validateAndSelect = useCallback((file: File) => {
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      onError?.("File size exceeds 25MB limit");
      return;
    }
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (audio.duration && audio.duration > 1800) {
        onError?.("Audio file exceeds maximum duration of 30 minutes");
      } else {
        onFileSelect(file);
      }
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      onFileSelect(file);
    };
    audio.src = url;
  }, [onFileSelect, onError]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;

    const file = e.dataTransfer.files[0];
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/mp4', 'audio/x-m4a'];
    if (file && allowedTypes.includes(file.type)) {
      validateAndSelect(file);
    }
  }, [disabled, validateAndSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSelect(file);
    }
  }, [validateAndSelect]);

  return (
    <div className="space-y-2">
      <label className="text-base font-medium">Step 2: Upload Audio File</label>
      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          isDragging 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50 hover:bg-primary/5'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-testid="dropzone-upload"
      >
        <input
          type="file"
          accept="audio/mpeg,audio/wav,audio/mp4,.mp3,.wav,.m4a"
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
          disabled={disabled}
          data-testid="input-file"
        />
        <label htmlFor="file-upload" className={disabled ? 'cursor-not-allowed' : 'cursor-pointer'}>
          <CloudArrowUpIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-base font-medium text-foreground mb-1">
            Drag & drop audio file or click to browse
          </p>
          <p className="text-sm text-muted-foreground">
            MP3, WAV, or M4A format, max 25MB / 30 minutes
          </p>
        </label>
      </div>
    </div>
  );
}
