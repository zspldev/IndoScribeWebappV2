import { Mic, Upload } from 'lucide-react';

interface InputMethodSelectorProps {
  onSelect: (method: 'record' | 'upload') => void;
  disabled?: boolean;
}

export default function InputMethodSelector({ onSelect, disabled = false }: InputMethodSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-base font-medium">Step 2: Choose Input Method</label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Record Option */}
        <button
          onClick={() => onSelect('record')}
          disabled={disabled}
          className={`flex flex-col items-center gap-3 p-6 border-2 border-dashed rounded-lg transition-all
            ${disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:border-primary hover:bg-primary/5 cursor-pointer'
            }`}
          data-testid="button-select-record"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Mic className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-medium">Record Audio</p>
            <p className="text-sm text-muted-foreground">
              Record directly in your browser (up to 30 min)
            </p>
          </div>
        </button>

        {/* Upload Option */}
        <button
          onClick={() => onSelect('upload')}
          disabled={disabled}
          className={`flex flex-col items-center gap-3 p-6 border-2 border-dashed rounded-lg transition-all
            ${disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:border-primary hover:bg-primary/5 cursor-pointer'
            }`}
          data-testid="button-select-upload"
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-medium">Upload File</p>
            <p className="text-sm text-muted-foreground">
              Upload MP3, WAV, or M4A file (max 25MB, 30 min)
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
