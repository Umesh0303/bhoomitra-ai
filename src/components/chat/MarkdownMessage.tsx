import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownMessage({ text }: { text: string }) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-pre:my-2 prose-headings:mt-3 prose-headings:mb-2 prose-table:my-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: (props) => (
            <a {...props} target="_blank" rel="noreferrer" className="text-primary underline" />
          ),
          table: (props) => (
            <div className="overflow-x-auto">
              <table {...props} className="w-full border-collapse text-sm" />
            </div>
          ),
          th: (props) => (
            <th {...props} className="border border-border bg-muted px-2 py-1 text-left" />
          ),
          td: (props) => <td {...props} className="border border-border px-2 py-1 align-top" />,
          code: ({ className, children, ...props }) => (
            <code
              {...props}
              className={`${className ?? ""} rounded bg-muted px-1 py-0.5 text-[0.85em]`}
            >
              {children}
            </code>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
