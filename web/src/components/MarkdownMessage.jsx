import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ChatGPT-style fenced code block: dark header bar with the language + a
// copy button, above a scrollable <pre>. `pre`'s only child is the <code>
// react-markdown rendered, so we pull the language/text back out of it.
function CodeBlock({ children }) {
  const [copied, setCopied] = useState(false);
  const codeEl = Array.isArray(children) ? children[0] : children;
  const lang = (codeEl?.props?.className || "").match(/language-(\S+)/)?.[1] || "text";
  const codeText = String(codeEl?.props?.children ?? "").replace(/\n$/, "");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable (insecure context, permissions) - no-op
    }
  }

  return (
    <div className="my-2 rounded-lg overflow-hidden border border-neutral-700">
      <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-800 text-xs text-neutral-400">
        <span>{lang}</span>
        <button onClick={handleCopy} className="hover:text-white">
          {copied ? "copied!" : "copy"}
        </button>
      </div>
      <pre className="bg-neutral-950 p-3 overflow-x-auto text-sm leading-relaxed">
        <code className="bg-transparent p-0">{codeText}</code>
      </pre>
    </div>
  );
}

// minimal Tailwind styling for the tags AI replies actually use - no
// @tailwindcss/typography since this project loads Tailwind from the CDN
const components = {
  a: (props) => <a {...props} className="text-blue-400 underline" target="_blank" rel="noreferrer" />,
  // inline code only - fenced blocks are handled by `pre` -> CodeBlock instead
  code: ({ className, children, ...props }) => (
    <code className={`bg-neutral-800 rounded px-1 py-0.5 text-neutral-200 ${className || ""}`} {...props}>
      {children}
    </code>
  ),
  pre: (props) => <CodeBlock {...props} />,
  ul: (props) => <ul className="list-disc list-inside my-1" {...props} />,
  ol: (props) => <ol className="list-decimal list-inside my-1" {...props} />,
  h1: (props) => <h1 className="text-lg font-bold mt-2 mb-1" {...props} />,
  h2: (props) => <h2 className="text-base font-bold mt-2 mb-1" {...props} />,
  h3: (props) => <h3 className="font-bold mt-2 mb-1" {...props} />,
  table: (props) => <table className="border-collapse my-2" {...props} />,
  th: (props) => <th className="border border-neutral-700 px-2 py-1 text-left" {...props} />,
  td: (props) => <td className="border border-neutral-700 px-2 py-1" {...props} />,
  p: (props) => <p className="mb-2 last:mb-0" {...props} />,
  strong: (props) => <strong className="font-bold text-neutral-100" {...props} />,
  em: (props) => <em className="italic" {...props} />,
};

export default function MarkdownMessage({ text }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {text}
    </ReactMarkdown>
  );
}
