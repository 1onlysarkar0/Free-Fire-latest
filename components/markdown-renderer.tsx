/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { H1, H2, H3, H4, P, Blockquote } from "@/components/ui/typography";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { CopyWrapper } from "@/components/copy-button";
import { MermaidChart } from "@/components/mermaid-chart";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { CircleArrowOutUpRight } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  variant?: "default" | "chat";
  isStreaming?: boolean;
}

function preprocessMarkdown(content: string): string {
  if (!content) return content;

  // Search for graph TD, flowchart LR, etc. at the start of a line (allowing leading whitespace)
  const mermaidRegex = /^(\s*)(graph\s+(?:TD|LR|TB|BT|RL)|flowchart\s+(?:TD|LR|TB|BT|RL)|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|mindmap|timeline|gitGraph)\b/im;
  
  const match = content.match(mermaidRegex);
  if (match && match.index !== undefined) {
    const startIndex = match.index;
    
    // Check if it's already inside a code block by looking backwards
    const beforeText = content.substring(0, startIndex);
    const openTicks = (beforeText.match(/```/g) || []).length;
    
    // If openTicks is odd, it's already inside a code block, so keep searching in the remainder
    if (openTicks % 2 !== 0) {
      const afterText = content.substring(startIndex);
      const closeTickIndex = afterText.indexOf("```");
      if (closeTickIndex !== -1) {
        const nextSearchIndex = startIndex + closeTickIndex + 3;
        return content.substring(0, nextSearchIndex) + preprocessMarkdown(content.substring(nextSearchIndex));
      }
      return content;
    }

    // We are NOT in a code block. We need to wrap it.
    const afterText = content.substring(startIndex);
    const lines = afterText.split("\n");
    
    const diagramLines: string[] = [];
    let endIndex = 0;
    let foundEnd = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (i > 0) {
        const isIndented = line.startsWith(" ") || line.startsWith("\t");
        // Detect lines that clearly aren't part of a mermaid diagram:
        // common English sentence starters, error/label prefixes, blank lines,
        // or any ALL-CAPS word followed by a colon.
        const isNormalText = /^(Summary|Note|Here|This|We|You|They|I|The|A|In|Out|To|From|For|With|By|At|As|An|Or|If|It|Is|No|So|Do|Up|On|Off|All|Any|Can|Has|Had|Have|Be|But|Not|What|When|Where|Who|Why|How|Let|Get|Set|Put|Run|Use|Try|Make|Take|Give|Send|Find|Keep|Start|Stop|Show|View|Edit|Add|Save|Open|Close|Join|Leave|Click|Tap|Type|Enter|Press|Hold|Drag|Drop|Scroll|Zoom|Pinch)\b/i.test(trimmed) && 
                             !trimmed.includes("-->") && 
                             !trimmed.includes("---") && 
                             !trimmed.includes("==>") &&
                             !trimmed.includes("-.->") &&
                             !/[\[\({]/.test(trimmed) &&
                             !isIndented;
        // Also treat ANY line that starts with an ALL-CAPS word followed by
        // a colon (like "ERROR:", "WARNING:", "NOTE:") as normal text boundary.
        const isAllCapsLabel = /^[A-Z][A-Z]+:/.test(trimmed) && !trimmed.includes("-->") && !trimmed.includes("==>") && !/[\[\({]/.test(trimmed);
        
        const startsWithCodeBlock = trimmed.startsWith("```");
        
        if (isNormalText || isAllCapsLabel || startsWithCodeBlock) {
          endIndex = i;
          foundEnd = true;
          break;
        }
      }
      diagramLines.push(line);
    }
    
    if (!foundEnd) {
      endIndex = lines.length;
    }
    
    const diagramContent = diagramLines.join("\n").trim();
    const remainingContent = lines.slice(endIndex).join("\n");
    
    return beforeText + "\n```mermaid\n" + diagramContent + "\n```\n" + preprocessMarkdown(remainingContent);
  }
  
  return content;
}

export function MarkdownRenderer({ content, className, variant = "default", isStreaming = false }: MarkdownRendererProps) {
  const isChat = variant === "chat";

  // Auto-linkify raw paths like /dashboard or /sign-in if they aren't already markdown links (only for chat)
  const processedContent = isChat ? content.replace(
    /(^|\s)(\/[a-zA-Z0-9-]+(?:\/[a-zA-Z0-9-]+)*)/g,
    (match, space, path) => {
      return `${space}[${path}](${path})`;
    }
  ) : content;

  // Preprocess markdown to wrap raw Mermaid charts in proper code blocks
  const processedMermaidContent = React.useMemo(() => {
    return preprocessMarkdown(processedContent);
  }, [processedContent]);

  // Memoize components object to prevent ReactMarkdown from tearing down and remounting components on every render
  const components: Components = React.useMemo(() => {
    return {
      h1: ({ node: _, ...props }) => <H1 {...props} className={cn(isChat ? "mt-4 mb-2 text-xl" : "mt-10 mb-6 font-lora text-foreground")} />,
      h2: ({ node: _, ...props }) => <H2 {...props} className={cn(isChat ? "mt-4 mb-2 text-lg" : "mt-10 mb-4 font-lora text-foreground")} />,
      h3: ({ node: _, ...props }) => <H3 {...props} className={cn(isChat ? "mt-3 mb-2 text-base" : "mt-8 mb-4 font-lora text-foreground")} />,
      h4: ({ node: _, ...props }) => <H4 {...props} className={cn(isChat ? "mt-3 mb-2 text-sm" : "mt-8 mb-4 font-lora text-foreground")} />,
      p: ({ node: _, ...props }) => <P {...props} className={cn(isChat ? "mb-2 !mt-0 font-medium text-foreground leading-snug" : "mb-6 font-ibm text-muted-foreground leading-relaxed")} />,
      blockquote: ({ node: _, ...props }) => <Blockquote {...props} className={cn("border-primary text-muted-foreground bg-primary/5 py-1 pr-4 rounded-r-lg", isChat ? "mt-2 mb-2" : "")} />,
      pre: ({ node: _, children, ...props }) => {
        const childrenArray = React.Children.toArray(children);
        const codeEl = childrenArray.find(
          (child) =>
            React.isValidElement(child) &&
            child.props &&
            typeof child.props === "object"
        ) as React.ReactElement<{ className?: string; children?: React.ReactNode }> | undefined;

        if (codeEl) {
          const className = codeEl.props.className ?? "";
          const codeContent = String(codeEl.props.children || "").trim();
          
          const isMermaid = 
            className.includes("language-mermaid") || 
            /^(graph\b|flowchart\b|sequenceDiagram\b|classDiagram\b|stateDiagram\b|erDiagram\b|gantt\b|pie\b|journey\b|mindmap\b|timeline\b|gitGraph\b)/i.test(codeContent);

          if (isMermaid) {
            return <MermaidChart code={codeContent} isStreaming={isStreaming} variant={variant} />;
          }
        }

        return (
          <CopyWrapper>
            <pre 
              className={cn("bg-card border border-border shadow-sm p-4 rounded-xl overflow-x-auto text-sm font-mono text-foreground [&>code]:!bg-transparent [&>code]:!p-0 [&>code]:!text-inherit [&>code]:!font-normal", isChat ? "my-3" : "my-8")} 
              {...props} 
            >
              {children}
            </pre>
          </CopyWrapper>
        );
      },
      code: ({ node: _, className, ...props }) => (
        <code className={cn("bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-medium text-[0.9em]", className)} {...props} />
      ),
      ul: ({ node: _, ...props }) => (
        <ul className={cn("ml-6 list-disc [&>li]:mt-1 marker:text-primary", isChat ? "my-2 text-foreground font-medium" : "my-6 font-ibm text-muted-foreground")} {...props} />
      ),
      ol: ({ node: _, ...props }) => (
        <ol className={cn("ml-6 list-decimal [&>li]:mt-1 marker:text-primary", isChat ? "my-2 text-foreground font-medium" : "my-6 font-ibm text-muted-foreground")} {...props} />
      ),
      table: ({ node: _, ...props }) => (
        <CopyWrapper className={isChat ? "my-3" : "my-8"}>
          <div className="w-full overflow-x-auto rounded-xl border border-border shadow-sm bg-card">
            <Table {...props} className="w-full text-left border-collapse" />
          </div>
        </CopyWrapper>
      ),
      thead: ({ node: _, ...props }) => <TableHeader className="bg-muted/60 border-b border-border" {...props} />,
      tbody: ({ node: _, ...props }) => <TableBody className="divide-y divide-border" {...props} />,
      tr: ({ node: _, ...props }) => <TableRow className="hover:bg-muted/40 transition-colors" {...props} />,
      th: ({ node: _, ...props }) => <TableHead className={cn("font-semibold text-foreground align-middle", isChat ? "p-2" : "p-4")} {...props} />,
      td: ({ node: _, ...props }) => <TableCell className={cn("align-middle text-muted-foreground", isChat ? "p-2" : "p-4")} {...props} />,
      a: ({ node: _, href, children, ...props }) => {
        const isInternal = href?.startsWith("/");
        
        if (isChat) {
          const linkClasses = "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors my-0.5 mx-0.5 align-baseline";
          if (isInternal) {
            return (
              <Link href={href || "#"} className={linkClasses} title={href}>
                {children}
                <CircleArrowOutUpRight size="1em" />
              </Link>
            );
          }
          return (
            <a {...props} href={href} className={linkClasses} target="_blank" rel="noreferrer" title={href}>
              {children}
              <CircleArrowOutUpRight size="1em" />
            </a>
          );
        }

        // Default global variant
        const globalLinkClasses = "font-semibold text-primary underline underline-offset-4 hover:text-primary/80 transition-colors";
        if (isInternal) {
          return (
            <Link href={href || "#"} className={globalLinkClasses}>
              {children}
            </Link>
          );
        }
        return (
          <a {...props} href={href} className={globalLinkClasses} target="_blank" rel="noreferrer">
            {children}
          </a>
        );
      },
    };
  }, [isChat, isStreaming, variant]);

  return (
    <div className={cn("w-full max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {processedMermaidContent}
      </ReactMarkdown>
    </div>
  );
}
