import { memo, useEffect, useRef } from 'react'
import { marked } from 'marked'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import python from 'highlight.js/lib/languages/python'
import typescript from 'highlight.js/lib/languages/typescript'
import css from 'highlight.js/lib/languages/css'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import xml from 'highlight.js/lib/languages/xml'

// Register common languages
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('py', python)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('css', css)
hljs.registerLanguage('json', json)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('xml', xml)

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true,
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value
      } catch (e) {}
    }
    return code
  }
})

function MarkdownRenderer({ content }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) {
      // Highlight any code blocks that weren't caught
      ref.current.querySelectorAll('pre code:not(.hljs)').forEach((block) => {
        hljs.highlightElement(block)
      })
    }
  }, [content])

  if (!content) return null

  const html = marked.parse(content)

  return (
    <div 
      ref={ref}
      dangerouslySetInnerHTML={{ __html: html }} 
    />
  )
}

export default memo(MarkdownRenderer)
