"use client";

import React, { useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";
import { Loader2, Maximize2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MermaidChartProps {
  code: string;
  isStreaming?: boolean;
  variant?: "default" | "chat";
}

export function MermaidChart({ code, isStreaming = false, variant = "default" }: MermaidChartProps) {
  const { resolvedTheme } = useTheme();
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const hasRenderedRef = useRef(false);

  // Interaction state for the fullscreen canvas
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Listen to wheel zoom events inside the dialog canvas wrapper
  useEffect(() => {
    if (!isOpen) return;
    
    const wrapper = canvasWrapperRef.current;
    if (!wrapper) return;

    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = 0.05;
      setScale((prevScale) => {
        const nextScale = prevScale - e.deltaY * zoomFactor * 0.01;
        return Math.min(Math.max(nextScale, 0.3), 5);
      });
    };

    wrapper.addEventListener("wheel", handleWheelEvent, { passive: false });
    return () => {
      wrapper.removeEventListener("wheel", handleWheelEvent);
    };
  }, [isOpen, svg]);

  useEffect(() => {
    if (!isClient) return;

    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    async function renderDiagram() {
      if (!hasRenderedRef.current) {
        setIsInitializing(true);
      }

      try {
        const mermaid = (await import("mermaid")).default;
        const isDark = resolvedTheme === "dark";

        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? "dark" : "default",
          securityLevel: "strict",
          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
          themeVariables: {
            background: "transparent",
            primaryColor: isDark ? "#f2f0ef" : "#18181b",
            textColor: isDark ? "#fafaf9" : "#09090b",
            lineColor: isDark ? "#44403c" : "#e4e4e7",
          }
        });

        // Test syntax parsing
        try {
          await mermaid.parse(code);
        } catch (parseErr) {
          if (isMounted) {
            if (!isStreaming) {
              const errMsg = parseErr instanceof Error ? parseErr.message : "Invalid Mermaid syntax";
              setError(errMsg);
            }
            setIsInitializing(false);
          }
          return;
        }

        const renderId = "mermaid-render-" + Math.random().toString(36).slice(2, 11);
        let { svg: renderedSvg } = await mermaid.render(renderId, code);

        const svgOpenTagMatch = renderedSvg.match(/<svg[^>]*>/i);
        if (svgOpenTagMatch) {
          let svgOpenTag = svgOpenTagMatch[0];
          svgOpenTag = svgOpenTag
            .replace(/\bstyle="[^"]*"/gi, "")
            .replace(/\bwidth="[^"]*"/gi, "")
            .replace(/\bheight="[^"]*"/gi, "");
          
          svgOpenTag = svgOpenTag.replace(
            /<svg/i, 
            '<svg width="100%" height="auto" style="max-width: 100%; display: block;"'
          );
          
          renderedSvg = renderedSvg.replace(svgOpenTagMatch[0], svgOpenTag);
        }

        if (isMounted) {
          setSvg(renderedSvg);
          hasRenderedRef.current = true;
          setError(null);
          setIsInitializing(false);
        }
      } catch (err) {
        console.error("Mermaid rendering failed:", err);
        if (!isStreaming && isMounted) {
          const errMsg = err instanceof Error ? err.message : "Failed to render Mermaid diagram";
          setError(errMsg);
          setIsInitializing(false);
        }
      }
    }

    if (isStreaming) {
      timeoutId = setTimeout(renderDiagram, 200);
    } else {
      renderDiagram();
    }

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [code, resolvedTheme, isClient, isStreaming]);

  // Drag handlers for movable canvas
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      dragStartRef.current = { x: touch.clientX - position.x, y: touch.clientY - position.y };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStartRef.current.x,
        y: touch.clientY - dragStartRef.current.y
      });
    }
  };

  const resetCanvas = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  if (!isClient) {
    return null;
  }

  const showFallbackCode = error !== null && (!svg || !isStreaming);

  if (showFallbackCode) {
    return (
      <pre className="bg-transparent text-foreground/70 border-0 p-2 overflow-x-auto text-xs font-mono my-2 w-full">
        <code className="!bg-transparent !p-0 !text-inherit !font-normal">{code}</code>
      </pre>
    );
  }

  if (isInitializing && !svg) {
    return (
      <div className="p-4 flex flex-col justify-center items-center gap-2 bg-transparent min-h-[100px] w-full">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/60" />
      </div>
    );
  }

  const isChat = variant === "chat";

  return (
    <div className={cn(
      "w-full border border-border/10 rounded-xl bg-card/5 overflow-hidden my-3 shadow-xs relative group",
      isChat && "max-w-full"
    )}>
      {/* Absolute floating Fullscreen Button at top-right */}
      <button
        onClick={() => {
          resetCanvas();
          setIsOpen(true);
        }}
        className="absolute top-2.5 right-2.5 z-10 p-1.5 bg-background/80 hover:bg-accent rounded-md border border-border/30 text-muted-foreground hover:text-foreground opacity-100 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer shadow-xs"
        title="View Fullscreen"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>

      {/* Content Area */}
      <div className="relative w-full">
        <div
          onClick={() => {
            resetCanvas();
            setIsOpen(true);
          }}
          className="w-full flex items-center justify-center p-4 min-h-[160px] bg-transparent cursor-zoom-in hover:bg-muted/5 transition-colors overflow-hidden
                     [&_svg]:!w-full [&_svg]:!h-auto [&_svg]:!max-w-full [&_svg]:!max-h-[350px] [&_svg]:mx-auto select-none"
          dangerouslySetInnerHTML={{ __html: svg }}
          title="Click to view fullscreen"
        />
      </div>

      {/* Fullscreen Modal Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] flex flex-col p-4 gap-2 border border-border/30 rounded-xl overflow-hidden shadow-2xl bg-background">
          <DialogHeader className="flex flex-row items-center justify-between border-b border-border/10 pb-2 px-1">
            <DialogTitle className="text-sm font-semibold tracking-tight text-foreground/90">
              Diagram
            </DialogTitle>
            
            {/* Quick Canvas Actions */}
            <div className="flex items-center gap-1.5 mr-6 bg-muted/30 border border-border/20 p-1 rounded-lg">
              <button 
                onClick={() => setScale(s => Math.min(s + 0.25, 5))}
                className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
              <button 
                onClick={() => setScale(s => Math.max(s - 0.25, 0.3))}
                className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <button 
                onClick={resetCanvas}
                className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Reset View"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </DialogHeader>

          {/* Interactive Movable Zoom/Pan Canvas */}
          <div 
            ref={canvasWrapperRef}
            className="flex-1 w-full overflow-hidden bg-muted/10 dark:bg-zinc-950/20 rounded-lg border border-border/10 flex items-center justify-center relative select-none"
            style={{
              cursor: isDragging ? "grabbing" : "grab",
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUpOrLeave}
            onTouchCancel={handleMouseUpOrLeave}
          >
            <div
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: "center center",
                transition: isDragging ? "none" : "transform 0.1s ease-out",
              }}
              className="w-full flex items-center justify-center [&_svg]:!w-full [&_svg]:!h-auto [&_svg]:!max-w-full [&_svg]:mx-auto"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
