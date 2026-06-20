export interface SourceLinkItem {
  title: string;
  url: string;
  snippet?: string;
}

interface SourceLinksProps {
  sources: SourceLinkItem[];
  variant?: "chat" | "vision";
  showSnippets?: boolean;
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function SourceLinks({
  sources,
  variant = "chat",
  showSnippets,
}: SourceLinksProps) {
  if (sources.length === 0) return null;

  const revealSnippets = showSnippets ?? variant === "vision";

  return (
    <div className={`source-links source-links--${variant}`}>
      <p className="source-links__heading">Sources</p>
      <ol className="source-links__list">
        {sources.map((source, index) => (
          <li key={source.url} className="source-links__item">
            <a
              className="source-links__link"
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="source-links__index">[{index + 1}]</span>
              <span className="source-links__title">
                {source.title || source.url}
              </span>
              <span className="source-links__host">
                {hostnameFromUrl(source.url)}
              </span>
            </a>
            {revealSnippets && source.snippet && (
              <p className="source-links__snippet">{source.snippet}</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
