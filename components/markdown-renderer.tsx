/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkEmoji from "remark-emoji";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeKatex from "rehype-katex";
import { H1, H2, H3, H4, P, Blockquote } from "@/components/ui/typography";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { CopyWrapper } from "@/components/copy-button";
import { MermaidChart } from "@/components/mermaid-chart";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { CircleArrowOutUpRight, Link2 } from "lucide-react";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-json";
import "prismjs/components/prism-python";
import "prismjs/components/prism-bash";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  variant?: "default" | "chat";
  isStreaming?: boolean;
}

// ─── Sanitization Schema ───────────────────────────────────────────────────
const safeHtmlSubset = [
  "sup", "sub", "mark", "kbd", "br", "details", "summary",
  "figure", "figcaption", "abbr", "cite", "time"
];

const customSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    ...safeHtmlSubset,
    "input", "section"
  ],
  attributes: {
    ...defaultSchema.attributes,
    input: [
      ["type", "checkbox"],
      ["disabled", true],
      ["checked", true]
    ],
    a: [
      ...(defaultSchema.attributes?.a || []),
      "data-footnote-ref", "aria-describedby", "class"
    ],
    section: ["data-footnotes", "class"],
    li: [
      ...(defaultSchema.attributes?.li || []),
      "id", "class"
    ],
    ol: [
      ...(defaultSchema.attributes?.ol || []),
      "class"
    ],
    ul: [
      ...(defaultSchema.attributes?.ul || []),
      "class"
    ],
    sup: ["id", "class"],
    sub: ["class"],
    mark: ["class"],
    kbd: ["class"],
    details: ["class", "open"],
    summary: ["class"],
    figure: ["class"],
    figcaption: ["class"],
    abbr: ["class", "title"],
    cite: ["class"],
    time: ["class", "datetime"],
  }
};

