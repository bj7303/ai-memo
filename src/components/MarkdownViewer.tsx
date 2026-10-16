'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'

interface MarkdownViewerProps {
  content: string
}

const VIEWER_CLASS = [
  'text-gray-700 leading-relaxed break-words',
  '[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-gray-900 [&_h1]:mt-4 [&_h1]:mb-2',
  '[&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-4 [&_h2]:mb-2',
  '[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:mt-3 [&_h3]:mb-2',
  '[&_p]:my-2',
  '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2',
  '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2',
  '[&_li]:my-1',
  '[&_a]:text-blue-600 [&_a]:underline',
  '[&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:text-gray-500 [&_blockquote]:my-2',
  '[&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded [&_code]:text-sm',
  '[&_pre]:bg-gray-100 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-2',
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_table]:border-collapse [&_table]:my-2',
  '[&_th]:border [&_th]:border-gray-300 [&_th]:px-3 [&_th]:py-1 [&_th]:bg-gray-50',
  '[&_td]:border [&_td]:border-gray-300 [&_td]:px-3 [&_td]:py-1',
  '[&_hr]:my-4 [&_hr]:border-gray-200',
].join(' ')

export default function MarkdownViewer({ content }: MarkdownViewerProps) {
  return (
    <div className={VIEWER_CLASS} data-testid="markdown-viewer">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
