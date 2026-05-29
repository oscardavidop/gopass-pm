import { useEffect, useMemo, useRef } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Link2,
  Eraser,
  Code2,
} from 'lucide-react';

import { cn } from '@/utils/cn';
import { isRichTextEmpty, sanitizeRichText, stripRichText } from '@/utils/richText';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  className?: string;
  minHeightClassName?: string;
  maxLength?: number;
}

type ToolbarAction =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikeThrough'
  | 'insertUnorderedList'
  | 'insertOrderedList'
  | 'formatBlock';

export function RichTextEditor({
  value,
  onChange,
  label,
  placeholder = 'Write something...',
  error,
  className,
  minHeightClassName = 'min-h-[140px]',
  maxLength,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  const plainLength = useMemo(() => stripRichText(value).length, [value]);

  useEffect(() => {
    if (!editorRef.current) return;
    const current = editorRef.current.innerHTML;
    if (current !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const emitChange = () => {
    if (!editorRef.current) return;

    const next = sanitizeRichText(editorRef.current.innerHTML);
    if (maxLength && stripRichText(next).length > maxLength) {
      editorRef.current.innerHTML = value || '';
      return;
    }
    onChange(next);
  };

  const runCommand = (command: ToolbarAction, arg?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    if (command === 'formatBlock') {
      document.execCommand(command, false, arg ?? 'p');
    } else {
      document.execCommand(command, false);
    }
    emitChange();
  };

  const addLink = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const href = window.prompt('Link URL (https://...)');
    if (!href) return;
    document.execCommand('createLink', false, href.trim());
    emitChange();
  };

  const clearFormat = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand('removeFormat', false);
    document.execCommand('unlink', false);
    emitChange();
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <label className="text-sm font-medium">{label}</label>}

      <div
        className={cn(
          'rounded-xl border border-input bg-background/70 overflow-hidden',
          error && 'border-destructive',
        )}
      >
        <div className="flex items-center gap-1 border-b border-border/70 bg-card/70 px-2 py-1.5">
          <ToolbarButton onClick={() => runCommand('bold')} title="Bold">
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => runCommand('italic')} title="Italic">
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => runCommand('underline')} title="Underline">
            <Underline className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => runCommand('strikeThrough')} title="Strike">
            <Strikethrough className="h-3.5 w-3.5" />
          </ToolbarButton>

          <span className="mx-1 h-4 w-px bg-border" />

          <ToolbarButton onClick={() => runCommand('insertUnorderedList')} title="Bulleted list">
            <List className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => runCommand('insertOrderedList')} title="Numbered list">
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => runCommand('formatBlock', 'blockquote')} title="Quote">
            <Quote className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => runCommand('formatBlock', 'pre')} title="Code block">
            <Code2 className="h-3.5 w-3.5" />
          </ToolbarButton>

          <span className="mx-1 h-4 w-px bg-border" />

          <ToolbarButton onClick={addLink} title="Insert link">
            <Link2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={clearFormat} title="Clear formatting">
            <Eraser className="h-3.5 w-3.5" />
          </ToolbarButton>

          {maxLength && (
            <div className="ml-auto text-[10px] text-muted-foreground tabular-nums">
              {plainLength}/{maxLength}
            </div>
          )}
        </div>

        <div className="relative">
          {isRichTextEmpty(value) && (
            <p className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground/80">
              {placeholder}
            </p>
          )}

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={emitChange}
            onBlur={emitChange}
            onPaste={(e) => {
              e.preventDefault();
              const text = e.clipboardData.getData('text/plain');
              document.execCommand('insertText', false, text);
              emitChange();
            }}
            className={cn(
              'w-full px-3 py-2 text-sm outline-none leading-relaxed',
              minHeightClassName,
              'prose max-w-none',
              '[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
              '[&_pre]:rounded-md [&_pre]:bg-secondary/80 [&_pre]:p-2 [&_pre]:font-mono [&_pre]:text-xs',
              '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
              '[&_a]:text-primary [&_a]:underline',
            )}
          />
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}