function preprocessMarkdown(content: string): string {
  if (!content) return content;

  // 1. Convert ==highlighted== to <mark>highlighted</mark>
  let processed = content.replace(/==([^=]+)==/g, "<mark>$1</mark>");

  // 2. Convert LaTeX style block delimiters \[ ... \] to $$ ... $$
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
    return `\n$$\n${math.trim()}\n$$\n`;
  });

  // 3. Convert LaTeX style inline delimiters \( ... \) to $ ... $
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => {
    return `$${math.trim()}$`;
  });

  // 4. Convert custom admonition block directives (:::note, :::warning, :::info) to standard blockquote callouts (> [!NOTE], etc.)
  processed = processed.replace(/:::(note|tip|warning|important|caution|info)([\s\S]*?):::/gi, (_, type, blockContent) => {
    const calloutType = type.toUpperCase() === "INFO" ? "NOTE" : type.toUpperCase();
    const lines = blockContent.split("\n").map((line: string) => `> ${line}`).join("\n");
    return `\n> [!${calloutType}]\n${lines}\n`;
  });

  // 5. Convert markdown definition lists (Term\n: Definition) to HTML dl/dt/dd tags
  const lines = processed.split("\n");
  const resultLines: string[] = [];
  let inDl = false;
  
  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i];
    const nextLine = lines[i + 1] || "";
    
    const currentTrim = currentLine.trim();
    const nextTrim = nextLine.trim();
    
    const isTerm = currentTrim && 
                   !currentTrim.startsWith(":") && 
                   !currentTrim.startsWith("-") && 
                   !currentTrim.startsWith("*") && 
                   !currentTrim.startsWith("#") && 
                   !/^\d+\./.test(currentTrim) &&
                   nextTrim.startsWith(":");

    if (isTerm) {
      if (!inDl) {
        resultLines.push("<dl>");
        inDl = true;
      }
      resultLines.push(`  <dt>${currentTrim}</dt>`);
    } else if (currentTrim.startsWith(":")) {
      if (!inDl) {
        resultLines.push("<dl>");
        inDl = true;
      }
      const definition = currentLine.trim().substring(1).trim();
      resultLines.push(`  <dd>${definition}</dd>`);
      
      if (!nextTrim.startsWith(":")) {
        resultLines.push("</dl>");
        inDl = false;
      }
    } else {
      if (inDl) {
        resultLines.push("</dl>");
        inDl = false;
      }
      resultLines.push(currentLine);
    }
  }
  processed = resultLines.join("\n");

  // 6. Wrap raw Mermaid diagrams in standard ```mermaid blocks
  const mermaidRegex = /^(\s*)(graph\s+(?:TD|LR|TB|BT|RL)|flowchart\s+(?:TD|LR|TB|BT|RL)|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|mindmap|timeline|gitGraph)\b/im;
  
  const match = processed.match(mermaidRegex);
  if (match && match.index !== undefined) {
    const startIndex = match.index;
    
    const beforeText = processed.substring(0, startIndex);
    const openTicks = (beforeText.match(/```/g) || []).length;
    
    if (openTicks % 2 !== 0) {
      const afterText = processed.substring(startIndex);
      const closeTickIndex = afterText.indexOf("```");
      if (closeTickIndex !== -1) {
        const nextSearchIndex = startIndex + closeTickIndex + 3;
        return processed.substring(0, nextSearchIndex) + preprocessMarkdown(processed.substring(nextSearchIndex));
      }
      return processed;
    }

    const afterText = processed.substring(startIndex);
    const lines = afterText.split("\n");
    
    const diagramLines: string[] = [];
    let endIndex = 0;
    let foundEnd = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      if (i > 0) {
        const isIndented = line.startsWith(" ") || line.startsWith("\t");
        const isNormalText = /^(Summary|Note|Here|This|We|You|They|I|The|A|In|Out|To|From|For|With|By|At|As|An|Or|If|It|Is|No|So|Do|Up|On|Off|All|Any|Can|Has|Had|Have|Be|But|Not|What|When|Where|Who|Why|How|Let|Get|Set|Put|Run|Use|Try|Make|Take|Give|Send|Find|Keep|Start|Stop|Show|View|Edit|Add|Save|Open|Close|Join|Leave|Click|Tap|Type|Enter|Press|Hold|Drag|Drop|Scroll|Zoom|Pinch)\b/i.test(trimmed) && 
                             !trimmed.includes("-->") && 
                             !trimmed.includes("---") && 
                             !trimmed.includes("==>") &&
                             !trimmed.includes("-.->") &&
                             !/[\[\({]/.test(trimmed) &&
                             !isIndented;
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
  
  return processed;
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
      h1: ({ node: _, id, ...props }) => <H1 id={id} className={cn("group relative", isChat ? "mt-4 mb-2 text-xl" : "mt-10 mb-6 font-lora text-foreground")} {...props}>{props.children}{id && <a href={`#${id}`} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary select-none align-middle ml-1.5 inline-block md:absolute md:-left-6 md:ml-0 md:pr-2 md:top-1/2 md:-translate-y-1/2" aria-label="Anchor"><Link2 className="h-4 w-4" /></a>}</H1>,
      h2: ({ node: _, id, ...props }) => <H2 id={id} className={cn("group relative", isChat ? "mt-4 mb-2 text-lg" : "mt-10 mb-4 font-lora text-foreground")} {...props}>{props.children}{id && <a href={`#${id}`} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary select-none align-middle ml-1.5 inline-block md:absolute md:-left-6 md:ml-0 md:pr-2 md:top-1/2 md:-translate-y-1/2" aria-label="Anchor"><Link2 className="h-4 w-4" /></a>}</H2>,
      h3: ({ node: _, id, ...props }) => <H3 id={id} className={cn("group relative", isChat ? "mt-3 mb-2 text-base" : "mt-8 mb-4 font-lora text-foreground")} {...props}>{props.children}{id && <a href={`#${id}`} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary select-none align-middle ml-1.5 inline-block md:absolute md:-left-6 md:ml-0 md:pr-2 md:top-1/2 md:-translate-y-1/2" aria-label="Anchor"><Link2 className="h-4 w-4" /></a>}</H3>,
      h4: ({ node: _, id, ...props }) => <H4 id={id} className={cn("group relative", isChat ? "mt-3 mb-2 text-sm" : "mt-8 mb-4 font-lora text-foreground")} {...props}>{props.children}{id && <a href={`#${id}`} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary select-none align-middle ml-1.5 inline-block md:absolute md:-left-6 md:ml-0 md:pr-2 md:top-1/2 md:-translate-y-1/2" aria-label="Anchor"><Link2 className="h-4 w-4" /></a>}</H4>,
      h5: ({ node: _, id, ...props }) => <h5 id={id} className={cn("group relative scroll-m-20 text-sm font-semibold tracking-tight", isChat ? "mt-2 mb-1" : "mt-6 mb-2 text-foreground font-lora font-medium")} {...props}>{props.children}{id && <a href={`#${id}`} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary select-none align-middle ml-1.5 inline-block md:absolute md:-left-5 md:ml-0 md:pr-1 md:top-1/2 md:-translate-y-1/2" aria-label="Anchor"><Link2 className="h-3.5 w-3.5" /></a>}</h5>,
      h6: ({ node: _, id, ...props }) => <h6 id={id} className={cn("group relative scroll-m-20 text-xs font-semibold tracking-tight uppercase", isChat ? "mt-2 mb-1" : "mt-6 mb-2 text-foreground font-lora font-medium")} {...props}>{props.children}{id && <a href={`#${id}`} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary select-none align-middle ml-1.5 inline-block md:absolute md:-left-5 md:ml-0 md:pr-1 md:top-1/2 md:-translate-y-1/2" aria-label="Anchor"><Link2 className="h-3 w-3" /></a>}</h6>,
      p: ({ node: _, ...props }) => <P {...props} className={cn(isChat ? "mb-2 !mt-0 font-medium text-foreground leading-snug" : "mb-6 font-ibm text-muted-foreground leading-relaxed")} />,
      blockquote: ({ node: _, children, ...props }) => {
        let calloutType: string | null = null;
        let cleanChildren = children;

        const childrenArray = React.Children.toArray(children);
        const firstChild = childrenArray[0];

        if (
          React.isValidElement(firstChild) &&
          firstChild.props &&
          typeof firstChild.props === "object"
        ) {
          const firstChildProps = firstChild.props as { children?: React.ReactNode };
          const pChildrenArray = React.Children.toArray(firstChildProps.children);
          const firstPChild = pChildrenArray[0];

          if (typeof firstPChild === "string") {
            const match = firstPChild.match(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(?:\r?\n)?/i);
            if (match) {
              calloutType = match[1].toUpperCase();
              const remainingText = firstPChild.slice(match[0].length);
              
              const newPChildren = [remainingText, ...pChildrenArray.slice(1)];
              const newFirstChild = React.cloneElement(firstChild as React.ReactElement<{ children?: React.ReactNode }>, {
                ...firstChild.props,
                children: newPChildren
              });
              
              cleanChildren = [newFirstChild, ...childrenArray.slice(1)];
            }
          }
        }

        if (calloutType) {
          let bgClass = "bg-info/5 text-foreground";
          let borderClass = "border-l-4 border-info";
          let title = "Note";
          let icon = "ℹ️";
          
          if (calloutType === "TIP") {
            bgClass = "bg-success/5 text-foreground";
            borderClass = "border-l-4 border-success";
            title = "Tip";
            icon = "💡";
          } else if (calloutType === "IMPORTANT") {
            bgClass = "bg-primary/5 text-foreground";
            borderClass = "border-l-4 border-primary";
            title = "Important";
            icon = "⚠️";
          } else if (calloutType === "WARNING") {
            bgClass = "bg-warning/5 text-foreground";
            borderClass = "border-l-4 border-warning";
            title = "Warning";
            icon = "⚠️";
          } else if (calloutType === "CAUTION") {
            bgClass = "bg-destructive/5 text-foreground";
            borderClass = "border-l-4 border-destructive";
            title = "Caution";
            icon = "🚨";
          }

          return (
            <div className={cn("p-4 rounded-r-xl my-4", bgClass, borderClass)}>
              <div className="flex items-center gap-2 font-bold mb-1 text-sm uppercase tracking-wide">
                <span>{icon}</span>
                <span>{title}</span>
              </div>
              <div className="text-sm leading-relaxed text-muted-foreground [&>p]:!my-1">
                {cleanChildren}
              </div>
            </div>
          );
        }

        return (
          <Blockquote {...props} className={cn("border-primary text-muted-foreground bg-primary/5 py-1 pr-4 rounded-r-lg", isChat ? "mt-2 mb-2" : "")}>
            {children}
          </Blockquote>
        );
      },
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
              className={cn("bg-card border border-border shadow-xs p-4 rounded-xl overflow-x-auto text-sm font-mono text-foreground [&>code]:!bg-transparent [&>code]:!p-0 [&>code]:!text-inherit [&>code]:!font-normal", isChat ? "my-3" : "my-8")} 
              {...props} 
            >
              {children}
            </pre>
          </CopyWrapper>
        );
      },
      code: ({ node: _, className, children, ...props }) => {
        const match = /language-(\w+)/.exec(className || "");
        const isInline = !className;

        if (isInline) {
          return (
            <code className={cn("bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-medium text-[0.9em]", className)} {...props}>
              {children}
            </code>
          );
        }

        const lang = match ? match[1] : "markup";
        const codeString = String(children).replace(/\n$/, "");
        
        let highlighted = codeString;
        try {
          if (Prism.languages[lang]) {
            highlighted = Prism.highlight(codeString, Prism.languages[lang], lang);
          }
        } catch (e) {
          console.error("Prism error:", e);
        }

        return (
          <code
            className={cn(`language-${lang}`, className)}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        );
      },
      ul: ({ node: _, ...props }) => (
        <ul className={cn("ml-6 list-disc [&>li]:mt-1 marker:text-primary", isChat ? "my-2 text-foreground font-medium" : "my-6 font-ibm text-muted-foreground")} {...props} />
      ),
      ol: ({ node: _, ...props }) => (
        <ol className={cn("ml-6 list-decimal [&>li]:mt-1 marker:text-primary", isChat ? "my-2 text-foreground font-medium" : "my-6 font-ibm text-muted-foreground")} {...props} />
      ),
      input: ({ node: _, ...props }) => {
        if (props.type === "checkbox") {
          return <input {...props} className="mr-2 h-4 w-4 rounded border border-border text-primary focus:ring-primary accent-primary cursor-default align-middle" />;
        }
        return <input {...props} />;
      },
      section: ({ node: _, className, ...props }) => {
        if (className === "footnotes") {
          return <section className="footnotes mt-12 border-t border-border/60 pt-6 text-sm text-muted-foreground" {...props} />;
        }
        return <section {...props} />;
      },
      dl: ({ node: _, ...props }) => <dl className="my-6 space-y-3" {...props} />,
      dt: ({ node: _, ...props }) => <dt className="font-bold text-foreground" {...props} />,
      dd: ({ node: _, ...props }) => <dd className="ml-6 text-muted-foreground" {...props} />,
      img: ({ node: _, src, alt, title, ...props }) => (
        <span className="block my-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            title={title}
            className="mx-auto rounded-xl max-w-full h-auto border border-border/40 shadow-sm"
            {...props}
          />
          {alt && <span className="block text-xs text-muted-foreground italic mt-2">{alt}</span>}
        </span>
      ),
      hr: ({ node: _, ...props }) => <hr className="my-8 border-t border-border/60" {...props} />,
      del: ({ node: _, ...props }) => <del className="line-through text-muted-foreground/70" {...props} />,
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
        const isHash = !href || href.startsWith("#");
        
        if (isChat) {
          const linkClasses = "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors my-0.5 mx-0.5 align-baseline";
          if (isHash) {
            return (
              <a {...props} href={href || "#"} className={linkClasses} title={href}>
                {children}
              </a>
            );
          }
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
        if (isHash) {
          return (
            <a {...props} href={href || "#"} className={globalLinkClasses}>
              {children}
            </a>
          );
        }
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
      sup: ({ node: _, ...props }) => <sup className="text-[0.75em] leading-none vertical-align-super font-mono" {...props} />,
      sub: ({ node: _, ...props }) => <sub className="text-[0.75em] leading-none vertical-align-sub font-mono" {...props} />,
      mark: ({ node: _, ...props }) => <mark className="bg-warning/20 text-warning px-1 py-0.5 rounded font-medium" {...props} />,
      kbd: ({ node: _, ...props }) => <kbd className="bg-muted border border-border px-1.5 py-0.5 rounded text-xs font-mono shadow-xs text-foreground" {...props} />,
      details: ({ node: _, ...props }) => <details className="border border-border rounded-xl p-4 bg-muted/20 my-4 space-y-2 cursor-pointer transition-colors" {...props} />,
      summary: ({ node: _, ...props }) => <summary className="font-semibold text-foreground select-none" {...props} />,
      figure: ({ node: _, ...props }) => <figure className="my-6 text-center space-y-2 border border-border/40 p-4 rounded-xl bg-card" {...props} />,
      figcaption: ({ node: _, ...props }) => <figcaption className="text-xs text-muted-foreground italic" {...props} />,
      abbr: ({ node: _, ...props }) => <abbr className="underline decoration-dotted cursor-help text-foreground font-medium" {...props} />,
      cite: ({ node: _, ...props }) => <cite className="text-muted-foreground italic border-l-2 border-border/60 pl-3 my-2 block" {...props} />,
      time: ({ node: _, ...props }) => <time className="text-xs text-muted-foreground font-semibold font-mono bg-muted/65 px-1.5 py-0.5 rounded" {...props} />,
    };
  }, [isChat, isStreaming, variant]);

  return (
    <div className={cn("w-full max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkEmoji, remarkBreaks] as any}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, customSchema], rehypeSlug, rehypeKatex] as any}
        components={components}
      >
        {processedMermaidContent}
      </ReactMarkdown>
    </div>
  );
}
