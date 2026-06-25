"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Eye, EyeOff, Save, Loader2, Code } from "lucide-react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import { MarkdownRenderer } from "@/components/markdown-renderer";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

interface FullscreenEditorProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  setContent: (val: string) => void;
  onSave?: () => void;
  saving?: boolean;
}

function stripModeFlag(content: string): string {
  if (content.startsWith("<!-- MODE:MARKDOWN -->\n")) {
    return content.replace("<!-- MODE:MARKDOWN -->\n", "");
  }
  if (content.startsWith("<!-- MODE:VISUAL -->\n")) {
    return content.replace("<!-- MODE:VISUAL -->\n", "");
  }
  return content;
}

export default function FullscreenEditor({
  isOpen,
  onClose,
  title,
  content,
  setContent,
  onSave,
  saving,
}: FullscreenEditorProps) {
  const [livePreview, setLivePreview] = useState(false);

  if (!isOpen) return null;

  const internalContent = stripModeFlag(content);
  const handleContentChange = (value: string) => {
    setContent("<!-- MODE:MARKDOWN -->\n" + value);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col animate-in fade-in zoom-in-95 duration-200">
      <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Editing Page</span>
            <span className="text-sm font-semibold text-foreground truncate max-w-[200px] md:max-w-[400px]">
              {title || "Untitled Page"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden md:flex items-center bg-muted p-1 rounded-lg border border-border mr-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-card text-foreground shadow-sm">
              <Code className="h-3.5 w-3.5" />
              Markdown
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setLivePreview(!livePreview)}
            className={cn(
              "gap-2",
              livePreview ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15" : "text-muted-foreground"
            )}
          >
            {livePreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="hidden md:inline">{livePreview ? "Exit Preview" : "Live Preview"}</span>
          </Button>

          {onSave && (
            <Button size="sm" onClick={onSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="hidden md:inline">Save Page</span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden bg-secondary/50">
        <div className={cn(
          "flex-1 flex flex-col transition-all duration-300",
          livePreview ? "hidden md:flex border-r border-border" : "flex"
        )}>
          <div className="flex-1 overflow-auto p-0 md:p-6 editor-fullscreen-container">
            <style>{`
              @media (min-width: 768px) {
                .editor-fullscreen-container .markdown-textarea {
                  border: 1px solid var(--border) !important;
                  border-radius: 0.75rem !important;
                  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
                }
              }
            `}</style>
            <div data-color-mode="light" className="h-full flex flex-col">
              <MDEditor
                value={internalContent}
                onChange={(value) => handleContentChange(value || "")}
                preview="edit"
                height="100%"
                className="flex-1 w-full border-0 shadow-none markdown-textarea"
              />
            </div>
          </div>
        </div>

        {livePreview && (
          <div className="flex-1 flex flex-col bg-card overflow-hidden animate-in slide-in-from-right-4 duration-300">
            <div className="h-10 border-b border-border bg-secondary flex items-center px-4 shrink-0">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Live Preview</span>
            </div>
            <div className="flex-1 overflow-y-auto p-8 md:p-12 prose prose-orange max-w-none">
              {internalContent ? (
                <MarkdownRenderer content={internalContent} />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground italic">
                  Start typing to see preview...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
