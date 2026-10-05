import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

// raw HTML은 렌더링하지 않는다 (rehype-raw 사용 금지).
export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose prose-neutral max-w-none dark:prose-invert prose-pre:p-0 prose-pre:bg-transparent">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
