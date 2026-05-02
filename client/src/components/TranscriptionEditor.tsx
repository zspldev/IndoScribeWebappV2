import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  Undo2, 
  Redo2, 
  WrapText, 
  ZoomIn, 
  ZoomOut, 
  Search,
  FileText
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface TranscriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  readOnly?: boolean;
}

export default function TranscriptionEditor({ 
  value, 
  onChange, 
  language,
  readOnly = false 
}: TranscriptionEditorProps) {
  const [history, setHistory] = useState<string[]>([value]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [wrapText, setWrapText] = useState(true);
  const [fontSize, setFontSize] = useState(18);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const isDevanagari = language === 'hi-IN' || language === 'mr-IN';
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = value.length;
  const lineCount = value.split('\n').length;
  const pageBreakCount = (value.match(/--- PAGE BREAK ---/g) || []).length;

  const handleChange = (newValue: string) => {
    // Update history for undo/redo
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newValue);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    onChange(newValue);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onChange(history[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onChange(history[newIndex]);
    }
  };

  const handleFindReplace = () => {
    if (!searchTerm) return;
    
    const replaceTerm = prompt(`Replace "${searchTerm}" with:`, '');
    if (replaceTerm !== null) {
      const newValue = value.replaceAll(searchTerm, replaceTerm);
      handleChange(newValue);
    }
  };

  const insertPageBreak = () => {
    const textarea = document.getElementById('transcription-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = value.substring(0, start);
    const after = value.substring(end);
    const newValue = before + '\n\n--- PAGE BREAK ---\n\n' + after;
    
    handleChange(newValue);
    
    // Set cursor position after the page break
    setTimeout(() => {
      const newPosition = start + '\n\n--- PAGE BREAK ---\n\n'.length;
      textarea.setSelectionRange(newPosition, newPosition);
      textarea.focus();
    }, 0);
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label htmlFor="transcription-editor" className="text-base font-medium">
          Step 4: Edit & Save
        </Label>
        <div className="text-xs text-muted-foreground">
          {lineCount} lines · {wordCount} words · {charCount} chars
          {pageBreakCount > 0 && ` · ${pageBreakCount} page breaks`}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-muted rounded-md flex-wrap">
        {/* Undo/Redo */}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleUndo}
          disabled={historyIndex <= 0 || readOnly}
          data-testid="button-undo"
          title="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRedo}
          disabled={historyIndex >= history.length - 1 || readOnly}
          data-testid="button-redo"
          title="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Font size controls */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setFontSize(Math.max(12, fontSize - 2))}
          data-testid="button-decrease-font"
          title="Decrease font size"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground min-w-8 text-center">
          {fontSize}px
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setFontSize(Math.min(32, fontSize + 2))}
          data-testid="button-increase-font"
          title="Increase font size"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Text wrap toggle */}
        <Button
          size="sm"
          variant={wrapText ? "secondary" : "ghost"}
          onClick={() => setWrapText(!wrapText)}
          data-testid="button-wrap-text"
          title={wrapText ? "Disable text wrap" : "Enable text wrap"}
        >
          <WrapText className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Insert page break */}
        <Button
          size="sm"
          variant="ghost"
          onClick={insertPageBreak}
          disabled={readOnly}
          data-testid="button-insert-page-break"
          title="Insert page break"
        >
          <FileText className="h-4 w-4 mr-1" />
          Page Break
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Search */}
        <Button
          size="sm"
          variant={showSearch ? "secondary" : "ghost"}
          onClick={() => setShowSearch(!showSearch)}
          data-testid="button-search"
          title="Find and replace"
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="flex gap-2 p-2 bg-muted rounded-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Find..."
            className="flex-1 px-3 py-1 text-sm rounded-md bg-background border"
            data-testid="input-search"
          />
          <Button
            size="sm"
            onClick={handleFindReplace}
            disabled={!searchTerm || readOnly}
            data-testid="button-replace"
          >
            Replace All
          </Button>
        </div>
      )}

      {/* Editor */}
      <div className="relative">
        <Textarea
          id="transcription-editor"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className={`min-h-[400px] leading-relaxed resize-none ${
            isDevanagari ? 'font-devanagari' : ''
          } ${wrapText ? '' : 'whitespace-pre overflow-x-auto'}`}
          style={{ fontSize: `${fontSize}px` }}
          placeholder="Transcribed text will appear here..."
          readOnly={readOnly}
          data-testid="textarea-transcription"
        />
        
        {/* Page break indicators overlay */}
        {pageBreakCount > 0 && (
          <div className="mt-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            💡 Tip: Page breaks appear as "--- PAGE BREAK ---" in the editor and will create actual page breaks in the downloaded Word document.
          </div>
        )}
      </div>
    </div>
  );
}
