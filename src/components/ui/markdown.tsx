import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

// Compact markdown renderer for AI-generated content (Reality Check personas,
// moderator summary, etc.). Tight typography so it sits well inside small
// cards. Inherits color from parent — pass text-* classes via className.
export function Markdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-sm leading-relaxed",
        // Tight heading scale — these AI outputs use ## and ### freely
        "[&_h1]:text-h2 [&_h1]:font-semibold [&_h1]:mt-3 [&_h1]:mb-1.5",
        "[&_h2]:text-h2 [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1.5",
        "[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2.5 [&_h3]:mb-1",
        "[&_p]:my-1.5",
        "[&_strong]:font-semibold",
        "[&_ul]:my-1.5 [&_ul]:pl-5 [&_ul]:list-disc",
        "[&_ol]:my-1.5 [&_ol]:pl-5 [&_ol]:list-decimal",
        "[&_li]:my-0.5",
        "[&_hr]:my-3 [&_hr]:border-border",
        "[&_code]:bg-wash [&_code]:rounded [&_code]:px-1 [&_code]:text-xs",
        "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      )}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
