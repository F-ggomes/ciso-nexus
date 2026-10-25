import { Fragment, type ReactNode } from 'react';

/**
 * Tiny markdown renderer: headings (#..####), unordered/ordered lists, paragraphs,
 * horizontal rules, blockquotes, fenced code, and inline **bold**, *italic*, `code`.
 * No external dependency.
 */

function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|_[^_]+_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) out.push(<strong key={i++}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('`')) out.push(<code key={i++} className="mono rounded-sm bg-slate-100 px-1 text-[0.85em] dark:bg-navy-800">{tok.slice(1, -1)}</code>);
    else out.push(<em key={i++}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block =
  | { type: 'h'; level: number; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'hr' }
  | { type: 'quote'; text: string }
  | { type: 'code'; text: string };

function parse(md: string): Block[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      i++;
      continue;
    }
    if (line.startsWith('```')) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++]);
      i++;
      blocks.push({ type: 'code', text: buf.join('\n') });
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      blocks.push({ type: 'h', level: h[1].length, text: h[2] });
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*+]\s+/, ''));
      blocks.push({ type: 'ul', items });
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ''));
      blocks.push({ type: 'ol', items });
      continue;
    }
    if (line.startsWith('>')) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) buf.push(lines[i++].replace(/^>\s?/, ''));
      blocks.push({ type: 'quote', text: buf.join(' ') });
      continue;
    }
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i]) &&
      !lines[i].startsWith('```') &&
      !lines[i].startsWith('>')
    )
      buf.push(lines[i++]);
    blocks.push({ type: 'p', text: buf.join(' ') });
  }
  return blocks;
}

const hClass: Record<number, string> = {
  1: 'text-lg font-semibold mt-4 mb-2 text-navy-900 dark:text-slate-100',
  2: 'text-base font-semibold mt-4 mb-1.5 text-navy-900 dark:text-slate-100',
  3: 'text-sm font-semibold mt-3 mb-1 text-navy-800 dark:text-slate-200',
  4: 'text-xs font-semibold uppercase tracking-wide mt-3 mb-1 text-slate-500 dark:text-slate-400',
  5: 'text-xs font-semibold mt-2 mb-1',
  6: 'text-xs font-semibold mt-2 mb-1',
};

export default function Markdown({ source, className = '' }: { source: string; className?: string }) {
  const blocks = parse(source ?? '');
  return (
    <div className={`text-sm leading-relaxed text-slate-700 dark:text-slate-300 ${className}`}>
      {blocks.map((b, idx) => {
        switch (b.type) {
          case 'h': {
            const Tag = `h${Math.min(b.level, 6)}` as keyof JSX.IntrinsicElements;
            return (
              <Tag key={idx} className={hClass[b.level] ?? hClass[6]}>
                {renderInline(b.text)}
              </Tag>
            );
          }
          case 'p':
            return (
              <p key={idx} className="my-1.5">
                {renderInline(b.text)}
              </p>
            );
          case 'ul':
            return (
              <ul key={idx} className="my-1.5 list-disc space-y-0.5 pl-5">
                {b.items.map((it, j) => (
                  <li key={j}>{renderInline(it)}</li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={idx} className="my-1.5 list-decimal space-y-0.5 pl-5">
                {b.items.map((it, j) => (
                  <li key={j}>{renderInline(it)}</li>
                ))}
              </ol>
            );
          case 'hr':
            return <hr key={idx} className="my-3 border-slate-200 dark:border-navy-800" />;
          case 'quote':
            return (
              <blockquote key={idx} className="my-2 border-l-2 border-accent-500 pl-3 italic text-slate-600 dark:text-slate-400">
                {renderInline(b.text)}
              </blockquote>
            );
          case 'code':
            return (
              <pre key={idx} className="mono my-2 overflow-x-auto rounded-sm bg-slate-100 p-2 text-xs dark:bg-navy-950">
                {b.text}
              </pre>
            );
          default:
            return <Fragment key={idx} />;
        }
      })}
    </div>
  );
}
