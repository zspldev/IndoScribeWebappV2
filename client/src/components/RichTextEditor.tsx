import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Search,
  FileText,
  Save
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  readOnly?: boolean;
  onSave?: () => void;
  lastSaved?: Date | null;
}

export default function RichTextEditor({
  value,
  onChange,
  language,
  readOnly = false,
  onSave,
  lastSaved
}: RichTextEditorProps) {
  const [fontSize, setFontSize] = useState(18);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const isDevanagari = language === 'hi-IN' || language === 'mr-IN';

  // Convert markdown to HTML for TipTap
  const markdownToHtml = (markdown: string): string => {
    let html = markdown;
    
    // Convert page breaks first
    html = html.replace(/---\s*PAGE BREAK\s*---/g, '<hr class="page-break" />');
    
    // Convert headings (must be at start of line)
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // Convert inline formatting (order matters - process in order of marker length)
    // Bold: **text**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italic: *text*
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Underline: __text__
    html = html.replace(/__([^_]+)__/g, '<u>$1</u>');
    // Strikethrough: ~~text~~
    html = html.replace(/~~([^~]+)~~/g, '<s>$1</s>');
    
    // Convert paragraphs (double newlines)
    html = html.split('\n\n').map(para => {
      if (para.trim() && !para.startsWith('<h') && !para.startsWith('<hr')) {
        return `<p>${para.replace(/\n/g, '<br>')}</p>`;
      }
      return para;
    }).join('');
    
    // Handle single newlines within content as line breaks
    html = html.replace(/\n/g, '<br>');
    
    return html || '<p></p>';
  };

  // Convert HTML back to markdown
  const htmlToMarkdown = (html: string): string => {
    let markdown = html;
    
    // Convert page breaks
    markdown = markdown.replace(/<hr[^>]*class="page-break"[^>]*\/?>/g, '\n\n--- PAGE BREAK ---\n\n');
    markdown = markdown.replace(/<hr[^>]*\/?>/g, '\n\n--- PAGE BREAK ---\n\n');
    
    // Convert headings
    markdown = markdown.replace(/<h1[^>]*>([^<]+)<\/h1>/g, '# $1\n');
    markdown = markdown.replace(/<h2[^>]*>([^<]+)<\/h2>/g, '## $1\n');
    markdown = markdown.replace(/<h3[^>]*>([^<]+)<\/h3>/g, '### $1\n');
    
    // Convert inline formatting
    markdown = markdown.replace(/<strong>([^<]+)<\/strong>/g, '**$1**');
    markdown = markdown.replace(/<b>([^<]+)<\/b>/g, '**$1**');
    markdown = markdown.replace(/<em>([^<]+)<\/em>/g, '*$1*');
    markdown = markdown.replace(/<i>([^<]+)<\/i>/g, '*$1*');
    markdown = markdown.replace(/<u>([^<]+)<\/u>/g, '__$1__');
    markdown = markdown.replace(/<s>([^<]+)<\/s>/g, '~~$1~~');
    markdown = markdown.replace(/<strike>([^<]+)<\/strike>/g, '~~$1~~');
    
    // Convert paragraphs and line breaks
    markdown = markdown.replace(/<\/p><p>/g, '\n\n');
    markdown = markdown.replace(/<p>/g, '');
    markdown = markdown.replace(/<\/p>/g, '\n');
    markdown = markdown.replace(/<br\s*\/?>/g, '\n');
    
    // Clean up extra whitespace
    markdown = markdown.replace(/\n{3,}/g, '\n\n');
    markdown = markdown.trim();
    
    return markdown;
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Underline,
      Placeholder.configure({
        placeholder: 'Transcribed text will appear here...'
      })
    ],
    content: markdownToHtml(value),
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const markdown = htmlToMarkdown(html);
      onChange(markdown);
    }
  });

  // Update editor content when value changes externally
  useEffect(() => {
    if (editor && value) {
      const currentHtml = editor.getHTML();
      const currentMarkdown = htmlToMarkdown(currentHtml);
      
      // Only update if the content actually changed (avoid infinite loops)
      if (currentMarkdown !== value) {
        const newHtml = markdownToHtml(value);
        editor.commands.setContent(newHtml, { emitUpdate: false });
      }
    }
  }, [value, editor]);

  // Calculate stats
  const text = editor?.getText() || '';
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;
  const lineCount = text.split('\n').length;
  const pageBreakCount = (value.match(/--- PAGE BREAK ---/g) || []).length;

  const insertPageBreak = useCallback(() => {
    if (editor) {
      editor.chain().focus().setHorizontalRule().run();
    }
  }, [editor]);

  const handleFindReplace = () => {
    if (!searchTerm || !editor) return;
    
    const replaceTerm = prompt(`Replace "${searchTerm}" with:`, '');
    if (replaceTerm !== null) {
      const html = editor.getHTML();
      const newHtml = html.replaceAll(searchTerm, replaceTerm);
      editor.commands.setContent(newHtml);
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-base font-medium">Step 4: Edit & Save</span>
          {lastSaved && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Save className="w-3 h-3" />
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {lineCount} lines · {wordCount} words · {charCount} chars
          {pageBreakCount > 0 && ` · ${pageBreakCount} page breaks`}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-muted rounded-md flex-wrap">
        {/* Undo/Redo */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo() || readOnly}
          data-testid="button-undo"
          title="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo() || readOnly}
          data-testid="button-redo"
          title="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Text formatting */}
        <Button
          size="sm"
          variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={readOnly}
          data-testid="button-bold"
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={readOnly}
          data-testid="button-italic"
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive('underline') ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          disabled={readOnly}
          data-testid="button-underline"
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive('strike') ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={readOnly}
          data-testid="button-strikethrough"
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Headings */}
        <Button
          size="sm"
          variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          disabled={readOnly}
          data-testid="button-h1"
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={readOnly}
          data-testid="button-h2"
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          disabled={readOnly}
          data-testid="button-h3"
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Font size */}
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

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Page break */}
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

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Search */}
        <Button
          size="sm"
          variant={showSearch ? 'secondary' : 'ghost'}
          onClick={() => setShowSearch(!showSearch)}
          data-testid="button-search"
          title="Find and replace"
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* Manual save button */}
        {onSave && (
          <>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button
              size="sm"
              variant="ghost"
              onClick={onSave}
              disabled={readOnly}
              data-testid="button-save"
              title="Save now"
            >
              <Save className="h-4 w-4" />
            </Button>
          </>
        )}
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
      <div 
        className={`prose prose-sm max-w-none border rounded-md p-4 min-h-[400px] focus-within:ring-2 focus-within:ring-ring ${
          isDevanagari ? 'font-devanagari' : ''
        }`}
        style={{ fontSize: `${fontSize}px` }}
      >
        <EditorContent 
          editor={editor} 
          className="outline-none"
          data-testid="rich-text-editor"
        />
      </div>

      {/* Tips */}
      {pageBreakCount > 0 && (
        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
          Page breaks (horizontal lines) will create actual page breaks in the downloaded Word document.
        </div>
      )}
    </div>
  );
}
