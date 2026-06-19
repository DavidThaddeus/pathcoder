'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Clock, Target, Code, HelpCircle, CheckCircle, Star, Copy, Check, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'

import Editor from '@monaco-editor/react'
import { useAuth } from '../../../contexts/AuthContext'
import Modal from '../../components/ui/Modal'
import { ProtectedRoute } from '../../../components/ProtectedRoute'

interface Challenge {
  id: string
  title: string
  description: string
  programmingLanguage: string
  skillLevel: string
  challengeType: string
  topics: string[]
  instructions: string
  codeSnippet?: string
  content?: string // For backward compatibility
  solution: string
  solutionExplanation?: string
  learningObjectives: string[]
  estimatedTime: string
  hints: string[]
  createdAt: string
  questions?: QuizQuestion[]
}

interface QuizQuestion {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

// Shared ReactMarkdown renderers used for all challenge instruction types
// (coding, quiz, debug). Gives proper markdown formatting + styled code blocks.
const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="text-2xl font-bold text-white mb-4 mt-2">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xl font-bold text-white mb-3 mt-4">{children}</h2>,
  h3: ({ children }) => <h3 className="text-lg font-semibold text-[#DCC5B2] mb-2 mt-4">{children}</h3>,
  p: ({ children }) => <p className="mb-3 leading-relaxed text-gray-200">{children}</p>,
  strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
  em: ({ children }) => <em className="text-gray-100 italic">{children}</em>,
  ul: ({ children }) => <ul className="list-disc list-outside pl-6 space-y-1.5 mb-4 text-gray-200">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-outside pl-6 space-y-1.5 mb-4 text-gray-200">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed pl-1">{children}</li>,
  a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300">{children}</a>,
  blockquote: ({ children }) => <blockquote className="border-l-4 border-[#DCC5B2] pl-4 italic text-gray-300 my-4">{children}</blockquote>,
  pre: ({ children }) => <pre className="bg-gray-950 border border-gray-700 rounded-lg p-4 overflow-x-auto my-4">{children}</pre>,
  code: ({ className, children }) => {
    const text = String(children)
    const isBlock = /language-/.test(className || '') || text.includes('\n')
    if (isBlock) {
      return <code className="block font-mono text-sm text-gray-100 whitespace-pre">{children}</code>
    }
    return <code className="bg-gray-700 text-yellow-300 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
  },
}

function ChallengePage() {
  const params = useParams()
  const router = useRouter()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSolution, setShowSolution] = useState(false)
  const [showHints, setShowHints] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [copiedItems, setCopiedItems] = useState<{[key: string]: boolean}>({})
  const [userCode, setUserCode] = useState("// Write your code here...\n\n")
  const [debugCode, setDebugCode] = useState("// Paste the corrected code here...\n\n")
  const [quizAnswer, setQuizAnswer] = useState("")
  // Structured multiple-choice quiz state.
  const [quizSelections, setQuizSelections] = useState<Record<number, number>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizResult, setQuizResult] = useState<{ score: number; total: number; passed: boolean } | null>(null)
  const { user } = useAuth()
  const [showSolutionModal, setShowSolutionModal] = useState(false)
  const [checking, setChecking] = useState(false)
  const [formattedSolutionCode, setFormattedSolutionCode] = useState('')
  // Add state for result modal
  const [showResultModal, setShowResultModal] = useState(false)
  const [resultMessage, setResultMessage] = useState('')
  const [resultType, setResultType] = useState<'success' | 'error'>('success')
  const [solutionExplanation, setSolutionExplanation] = useState('')
  const [evaluationResult, setEvaluationResult] = useState<{ result: string; reason: string; attempts?: number; timeTaken?: number } | null>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [hintTimeout, setHintTimeout] = useState<NodeJS.Timeout | null>(null)
  const [hintSecondsLeft, setHintSecondsLeft] = useState(0)
  const [spendingHint, setSpendingHint] = useState(false)
  const [attemptCount, setAttemptCount] = useState(0)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [challengeFailed, setChallengeFailed] = useState(false)
  // True once saved code has been loaded from localStorage — prevents the
  // initial placeholder from overwriting persisted code before it loads.
  const [codeHydrated, setCodeHydrated] = useState(false)
  const [reviewMode, setReviewMode] = useState(false)

  // Monaco Editor configuration for consistent theming across all languages
  const monacoEditorOptions = {
    fontSize: 14,
    lineNumbers: 'on' as const,
    roundedSelection: false,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    insertSpaces: true,
    minimap: { enabled: false },
    wordWrap: 'bounded' as const,
    wordWrapColumn: 80,
    formatOnPaste: true,
    formatOnType: true,
    scrollbar: {
      vertical: 'auto' as const,
      horizontal: 'auto' as const,
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8,
    },
    // Disable error markers in scrollbar
    renderValidationDecorations: 'off' as const,
    theme: 'vs-dark',
    // Disable error squiggles and warnings
    hideCursorInOverviewRuler: true,
    overviewRulerBorder: false,
    overviewRulerLanes: 0,
    // Disable TypeScript/ESLint warnings
    noSemanticValidation: true,
    noSyntaxValidation: true,
  }

  useEffect(() => {
    if (!challenge || !challenge.solution) return;
    
    // Use the new solutionExplanation field if available, otherwise extract from solution
    let code = challenge.solution.trim();
    let explanation = challenge.solutionExplanation || '';
    
    // If no separate explanation field, try to extract from solution
    if (!explanation) {
      const codeBlockRegex = /```([a-zA-Z0-9]*)\n([\s\S]*?)```/m;
      const match = codeBlockRegex.exec(challenge.solution);
      if (match) {
        const language = match[1] || challenge.programmingLanguage?.toLowerCase() || challenge.programmingLanguage || 'javascript';
        code = match[2].trim();
        explanation = (challenge.solution.slice(0, match.index) + challenge.solution.slice(match.index + match[0].length)).trim();
      }
    }
    
    setSolutionExplanation(explanation);
    // Show the solution code verbatim (strip code fences if any) — no reformatting,
    // which previously collapsed newlines and broke indentation.
    const cleanSolutionCode = code.replace(/^```[a-zA-Z0-9]*\n?/m, '').replace(/```\s*$/m, '').replace(/\r/g, '');
    setFormattedSolutionCode(cleanSolutionCode);
  }, [challenge]);

  // Copy to clipboard function
  const copyToClipboard = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedItems(prev => ({ ...prev, [itemId]: true }))
      setTimeout(() => {
        setCopiedItems(prev => ({ ...prev, [itemId]: false }))
      }, 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  // Enhanced universal language mapper for consistent detection
  const normalizeLanguage = (language: string): string => {
    if (!language) return 'javascript'
    const lang = language.toLowerCase()
    const languageMap: { [key: string]: string } = {
      // JavaScript/TypeScript
      'javascript': 'javascript',
      'js': 'javascript',
      'typescript': 'typescript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      
      // Python
      'python': 'python',
      'py': 'python',
      
      // Java
      'java': 'java',
      
      // C/C++
      'c': 'c',
      'cpp': 'cpp',
      'c++': 'cpp',
      'csharp': 'csharp',
      'c#': 'csharp',
      
      // Web
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'scss',
      'less': 'less',
      
      // Other languages
      'php': 'php',
      'ruby': 'ruby',
      'go': 'go',
      'rust': 'rust',
      'swift': 'swift',
      'kotlin': 'kotlin',
      'scala': 'scala',
      'r': 'r',
      'sql': 'sql',
      'bash': 'shell',
      'shell': 'shell',
      'powershell': 'powershell',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'markdown': 'markdown',
      'md': 'markdown',
      'matlab': 'matlab',
      'vb': 'vb',
      'visualbasic': 'vb',
      'fsharp': 'fsharp',
      'f#': 'fsharp',
      'typescriptreact': 'typescript',
      'javascriptreact': 'javascript',
      
      // Default fallbacks
      'text': 'plaintext',
      'plain': 'plaintext',
      'plaintext': 'plaintext'
    }
    
    return languageMap[lang] || 'javascript'
  }

  // Function to get user-friendly language display name
  const getLanguageDisplayName = (language: string): string => {
    if (!language) return 'JavaScript'
    const lang = language.toLowerCase()
    
    const displayNames: { [key: string]: string } = {
      'javascript': 'JavaScript',
      'js': 'JavaScript',
      'typescript': 'TypeScript',
      'ts': 'TypeScript',
      'jsx': 'React JSX',
      'tsx': 'React TSX',
      'python': 'Python',
      'py': 'Python',
      'java': 'Java',
      'c': 'C',
      'cpp': 'C++',
      'c++': 'C++',
      'csharp': 'C#',
      'c#': 'C#',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'sass': 'Sass',
      'less': 'Less',
      'php': 'PHP',
      'ruby': 'Ruby',
      'go': 'Go',
      'rust': 'Rust',
      'swift': 'Swift',
      'kotlin': 'Kotlin',
      'scala': 'Scala',
      'r': 'R',
      'sql': 'SQL',
      'bash': 'Bash',
      'shell': 'Shell',
      'powershell': 'PowerShell',
      'json': 'JSON',
      'xml': 'XML',
      'yaml': 'YAML',
      'yml': 'YAML',
      'markdown': 'Markdown',
      'md': 'Markdown',
      'matlab': 'MATLAB',
      'vb': 'Visual Basic',
      'visualbasic': 'Visual Basic',
      'fsharp': 'F#',
      'f#': 'F#',
      'typescriptreact': 'TypeScript React',
      'javascriptreact': 'JavaScript React',
      'text': 'Plain Text',
      'plain': 'Plain Text',
      'plaintext': 'Plain Text'
    }
    
    return displayNames[lang] || language.charAt(0).toUpperCase() + language.slice(1)
  }

  // Universal code formatter that works for all programming languages
  const formatCode = (code: string, language: string = 'javascript'): string => {
    if (!code || !code.trim()) return code

    const lang = language.toLowerCase()
    let formatted = code.trim()
    
    // Universal formatting rules that work across languages
    const formatUniversal = (text: string): string => {
      return text
        // Normalize whitespace around common operators
        .replace(/\s*=\s*/g, ' = ')
        .replace(/\s*\+\s*/g, ' + ')
        .replace(/\s*-\s*/g, ' - ')
        .replace(/\s*\*\s*/g, ' * ')
        .replace(/\s*\/\s*/g, ' / ')
        .replace(/\s*%\s*/g, ' % ')
        .replace(/\s*<\s*/g, ' < ')
        .replace(/\s*>\s*/g, ' > ')
        .replace(/\s*<=\s*/g, ' <= ')
        .replace(/\s*>=\s*/g, ' >= ')
        .replace(/\s*==\s*/g, ' == ')
        .replace(/\s*!=\s*/g, ' != ')
        .replace(/\s*&&\s*/g, ' && ')
        .replace(/\s*\|\|\s*/g, ' || ')
        // Normalize commas
        .replace(/\s*,\s*/g, ', ')
        // Clean up multiple spaces
        .replace(/\s+/g, ' ')
    }

    // Language-specific formatting
    if (lang === 'python') {
      formatted = formatUniversal(formatted)
        .replace(/:\s*/g, ':\n')  // Colon starts new block
        .replace(/\bif\s+/g, 'if ')
        .replace(/\bfor\s+/g, 'for ')
        .replace(/\bwhile\s+/g, 'while ')
        .replace(/\bdef\s+/g, 'def ')
        .replace(/\bclass\s+/g, 'class ')
        .replace(/\belif\s+/g, 'elif ')
        .replace(/\belse\s*:\s*/g, 'else:\n')
    } else if (lang === 'java' || lang === 'c++' || lang === 'c' || lang === 'csharp') {
      formatted = formatUniversal(formatted)
        .replace(/\s*{\s*/g, ' {\n')
        .replace(/\s*}\s*/g, '\n}\n')
        .replace(/;\s*/g, ';\n')
        .replace(/\bif\s*\(/g, 'if (')
        .replace(/\bfor\s*\(/g, 'for (')
        .replace(/\bwhile\s*\(/g, 'while (')
        .replace(/\bswitch\s*\(/g, 'switch (')
    } else {
      // JavaScript/TypeScript and other C-like languages
      formatted = formatUniversal(formatted)
        .replace(/\s*{\s*/g, ' {\n')
        .replace(/\s*}\s*/g, '\n}\n')
        .replace(/;\s*/g, ';\n')
        .replace(/\bfunction\s+/g, 'function ')
        .replace(/\bif\s*\(/g, 'if (')
        .replace(/\bfor\s*\(/g, 'for (')
        .replace(/\bwhile\s*\(/g, 'while (')
        .replace(/\bswitch\s*\(/g, 'switch (')
        .replace(/\belse\s*{/g, 'else {')
    }

    // Universal indentation logic
    const lines = formatted.split('\n').filter(line => line.trim().length > 0)
    const indentedLines: string[] = []
    let indentLevel = 0
    const indentSize = lang === 'python' ? 4 : 2 // Python uses 4 spaces, others use 2

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Decrease indent for closing braces/blocks
      if (line.startsWith('}') || line.startsWith('end') || 
          (lang === 'python' && lines[i-1] && !lines[i-1].endsWith(':') && 
           line !== '' && indentLevel > 0)) {
        indentLevel = Math.max(0, indentLevel - 1)
      }
      
      // Add the line with proper indentation
      const spaces = ' '.repeat(indentLevel * indentSize)
      indentedLines.push(spaces + line)
      
      // Increase indent for opening braces/blocks
      if (line.includes('{') && !line.includes('}')) {
        indentLevel++
      } else if (lang === 'python' && line.endsWith(':')) {
        indentLevel++
      } else if (line.includes('begin') || line.includes('do')) {
        indentLevel++
      }
      
      // Handle control structures without braces
      if ((line.includes('if') || line.includes('for') || line.includes('while')) && 
          !line.includes('{') && !line.endsWith(':')) {
        const nextLine = lines[i + 1]
        if (nextLine && !nextLine.trim().startsWith('{')) {
          // Single statement, temporarily increase indent for next line only
          if (i + 1 < lines.length) {
            const nextLineContent = lines[i + 1].trim()
            lines[i + 1] = ' '.repeat(indentSize) + nextLineContent
          }
        }
      }
    }

    // Add proper spacing between code blocks
    const finalLines: string[] = []
    for (let i = 0; i < indentedLines.length; i++) {
      const line = indentedLines[i]
      const trimmedLine = line.trim()
      
      // Add blank line before function/class declarations
      if ((trimmedLine.includes('function') || trimmedLine.includes('def ') || 
           trimmedLine.includes('class ') || trimmedLine.includes('public ') ||
           trimmedLine.includes('private ') || trimmedLine.includes('protected ')) && 
          i > 0 && indentedLines[i-1].trim() !== '') {
        finalLines.push('')
      }
      
      finalLines.push(line)
      
      // Add blank line after closing braces
      if ((trimmedLine === '}' || trimmedLine === 'end') && 
          i < indentedLines.length - 1) {
        const nextLine = indentedLines[i + 1]?.trim()
        if (nextLine && !nextLine.startsWith('}') && nextLine !== 'end') {
          finalLines.push('')
        }
      }
    }

    return finalLines.join('\n').trim()
  }

  // Helper function to clean and format content
  const cleanContent = (content: string | undefined) => {
    if (!content) return ''
    
    // Remove JSON formatting artifacts
    let cleaned = content.replace(/^```json\s*/, '').replace(/```$/, '')
    cleaned = cleaned.replace(/^\{\s*".*?":\s*"/, '').replace(/"\s*\}$/, '')
    cleaned = cleaned.replace(/\\n/g, '\n').replace(/\\"/g, '"')
    
    // Remove specific JSON field patterns that show up in instructions
    cleaned = cleaned.replace(/"programmingLanguage":\s*"[^"]*",?\s*/gi, '')
    cleaned = cleaned.replace(/"skillLevel":\s*"[^"]*",?\s*/gi, '')
    cleaned = cleaned.replace(/"challengeType":\s*"[^"]*",?\s*/gi, '')
    cleaned = cleaned.replace(/"topics":\s*\[[^\]]*\],?\s*/gi, '')
    cleaned = cleaned.replace(/"title":\s*"[^"]*",?\s*/gi, '')
    cleaned = cleaned.replace(/"description":\s*"[^"]*",?\s*/gi, '')
    cleaned = cleaned.replace(/"instructions":\s*"/gi, '')
    
    // Remove JSON structure artifacts
    cleaned = cleaned.replace(/^\{/, '').replace(/\}$/, '')
    cleaned = cleaned.replace(/^,\s*/, '').replace(/,\s*$/, '')
    
    // Remove ALL quotes (leading, trailing, and internal)
    cleaned = cleaned.replace(/^"+/, '').replace(/"+$/, '')
    cleaned = cleaned.replace(/^'+/, '').replace(/'+$/, '')
    
    // Remove any remaining quote artifacts
    cleaned = cleaned.replace(/",\s*$/, '').replace(/^,\s*"/, '')
    
    // Preserve proper spacing and line breaks
    cleaned = cleaned.replace(/\s+/g, ' ').trim()
    
    return cleaned
  }

  // Helper function to clean instructions content
  const cleanInstructions = (instructions: string) => {
    if (!instructions) return ''

    // Clean up JSON artifacts but preserve formatting
    return instructions
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
  }

  // Markdown-safe cleaner: unescapes JSON string artifacts but PRESERVES
  // newlines, indentation, and fenced code blocks so ReactMarkdown can format it.
  const cleanMarkdown = (text?: string) => {
    if (!text) return ''
    let s = text
      .replace(/\\r\\n/g, '\n')
      .replace(/\\r/g, '\n')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '  ')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")

    // If the whole thing is wrapped in a single code fence, unwrap it —
    // instructions are prose, not a code block.
    const fenced = s.trim().match(/^```[a-zA-Z]*\n([\s\S]*?)\n?```$/)
    if (fenced) s = fenced[1]

    // Dedent: remove the common leading whitespace from every line. The model
    // often indents the whole block, which Markdown would otherwise treat as a
    // code block (rendering **bold** and ### headings literally, in monospace).
    const lines = s.replace(/\t/g, '  ').split('\n')
    const indents = lines
      .filter((l) => l.trim().length > 0)
      .map((l) => l.match(/^ */)![0].length)
    const minIndent = indents.length ? Math.min(...indents) : 0
    if (minIndent > 0) {
      s = lines.map((l) => l.slice(minIndent)).join('\n')
    }

    return s.trim()
  }

  // Helper function to format numbered lists properly
  const formatInstructionsWithLists = (instructions: string) => {
    if (!instructions) return ''
    
    // Convert numbered lists to proper markdown format
    return instructions
      .replace(/^(\d+)\.\s+/gm, '$1. ')
      .replace(/^(\d+)\.\s+(.+)$/gm, (match, number, content) => {
        return `${number}. ${content}`
      })
  }

  // Helper function to format instructions with beautiful styling like Learning Objectives
  const formatInstructionsWithBeautifulStyling = (instructions: string) => {
    if (!instructions) return ''
    
    let result = instructions
      // Headers
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Inline code
      .replace(/`(.*?)`/g, '<code>$1</code>')
      // Numbered lists
      .replace(/^(\d+)\.\s+(.*$)/gm, '<li>$2</li>')
      // Bullet points
      .replace(/^[-*•]\s+(.*$)/gm, '<li>$1</li>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      // Wrap in paragraph
      .replace(/^(.+)$/gm, '<p>$1</p>')
      // Clean up empty paragraphs
      .replace(/<p><\/p>/g, '')
      .replace(/<p><br><\/p>/g, '')
    
    // Process lists after the main formatting
    const lines = result.split('\n')
    let inList = false
    let listType = ''
    let listItems = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.includes('<li>')) {
        if (!inList) {
          inList = true
          listType = line.includes('</li>') ? 'ol' : 'ul'
        }
        listItems.push(line)
      } else if (inList && !line.includes('<li>')) {
        if (listItems.length > 0) {
          const listHtml = `<${listType}>${listItems.join('')}</${listType}>`
          lines[i - listItems.length] = listHtml
          // Remove the individual li lines
          for (let j = i - listItems.length + 1; j < i; j++) {
            lines[j] = ''
          }
        }
        inList = false
        listItems = []
      }
    }
    
    // Handle case where list is at the end
    if (inList && listItems.length > 0) {
      const listHtml = `<${listType}>${listItems.join('')}</${listType}>`
      lines[lines.length - listItems.length] = listHtml
      for (let j = lines.length - listItems.length + 1; j < lines.length; j++) {
        lines[j] = ''
      }
    }
    
    return lines.filter(line => line.trim() !== '').join('\n')
  }

  // Clean up malformed starter code from AI: remove line comments and fix spaced JSX/HTML tags
  const sanitizeStarterCode = (rawCode: string, language: string): string => {
    if (!rawCode) return rawCode
    let code = rawCode
    
    // Remove full-line // comments only
    code = code.replace(/^\s*\/\/.*$/gm, '')
    // Remove inline // comment segments but keep trailing code tokens on the same line
    code = code.replace(/\/\/.*?(?=(?:\b(import|function|class|const|let|export|return)\b|<|$))/g, '')
    // Remove block comments
    code = code.replace(/\/\*[\s\S]*?\*\//g, '')

    // Fix spaced HTML/JSX close tags like < / div > -> </div>
    code = code.replace(/<\s*\/\s*([a-zA-Z0-9:_-]+)\s*>/g, '</$1>')
    // Fix spaced self-closing tags like < Greeting / > -> <Greeting />
    code = code.replace(/<\s*([a-zA-Z0-9:_-]+)([^>]*)\/\s*>/g, (_m, tag, attrs) => {
      const cleanedAttrs = String(attrs)
        .replace(/\s*=\s*/g, '=')
        .replace(/\s{2,}/g, ' ')
        .trim()
      return `<${tag}${cleanedAttrs ? ' ' + cleanedAttrs : ''} />`
    })
    // Fix spaced open tags like < div > -> <div>
    code = code.replace(/<\s*([a-zA-Z0-9:_-]+)([^>]*)\s*>/g, (_m, tag, attrs) => {
      const cleanedAttrs = String(attrs)
        .replace(/\s*=\s*/g, '=')
        .replace(/\s{2,}/g, ' ')
        .trim()
      return `<${tag}${cleanedAttrs ? ' ' + cleanedAttrs : ''}>`
    })

    // Collapse excessive spaces and empty lines while preserving code
    code = code.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')

    return code.trim()
  }

  // Decode escaped sequences without collapsing whitespace
  const decodeStarterCode = (text: string): string => {
    if (!text) return text
    return text
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '  ')
      .replace(/\r/g, '')
  }

  // Helper function to render code snippet
  const renderCodeSnippet = (code: string | undefined, language: string = 'javascript') => {
    if (!code) return null
    
    const normalizedLang = normalizeLanguage(language)
    // Display the model's code verbatim — only decode escape sequences and strip
    // carriage returns. Do NOT reformat: the old sanitize/formatCode steps
    // collapsed newlines (\s+ -> ' '), which merged comments into code.
    const formattedStarterCode = decodeStarterCode(code)
    const sanitizedStarter = formattedStarterCode

    return (
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-lg border border-gray-700 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Code className="text-red-400" size={18} />
            <span className="text-white text-lg font-semibold">Starter Code</span>
            <span className="text-gray-400 text-sm">({getLanguageDisplayName(language)})</span>
          </div>
          <button
            onClick={() => copyToClipboard(formattedStarterCode || sanitizedStarter, 'starter-code')}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md text-sm transition-colors border border-gray-600"
          >
            {copiedItems['starter-code'] ? (
              <>
                <Check size={14} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={14} />
                Copy Code
              </>
            )}
          </button>
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden shadow-inner">
          <Editor
            height="300px"
            language={normalizedLang}
            theme="vs-dark"
            value={formattedStarterCode}
            options={{
              ...monacoEditorOptions,
              tabSize: normalizedLang === 'python' ? 4 : 2,
              readOnly: true,
            }}
          />
        </div>
      </div>
    )
  }

  // Helper to format code for Monaco Editor
  const formatCodeForEditor = async (code: string, language: string): Promise<string> => {
    if (!code || !code.trim()) return code
    const lang = language.toLowerCase()
    try {
      if (lang === 'javascript' || lang === 'js') {
        return code
          .replace(/\s*:\s*/g, ':\n    ')
          .replace(/\n\s*/g, '\n')
          .replace(/\t/g, '    ')
      }
      if (lang === 'typescript' || lang === 'ts') {
        return code
          .replace(/\s*:\s*/g, ':\n    ')
          .replace(/\n\s*/g, '\n')
          .replace(/\t/g, '    ')
      }
      if (lang === 'json') {
        return code
          .replace(/\s*:\s*/g, ':\n    ')
          .replace(/\n\s*/g, '\n')
          .replace(/\t/g, '    ')
      }
      if (lang === 'css' || lang === 'scss' || lang === 'less') {
        return code
          .replace(/\s*:\s*/g, ':\n    ')
          .replace(/\n\s*/g, '\n')
          .replace(/\t/g, '    ')
      }
      if (lang === 'html') {
        return code
          .replace(/\s*:\s*/g, ':\n    ')
          .replace(/\n\s*/g, '\n')
          .replace(/\t/g, '    ')
      }
      if (lang === 'markdown' || lang === 'md') {
        return code
          .replace(/\s*:\s*/g, ':\n    ')
          .replace(/\n\s*/g, '\n')
          .replace(/\t/g, '    ')
      }
      // Python: basic indentation fix
      if (lang === 'python' || lang === 'py') {
        return code
          .replace(/\s*:\s*/g, ':\n    ')
          .replace(/\n\s*/g, '\n')
          .replace(/\t/g, '    ')
      }
      // Java, C, C++, C#, Go, Rust, etc.: add line breaks after braces and semicolons
      if ([
        'java', 'c', 'cpp', 'c++', 'csharp', 'go', 'rust', 'swift', 'kotlin', 'php', 'ruby', 'scala', 'dart', 'objective-c', 'perl', 'r', 'lua'
      ].includes(lang)) {
        return code
          .replace(/\s*{\s*/g, ' {\n  ')
          .replace(/\s*}\s*/g, '\n}\n')
          .replace(/;\s*/g, ';\n')
          .replace(/\n\s*/g, '\n')
          .replace(/\t/g, '  ')
      }
      // Fallback: basic cleanup
      return code.replace(/\t/g, '  ').replace(/\n\s*/g, '\n')
    } catch (e) {
      return code
    }
  }

  // Helper function to render solution content with IDE-like formatting
  const renderSolutionContent = (solution: string | undefined, formattedCode: string) => {
    if (!challenge) return null

    // Always have something to show: prefer the formatted code, fall back to the
    // raw solution string. This makes "Show Solution" work for every language.
    const codeToShow = (formattedCode && formattedCode.trim()) ? formattedCode : (solution || '').trim()

    if (!codeToShow && !solutionExplanation) {
      return (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 text-gray-300">
          No solution was provided for this challenge.
        </div>
      )
    }

    // Get the programming language with better fallback logic
    const programmingLang = challenge.programmingLanguage?.toLowerCase() ||
                           challenge.programmingLanguage ||
                           'javascript'

    const normalizedLang = normalizeLanguage(programmingLang)
    return (
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-lg border border-gray-700 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Code className="text-green-400" size={18} />
            <span className="text-white text-lg font-semibold">Solution</span>
            <span className="text-gray-400 text-sm">({getLanguageDisplayName(programmingLang)})</span>
          </div>
          <button
            onClick={() => {
              if (typeof formattedCode === 'string') {
                copyToClipboard(formattedCode, 'solution-code')
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md text-sm transition-colors border border-gray-600"
          >
            {copiedItems['solution-code'] ? (
              <>
                <Check size={14} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={14} />
                Copy Code
              </>
            )}
          </button>
        </div>
        {solutionExplanation && (
          <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-600">
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <HelpCircle className="text-blue-400" size={16} />
              Solution Explanation
            </h4>
            <div className="text-gray-200 leading-relaxed">
              <ReactMarkdown 
                components={{
                  h1: ({children}) => <h1 className="text-2xl font-bold text-white mb-4">{children}</h1>,
                  h2: ({children}) => <h2 className="text-xl font-bold text-white mb-3">{children}</h2>,
                  h3: ({children}) => <h3 className="text-lg font-bold text-white mb-2">{children}</h3>,
                  strong: ({children}) => <strong className="text-white font-semibold">{children}</strong>,
                  code: ({children}) => <code className="bg-gray-700 px-2 py-1 rounded text-sm font-mono text-yellow-300">{children}</code>,
                  ol: ({children}) => <ol className="list-decimal list-inside space-y-2 mb-4">{children}</ol>,
                  ul: ({children}) => <ul className="list-disc list-inside space-y-2 mb-4">{children}</ul>,
                  li: ({children}) => <li className="text-gray-200 leading-relaxed">{children}</li>,
                  p: ({children}) => <p className="mb-3 leading-relaxed">{children}</p>
                }}
              >
                {cleanInstructions(solutionExplanation)}
              </ReactMarkdown>
            </div>
          </div>
        )}
        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden shadow-inner">
          <Editor
            height="400px"
            language={normalizedLang}
            theme="vs-dark"
            value={codeToShow}
            options={{
              ...monacoEditorOptions,
              tabSize: normalizedLang === 'python' ? 4 : 2,
              readOnly: true,
            }}
          />
        </div>
      </div>
    )
  }

  // Universal syntax validator and error corrector - Enhanced Version
  const validateAndCorrectSyntax = (code: string, language: string): string => {
    if (!code || !code.trim()) return code

    let correctedCode = code.trim()
    const normalizedLang = normalizeLanguage(language)

    // Enhanced universal syntax corrections
    const fixUniversalSyntax = (text: string): string => {
      return text
        // Fix malformed operators - COMPREHENSIVE
        .replace(/\s*=\s*>\s*/g, ' => ')          // Arrow functions: "= >" → "=>"
        .replace(/\s*=\s*=\s*=\s*/g, ' === ')     // Strict equality: "= = =" → "==="
        .replace(/\s*=\s*=\s*/g, ' == ')          // Equality: "= =" → "=="
        .replace(/\s*!\s*=\s*=\s*/g, ' !== ')     // Strict not equal: "! = =" → "!=="
        .replace(/\s*!\s*=\s*/g, ' != ')          // Not equal: "! =" → "!="
        .replace(/\s*<\s*=\s*/g, ' <= ')          // Less equal: "< =" → "<="
        .replace(/\s*>\s*=\s*/g, ' >= ')          // Greater equal: "> =" → ">="
        .replace(/\s*&\s*&\s*/g, ' && ')          // Logical AND: "& &" → "&&"
        .replace(/\s*\|\|\s*/g, ' || ')        // Logical OR: "| |" → "||"
        .replace(/\s*\+\s*\+\s*/g, '++')          // Increment: "+ +" → "++"
        .replace(/\s*-\s*-\s*/g, '--')            // Decrement: "- -" → "--"
        .replace(/\s*\+\s*=\s*/g, ' += ')         // Addition assignment: "+ =" → "+="
        .replace(/\s*-\s*=\s*/g, ' -= ')          // Subtraction assignment: "- =" → "-="
        .replace(/\s*\*\s*=\s*/g, ' *= ')         // Multiplication assignment: "* =" → "*="
        .replace(/\s*\/\s*=\s*/g, ' /= ')         // Division assignment: "/ =" → "/="
        .replace(/\s*%\s*=\s*/g, ' %= ')          // Modulo assignment: "% =" → "%="
        
        // Fix spacing around basic operators with proper word boundaries
        .replace(/(\w)\s*\+\s*(\w)/g, '$1 + $2')
        .replace(/(\w)\s*-\s*(\w)/g, '$1 - $2')
        .replace(/(\w)\s*\*\s*(\w)/g, '$1 * $2')
        .replace(/(\w)\s*\/\s*(\w)/g, '$1 / $2')
        .replace(/(\w)\s*%\s*(\w)/g, '$1 % $2')
        .replace(/(\w)\s*=\s*(\w)/g, '$1 = $2')
        
        // Fix common keyword typos - COMPREHENSIVE
        .replace(/\bfucntion\b/g, 'function')
        .replace(/\bfunciton\b/g, 'function')
        .replace(/\bfuntion\b/g, 'function')
        .replace(/\bretrun\b/g, 'return')
        .replace(/\belsee\b/g, 'else')
        .replace(/\bvaar\b/g, 'var')
        .replace(/\bleet\b/g, 'let')
        .replace(/\bcosnt\b/g, 'const')
        .replace(/\biff\b/g, 'if')
        .replace(/\bforr\b/g, 'for')
        .replace(/\bwhilee\b/g, 'while')
        .replace(/\bpubllic\b/g, 'public')
        .replace(/\bprivatte\b/g, 'private')
        .replace(/\bprotectedd\b/g, 'protected')
        .replace(/\bstaticc\b/g, 'static')
        .replace(/\bclasss\b/g, 'class')
        .replace(/\bvoiid\b/g, 'void')
        .replace(/\bStringg\b/g, 'String')
        .replace(/\bbooleann\b/g, 'boolean')
        .replace(/\bdoublee\b/g, 'double')
        .replace(/\bfloatt\b/g, 'float')
        .replace(/\bintt\b/g, 'int')
    }

    // Language-specific syntax validation and correction
    if (normalizedLang === 'javascript' || normalizedLang === 'typescript') {
      correctedCode = fixUniversalSyntax(correctedCode)
        // Fix missing semicolons at line ends
        .replace(/([^;{}\s])\s*\n/g, '$1;\n')
        // Fix function declarations
        .replace(/function\s*\(\s*([^)]*)\s*\)\s*{/g, 'function($1) {')
        .replace(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(\s*([^)]*)\s*\)\s*{/g, 'function $1($2) {')
        // Fix arrow functions
        .replace(/\(\s*([^)]*)\s*\)\s*=>\s*{/g, '($1) => {')
        // Fix for loops
        .replace(/for\s*\(\s*([^;]*)\s*;\s*([^;]*)\s*;\s*([^)]*)\s*\)/g, 'for ($1; $2; $3)')
        // Fix if statements
        .replace(/if\s*\(\s*([^)]*)\s*\)/g, 'if ($1)')

    } else if (normalizedLang === 'python') {
      correctedCode = fixUniversalSyntax(correctedCode)
        // Fix Python keywords
        .replace(/\bdeef\b/g, 'def')
        .replace(/\bclasss\b/g, 'class')
        .replace(/\beliff\b/g, 'elif')
        // Fix function definitions
        .replace(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*([^)]*)\s*\)\s*:/g, 'def $1($2):')
        // Fix for loops
        .replace(/for\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+in\s+([^:]+)\s*:/g, 'for $1 in $2:')
        // Fix if statements
        .replace(/if\s+([^:]+)\s*:/g, 'if $1:')

    } else if (normalizedLang === 'csharp' || normalizedLang === 'java' || normalizedLang === 'cpp' || normalizedLang === 'c') {
      correctedCode = fixUniversalSyntax(correctedCode)
        // Fix missing semicolons
        .replace(/([^;{}\s])\s*\n/g, '$1;\n')
        // Fix method declarations with proper spacing
        .replace(/(public|private|protected|static|virtual|override|abstract|sealed)?\s*(void|int|string|String|bool|boolean|double|float|char|long|short|byte|object|Object)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*([^)]*)\s*\)\s*{/g, '$1 $2 $3($4) {')
        // Fix class declarations
        .replace(/(public|private|internal)?\s*class\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*{/g, '$1 class $2 {')
        // Fix property declarations (C#)
        .replace(/(public|private|protected)\s+(string|int|bool|double|float)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*{\s*get;\s*set;\s*}/g, '$1 $2 $3 { get; set; }')
        // Fix for loops
        .replace(/for\s*\(\s*([^;]*)\s*;\s*([^;]*)\s*;\s*([^)]*)\s*\)/g, 'for ($1; $2; $3)')
        // Fix if statements
        .replace(/if\s*\(\s*([^)]*)\s*\)/g, 'if ($1)')
        // Fix while loops
        .replace(/while\s*\(\s*([^)]*)\s*\)/g, 'while ($1)')
    }

    // Apply bracket matching and structural fixes
    correctedCode = fixBracketMatching(correctedCode, normalizedLang)
    correctedCode = fixStructuralIssues(correctedCode, normalizedLang)
    correctedCode = finalCleanup(correctedCode, normalizedLang)

    return correctedCode
  }

  // Fix bracket/brace/parenthesis matching
  const fixBracketMatching = (code: string, _language: string): string => {
    const brackets: { [key: string]: string } = { '(': ')', '[': ']', '{': '}' }
    const openBrackets = Object.keys(brackets)
    const closeBrackets = Object.values(brackets)
    
    const corrected = code
    const stack: string[] = []
    let result = ''
    
    for (let i = 0; i < corrected.length; i++) {
      const char = corrected[i]
      
      if (openBrackets.includes(char)) {
        stack.push(char)
        result += char
      } else if (closeBrackets.includes(char)) {
        if (stack.length === 0) {
          // Extra closing bracket - skip it
          continue
        }
        const last = stack.pop()
        if (last && brackets[last] === char) {
          result += char
        } else if (last) {
          // Mismatched bracket - fix it
          result += brackets[last]
          stack.push(last)
          if (stack.length > 0 && brackets[stack[stack.length - 1]] === char) {
            stack.pop()
            result += char
          }
        }
      } else {
        result += char
      }
    }
    
    // Add missing closing brackets
    while (stack.length > 0) {
      const bracket = stack.pop()
      if (bracket) {
        result += brackets[bracket]
      }
    }
    
    return result
  }

  // Fix common structural issues
  const fixStructuralIssues = (code: string, language: string): string => {
    let fixed = code
    
    // Fix missing return statements for functions that should return values
    if (language === 'javascript' || language === 'typescript') {
      // Add return statements for arrow functions that might be missing them
      fixed = fixed.replace(/=>\s*{([^}]*[^;return\s][^}]*)}/g, (match, body) => {
        if (!body.includes('return') && !body.includes(';')) {
          return `=> {\n  return ${body.trim()};\n}`
        }
        return match
      })
    }
    
    // Fix missing colons in Python
    if (language === 'python') {
      fixed = fixed.replace(/(if|elif|else|for|while|def|class|try|except|finally|with)\s+([^:\n]+)(\s*\n)/g, '$1 $2:\n')
    }
    
    // Fix missing semicolons in C-like languages
    if (['javascript', 'typescript', 'java', 'c++', 'c', 'csharp'].includes(language)) {
      fixed = fixed.replace(/([^;{}\s\n])\s*\n(?!\s*[})\]])/g, '$1;\n')
    }
    
    return fixed
  }

  // Final cleanup and validation
  const finalCleanup = (code: string, language: string): string => {
    let cleaned = code
    
    // Remove excessive whitespace
    cleaned = cleaned
      .replace(/\n\s*\n\s*\n/g, '\n\n')        // Max 2 consecutive newlines
      .replace(/[ \t]+$/gm, '')                // Remove trailing spaces
      .replace(/^[ \t]+/gm, (match) => {       // Normalize indentation
        const spaces = language === 'python' ? 4 : 2
        const level = Math.floor(match.length / spaces)
        return ' '.repeat(level * spaces)
      })
    
    // Fix spacing around operators (final pass)
    cleaned = cleaned
      .replace(/([a-zA-Z0-9_$\]\)])\s*([+\-*/%=<>!&|]+)\s*([a-zA-Z0-9_$\[\(])/g, '$1 $2 $3')
      .replace(/([+\-*/%=<>!&|]{2,})/g, (match) => {
        // Fix double operators
        if (match === '===') return ' === '
        if (match === '!==') return ' !== '
        if (match === '==') return ' == '
        if (match === '!=') return ' != '
        if (match === '<=') return ' <= '
        if (match === '>=') return ' >= '
        if (match === '&&') return ' && '
        if (match === '||') return ' || '
        if (match === '++') return '++'
        if (match === '--') return '--'
        if (match === '+=') return ' += '
        if (match === '-=') return ' -= '
        if (match === '*=') return ' *= '
        if (match === '/=') return ' /= '
        if (match === '%=') return ' %= '
        if (match === '=>') return ' => '
        return match
      })
    
    // Language-specific final validation
    if (language === 'javascript' || language === 'typescript') {
      // Ensure semicolons at end of statements
      cleaned = cleaned.replace(/([^;{}\n])\n/g, '$1;\n')
      
      // Fix console.log spacing
      cleaned = cleaned.replace(/console\s*\.\s*log\s*\(/g, 'console.log(')
      
      // Fix array/object access
      cleaned = cleaned.replace(/([a-zA-Z0-9_$])\s*\[\s*([^\]]+)\s*\]/g, '$1[$2]')
      cleaned = cleaned.replace(/([a-zA-Z0-9_$])\s*\.\s*([a-zA-Z0-9_$])/g, '$1.$2')
      
    } else if (language === 'python') {
      // Ensure proper indentation (Python is sensitive)
      const lines = cleaned.split('\n')
      let indentLevel = 0
      const correctedLines = lines.map(line => {
        const trimmed = line.trim()
        if (!trimmed) return ''
        
        // Decrease indent before certain keywords
        if (trimmed.startsWith('except') || trimmed.startsWith('finally') || 
            trimmed.startsWith('elif') || trimmed.startsWith('else')) {
          indentLevel = Math.max(0, indentLevel - 1)
        }
        
        const spaces = '    '.repeat(indentLevel)
        
        // Increase indent after colons
        if (trimmed.endsWith(':')) {
          const result = spaces + trimmed
          indentLevel++
          return result
        }
        
        return spaces + trimmed
      })
      cleaned = correctedLines.join('\n')
      
    } else if (language === 'java' || language === 'c++' || language === 'c' || language === 'csharp') {
      // Ensure semicolons
      cleaned = cleaned.replace(/([^;{}\n])\n/g, '$1;\n')
      
      // Fix method calls
      cleaned = cleaned.replace(/([a-zA-Z0-9_$])\s*\.\s*([a-zA-Z0-9_$])\s*\(/g, '$1.$2(')
      
      // Fix array access
      cleaned = cleaned.replace(/([a-zA-Z0-9_$])\s*\[\s*([^\]]+)\s*\]/g, '$1[$2]')
    }
    
    return cleaned.trim()
  }

  // Helper function to fix malformed code blocks
  const fixMalformedCode = (code: string, language: string): string => {
    if (!code) return code

    const lang = language.toLowerCase()
    let fixedCode = code.trim()

    // Fix code that's all squished on one line by adding proper line breaks
    if (lang === 'python') {
      fixedCode = fixedCode
        .replace(/def\s+([^:]+):\s*/g, 'def $1:\n    ')
        .replace(/if\s+([^:]+):\s*/g, 'if $1:\n    ')
        .replace(/elif\s+([^:]+):\s*/g, 'elif $1:\n    ')
        .replace(/else:\s*/g, 'else:\n    ')
        .replace(/for\s+([^:]+):\s*/g, 'for $1:\n    ')
        .replace(/while\s+([^:]+):\s*/g, 'while $1:\n    ')
        .replace(/class\s+([^:]+):\s*/g, 'class $1:\n    ')
        .replace(/try:\s*/g, 'try:\n    ')
        .replace(/except\s*([^:]*)?:\s*/g, 'except$1:\n    ')
        .replace(/finally:\s*/g, 'finally:\n    ')
        .replace(/with\s+([^:]+):\s*/g, 'with $1:\n    ')
        // Fix indentation
        .split('\n')
        .map((line: string, index: number) => {
          if (index === 0) return line
          if (line.trim() === '') return ''
          if (line.startsWith('def ') || line.startsWith('class ') || 
              line.startsWith('if ') || line.startsWith('elif ') || 
              line.startsWith('else') || line.startsWith('for ') || 
              line.startsWith('while ') || line.startsWith('try') || 
              line.startsWith('except') || line.startsWith('finally') || 
              line.startsWith('with ')) {
            return line
          }
          return '    ' + line.trim()
        })
        .join('\n')
        
    } else if (['javascript', 'typescript', 'java', 'csharp', 'cpp', 'c'].includes(lang)) {
      fixedCode = fixedCode
        .replace(/{\s*/g, ' {\n  ')
        .replace(/\s*}/g, '\n}')
        .replace(/;\s*(?![^{]*})/g, ';\n')
        .replace(/if\s*\(\s*([^)]+)\s*\)\s*/g, 'if ($1) ')
        .replace(/for\s*\(\s*([^)]+)\s*\)\s*/g, 'for ($1) ')
        .replace(/while\s*\(\s*([^)]+)\s*\)\s*/g, 'while ($1) ')
        // Fix indentation
        .split('\n')
        .map((line: string, index: number) => {
          if (index === 0) return line
          const trimmed = line.trim()
          if (trimmed === '' || trimmed === '}') return trimmed
          if (trimmed.includes('{') && !trimmed.includes('}')) {
            return '  ' + trimmed
          }
          if (!trimmed.startsWith('}')) {
            return '    ' + trimmed
          }
          return trimmed
        })
        .join('\n')
    }

    return fixedCode
  }

  // Helper to normalize code for comparison
  function normalizeCode(code: string) {
    return code.replace(/\s+/g, '').replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')
  }

  // Function to check code and submit completion
  async function handleSubmitCode(userCode: string, solutionCode: string, challengeId: string) {
    if (!user) {
      setResultMessage('Please log in to submit your solution.')
      setResultType('error')
      setShowResultModal(true)
      return
    }

    // Check if challenge has already been failed by showing solution
    if (challengeFailed) {
      setResultMessage('❌ This challenge has already been marked as failed because you revealed the solution. You cannot complete it anymore.')
      setResultType('error')
      setShowResultModal(true)
      return
    }

    setChecking(true)
    setIsEvaluating(true)
    setEvaluationResult(null)
    
    // Increment attempt count
    const currentAttempt = attemptCount + 1
    setAttemptCount(currentAttempt)
    
    // Calculate time taken
    const timeTaken = startTime ? Math.max(1, Math.round((new Date().getTime() - startTime.getTime()) / 60000)) : 1
    
    // Update challenge history - mark as ongoing if first attempt
    if (currentAttempt === 1) {
      try {
        await fetch('/api/challenge-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            challenge_id: challengeId,
            title: challenge?.title || 'Challenge',
            programmingLanguage: challenge?.programmingLanguage || 'javascript',
            skillLevel: challenge?.skillLevel || 'beginner',
            status: 'ongoing',
            attempts: currentAttempt,
            maxAttempts: 3
          })
        })
      } catch (error) {
        console.error('Error updating challenge history:', error)
      }
    }
    
    try {
      // First, evaluate the code using Gemini
      const evaluationResponse = await fetch('/api/evaluate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          challengeInstructions: challenge?.instructions || '',
          userCode,
          programmingLanguage: challenge?.programmingLanguage || 'javascript',
          attemptNumber: currentAttempt,
          timeTaken: timeTaken,
        }),
      })

      if (evaluationResponse.ok) {
        const evaluationData = await evaluationResponse.json()
        setEvaluationResult(evaluationData)
        
        if (evaluationData.result === 'PASS') {
          // Update challenge history - mark as completed
          try {
            await fetch('/api/challenge-history', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                user_id: user.id,
                challenge_id: challengeId,
                title: challenge?.title || 'Challenge',
                programmingLanguage: challenge?.programmingLanguage || 'javascript',
                skillLevel: challenge?.skillLevel || 'beginner',
                status: 'completed',
                attempts: currentAttempt,
                maxAttempts: 3
              })
            })
          } catch (error) {
            console.error('Error updating challenge history:', error)
          }

          // If code passes evaluation, complete the challenge
          const completeResponse = await fetch('/api/complete-challenge', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              challenge_id: challengeId,
              user_id: user.id,
              title: challenge?.title || 'Challenge',
              programmingLanguage: challenge?.programmingLanguage || 'javascript',
              skillLevel: challenge?.skillLevel || 'beginner',
              attempts: currentAttempt
            }),
          })

          if (completeResponse.ok) {
            const responseData = await completeResponse.json()
            
            // Check if there's a database-related error message
            if (responseData.error && responseData.error.includes('Database')) {
              // Code passed evaluation but database failed - show success with warning
              setCompleted(true)
              setResultMessage('🎉 Challenge completed successfully! Your solution is correct! (Note: Completion tracking unavailable)')
              setResultType('success')
              setShowResultModal(true)
              console.warn('Database warning:', responseData.error)
            } else if (responseData.message) {
              // Full success
              setCompleted(true)
              setResultMessage('🎉 Challenge completed successfully! Your solution is correct!')
              setResultType('success')
              setShowResultModal(true)
            } else {
              // Unexpected response
              setCompleted(true)
              setResultMessage('🎉 Challenge completed successfully! Your solution is correct!')
              setResultType('success')
              setShowResultModal(true)
            }
            

          } else {
            const errorData = await completeResponse.json()
            console.error('Challenge completion error:', errorData)
            setResultMessage(errorData.error || 'Failed to complete challenge. Please try again.')
            setResultType('error')
            setShowResultModal(true)
          }
        } else {
          // Check if this was the 3rd attempt
          if (currentAttempt >= 3) {
            // Update challenge history - mark as failed
            try {
              await fetch('/api/challenge-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  user_id: user.id,
                  challenge_id: challengeId,
                  title: challenge?.title || 'Challenge',
                  programmingLanguage: challenge?.programmingLanguage || 'javascript',
                  skillLevel: challenge?.skillLevel || 'beginner',
                  status: 'failed',
                  attempts: currentAttempt,
                  maxAttempts: 3
                })
              })
            } catch (error) {
              console.error('Error updating challenge history:', error)
            }
            
            setResultMessage(`❌ Challenge failed after ${currentAttempt} attempts. This challenge has been moved to your history.`)
            setResultType('error')
            setShowResultModal(true)
          } else {
            // Update challenge history - update attempts
            try {
              await fetch('/api/challenge-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  user_id: user.id,
                  challenge_id: challengeId,
                  title: challenge?.title || 'Challenge',
                  programmingLanguage: challenge?.programmingLanguage || 'javascript',
                  skillLevel: challenge?.skillLevel || 'beginner',
                  status: 'ongoing',
                  attempts: currentAttempt,
                  maxAttempts: 3
                })
              })
            } catch (error) {
              console.error('Error updating challenge history:', error)
            }
            
            setResultMessage(`❌ Your solution needs improvement: ${evaluationData.reason}`)
            setResultType('error')
            setShowResultModal(true)
          }
        }
      } else {
        setResultMessage('Failed to evaluate your code. Please try again.')
        setResultType('error')
        setShowResultModal(true)
      }
    } catch (error) {
      console.error('Error submitting code:', error)
      setResultMessage('An error occurred while evaluating your solution')
      setResultType('error')
      setShowResultModal(true)
    } finally {
      setChecking(false)
      setIsEvaluating(false)
    }
  }

  // Grade a structured multiple-choice quiz locally (no AI needed).
  async function handleQuizSubmit() {
    if (!user || !challenge?.questions?.length) return
    if (challengeFailed || completed) return

    const questions = challenge.questions
    const allAnswered = questions.every((_, i) => quizSelections[i] !== undefined)
    if (!allAnswered) {
      setResultMessage('Please answer every question before submitting.')
      setResultType('error')
      setShowResultModal(true)
      return
    }

    const score = questions.reduce(
      (acc, q, i) => acc + (quizSelections[i] === q.correctIndex ? 1 : 0),
      0
    )
    const total = questions.length
    const passed = score / total >= 0.7 // pass at 70%+

    setQuizResult({ score, total, passed })
    setQuizSubmitted(true)

    const currentAttempt = attemptCount + 1
    setAttemptCount(currentAttempt)

    const base = {
      user_id: user.id,
      challenge_id: challenge.id,
      title: challenge.title || 'Quiz',
      programmingLanguage: challenge.programmingLanguage || 'N/A',
      skillLevel: challenge.skillLevel || 'beginner',
      maxAttempts: 3,
    }

    try {
      if (passed) {
        setCompleted(true)
        await fetch('/api/challenge-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...base, status: 'completed', attempts: currentAttempt }),
        })
        await fetch('/api/complete-challenge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...base, attempts: currentAttempt }),
        })
        setResultMessage(`🎉 Passed! You scored ${score}/${total}. Review the explanations below.`)
        setResultType('success')
      } else if (currentAttempt >= 3) {
        setChallengeFailed(true)
        await fetch('/api/challenge-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...base, status: 'failed', attempts: currentAttempt }),
        })
        setResultMessage(`❌ Quiz failed after ${currentAttempt} attempts. You scored ${score}/${total}. See the explanations below.`)
        setResultType('error')
      } else {
        await fetch('/api/challenge-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...base, status: 'ongoing', attempts: currentAttempt }),
        })
        setResultMessage(`You scored ${score}/${total} — you need 70% to pass. Review the explanations and try again (attempt ${currentAttempt}/3).`)
        setResultType('error')
      }
    } catch (error) {
      console.error('Error saving quiz result:', error)
    }

    setShowResultModal(true)
  }

  // Function to handle solution reveal
  function handleShowSolution() {
    setShowSolutionModal(true)
  }
  function confirmShowSolution() {
    setShowSolutionModal(false)
    setShowSolution(true)
    setChallengeFailed(true)
    
    // Mark challenge as failed in the database
    if (user && challenge) {
      fetch('/api/challenge-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          challenge_id: challenge.id,
          title: challenge.title || 'Challenge',
          programmingLanguage: challenge.programmingLanguage || 'javascript',
          skillLevel: challenge.skillLevel || 'beginner',
          status: 'failed',
          attempts: attemptCount,
          maxAttempts: 3
        })
      }).catch(error => {
        console.error('Error marking challenge as failed:', error)
      })
    }
    
    // Show failure modal
    setResultMessage('❌ Challenge failed! You revealed the solution. This challenge has been marked as failed.')
    setResultType('error')
    setShowResultModal(true)
  }
  function cancelShowSolution() {
    setShowSolutionModal(false)
  }

  // Function to handle hints with auto-close
  async function handleShowHints() {
    if (!user || spendingHint) return // guard against double-clicks / double-spend
    setSpendingHint(true)

    // Each hint reveal costs exactly 2 coins (atomic on the server).
    try {
      const res = await fetch('/api/spend-coins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, amount: 2 }),
      })
      if (res.status === 402) {
        setResultMessage('💰 Not enough coins for a hint (each hint costs 2). Complete challenges to earn more coins!')
        setResultType('error')
        setShowResultModal(true)
        return
      }
      if (!res.ok) {
        setResultMessage('Could not use a hint right now. Please try again.')
        setResultType('error')
        setShowResultModal(true)
        return
      }
    } catch {
      setResultMessage('Could not use a hint right now. Please check your connection and try again.')
      setResultType('error')
      setShowResultModal(true)
      return
    } finally {
      setSpendingHint(false)
    }

    // Open the hints with a live 20s countdown.
    if (hintTimeout) clearInterval(hintTimeout)
    setShowHints(true)
    setHintSecondsLeft(20)
    const interval = setInterval(() => {
      setHintSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          setShowHints(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    setHintTimeout(interval)
  }

  function handleHideHints() {
    setShowHints(false)
    setHintSecondsLeft(0)
    if (hintTimeout) {
      clearInterval(hintTimeout)
      setHintTimeout(null)
    }
  }

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (hintTimeout) clearInterval(hintTimeout)
    }
  }, [hintTimeout])

  useEffect(() => {
    // Get challenge from localStorage (user-specific, passed from dashboard)
    const userKey = user?.id || "demo-user"
    const storedChallenge = localStorage.getItem(`challenge_${userKey}_${params.id}`)
    if (storedChallenge) {
      setChallenge(JSON.parse(storedChallenge))
    }

    // Restore the user's in-progress code so it survives leaving/returning.
    const savedCode = localStorage.getItem(`challenge_code_${userKey}_${params.id}`)
    if (savedCode !== null) {
      setUserCode(savedCode)
    }
    const savedDebugCode = localStorage.getItem(`challenge_debugcode_${userKey}_${params.id}`)
    if (savedDebugCode !== null) {
      setDebugCode(savedDebugCode)
    }
    const savedQuizAnswer = localStorage.getItem(`challenge_quizanswer_${userKey}_${params.id}`)
    if (savedQuizAnswer !== null) {
      setQuizAnswer(savedQuizAnswer)
    }
    const savedQuizSel = localStorage.getItem(`challenge_quizsel_${userKey}_${params.id}`)
    if (savedQuizSel !== null) {
      try {
        setQuizSelections(JSON.parse(savedQuizSel))
      } catch {}
    }
    setCodeHydrated(true)

    // Review mode (opened via ?review=1 from a completed/failed card): show the
    // user's submitted answer read-only + reveal the solution, no re-attempt.
    const isReview = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('review') === '1'
    setReviewMode(isReview)
    if (isReview) {
      setShowSolution(true)
      // Mark the quiz as submitted so the picked answers + correct answers and
      // explanations are shown (read-only).
      setQuizSubmitted(true)
    }

    setLoading(false)
    setStartTime(new Date())
  }, [params.id, user?.id])

  // Persist the user's code (coding) on every change (after hydration).
  useEffect(() => {
    if (!codeHydrated) return
    const userKey = user?.id || "demo-user"
    localStorage.setItem(`challenge_code_${userKey}_${params.id}`, userCode)
  }, [userCode, codeHydrated, params.id, user?.id])

  // Persist the user's fixed code (debug) on every change (after hydration).
  useEffect(() => {
    if (!codeHydrated) return
    const userKey = user?.id || "demo-user"
    localStorage.setItem(`challenge_debugcode_${userKey}_${params.id}`, debugCode)
  }, [debugCode, codeHydrated, params.id, user?.id])

  // Persist the user's quiz answer on every change (after hydration).
  useEffect(() => {
    if (!codeHydrated) return
    const userKey = user?.id || "demo-user"
    localStorage.setItem(`challenge_quizanswer_${userKey}_${params.id}`, quizAnswer)
  }, [quizAnswer, codeHydrated, params.id, user?.id])

  // Persist multiple-choice selections on every change (after hydration).
  useEffect(() => {
    if (!codeHydrated) return
    const userKey = user?.id || "demo-user"
    localStorage.setItem(`challenge_quizsel_${userKey}_${params.id}`, JSON.stringify(quizSelections))
  }, [quizSelections, codeHydrated, params.id, user?.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-[#DCC5B2] text-xl">Loading challenge...</div>
      </div>
    )
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-white mb-4">Challenge not found</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-[#DCC5B2] text-black px-6 py-2 rounded-lg hover:bg-opacity-80 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const renderChallengeContent = () => {
    // Use new structure if available, fallback to old content
    const instructions = challenge.instructions || challenge.content || ''
    const codeSnippet = challenge.codeSnippet

    if (challenge.challengeType === 'quiz') {
      return (
        <div className="space-y-6">
          {/* Challenge Title */}
          <div className="bg-gradient-to-r from-[#DCC5B2] to-[#B8A082] p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-black mb-2">
              📋 {challenge.title}
            </h2>
            <p className="text-black/80 text-lg">
              {challenge.description}
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-xl border border-gray-700 shadow-2xl">
            <h3 className="text-3xl text-white mb-8 flex items-center gap-4 font-bold">
              <HelpCircle className="text-[#DCC5B2]" size={32} />
              Challenge Instructions
            </h3>
            <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-xl border border-gray-700 min-h-[200px] max-h-none overflow-auto shadow-inner">
              <div className="text-gray-200 leading-relaxed break-words">
                <ReactMarkdown components={markdownComponents}>
                  {cleanMarkdown(instructions)}
                </ReactMarkdown>
              </div>
            </div>
          </div>

          {/* Code Snippet (only if necessary) */}
          {codeSnippet && codeSnippet.trim() && (
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-lg text-white mb-4 flex items-center gap-2">
                <Code className="text-[#DCC5B2]" size={16} />
                Starter Code
              </h3>
              <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
                {renderCodeSnippet(codeSnippet, challenge.programmingLanguage)}
              </div>
            </div>
          )}

          {/* Structured multiple-choice quiz */}
          {challenge.questions && challenge.questions.length > 0 ? (
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg text-white">Questions ({challenge.questions.length})</h3>
                {quizResult && (
                  <span className={`text-sm font-semibold px-3 py-1 rounded ${quizResult.passed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    Score: {quizResult.score}/{quizResult.total}
                  </span>
                )}
              </div>

              {challenge.questions.map((q, qi) => {
                const selected = quizSelections[qi]
                return (
                  <div key={qi} className="border-b border-gray-700 pb-5 last:border-0">
                    <p className="text-white font-medium mb-3">{qi + 1}. {q.question}</p>
                    <div className="space-y-2">
                      {q.options.map((opt, oi) => {
                        const isSelected = selected === oi
                        const isCorrect = oi === q.correctIndex
                        let style = 'border-gray-600 bg-gray-900 text-gray-200 hover:border-[#DCC5B2]'
                        if (quizSubmitted) {
                          if (isCorrect) style = 'border-green-500 bg-green-500/10 text-green-300'
                          else if (isSelected) style = 'border-red-500 bg-red-500/10 text-red-300'
                          else style = 'border-gray-700 bg-gray-900 text-gray-400'
                        } else if (isSelected) {
                          style = 'border-[#DCC5B2] bg-[#DCC5B2]/10 text-white'
                        }
                        return (
                          <button
                            key={oi}
                            type="button"
                            disabled={quizSubmitted || completed || challengeFailed}
                            onClick={() => setQuizSelections((prev) => ({ ...prev, [qi]: oi }))}
                            className={`w-full text-left px-4 py-2.5 rounded-lg border transition-colors disabled:cursor-not-allowed ${style}`}
                          >
                            <span className="font-mono mr-2">{String.fromCharCode(65 + oi)}.</span>
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                    {quizSubmitted && (
                      <div className="mt-3 text-sm bg-gray-900 border border-gray-700 rounded-lg p-3">
                        <span className={selected === q.correctIndex ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                          {selected === q.correctIndex ? '✓ Correct' : '✗ Incorrect'}
                        </span>
                        <span className="text-gray-400"> — correct answer: {String.fromCharCode(65 + q.correctIndex)}</span>
                        <p className="text-gray-300 mt-1"><span className="text-[#DCC5B2] font-medium">Explanation:</span> {q.explanation}</p>
                      </div>
                    )}
                  </div>
                )
              })}

              {!quizSubmitted && !completed && !challengeFailed && (
                <button
                  onClick={handleQuizSubmit}
                  className="bg-[#DCC5B2] text-black px-6 py-2 rounded-lg hover:bg-opacity-80 transition-colors font-medium"
                >
                  Submit Quiz
                </button>
              )}
            </div>
          ) : (
            /* Fallback: free-text answer (older quizzes without structured questions) */
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-lg text-white mb-4">Your Answer</h3>
              <textarea
                className="w-full h-32 bg-gray-900 text-white p-4 rounded border border-gray-600 focus:border-[#DCC5B2] outline-none resize-none disabled:opacity-50"
                placeholder="Type your answer here..."
                value={quizAnswer}
                onChange={(e) => setQuizAnswer(e.target.value)}
                disabled={completed || challengeFailed || reviewMode}
              />
              {!reviewMode && (
              <button
                onClick={() => {
                  if (!quizAnswer.trim()) {
                    setResultMessage('Please type an answer before submitting.')
                    setResultType('error')
                    setShowResultModal(true)
                    return
                  }
                  handleSubmitCode(quizAnswer, challenge.solution, challenge.id)
                }}
                disabled={isEvaluating || checking || challengeFailed || completed}
                className="mt-4 bg-[#DCC5B2] text-black px-6 py-2 rounded-lg hover:bg-opacity-80 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isEvaluating || checking ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                    Evaluating Answer...
                  </>
                ) : completed ? (
                  'Completed'
                ) : (
                  'Submit Answer'
                )}
              </button>
              )}
            </div>
          )}
        </div>
      )
    }

    if (challenge.challengeType === 'debug') {
      return (
        <div className="space-y-6">
          {/* Challenge Title */}
          <div className="bg-gradient-to-r from-[#DCC5B2] to-[#B8A082] p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-black mb-2">
              🐛 {challenge.title}
            </h2>
            <p className="text-black/80 text-lg">
              {challenge.description}
            </p>
          </div>

          {/* Code with Bugs — shown FIRST for debug challenges */}
          {codeSnippet && codeSnippet.trim() ? (
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-lg text-white mb-4 flex items-center gap-2">
                <Code className="text-red-400" size={16} />
                Code with Bugs
              </h3>
              <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
                {renderCodeSnippet(codeSnippet, challenge.programmingLanguage)}
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 p-6 rounded-lg border border-yellow-700/50 text-yellow-300/80 text-sm">
              No buggy code was provided for this challenge. Use the instructions below and write your corrected solution.
            </div>
          )}

          {/* Instructions — shown after the buggy code */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-xl border border-gray-700 shadow-2xl">
            <h3 className="text-3xl text-white mb-8 flex items-center gap-4 font-bold">
              <Target className="text-[#DCC5B2]" size={32} />
              Debug Instructions
            </h3>
            <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-xl border border-gray-700 min-h-[200px] max-h-none overflow-auto shadow-inner">
              <div className="text-gray-200 leading-relaxed break-words">
                <ReactMarkdown components={markdownComponents}>
                  {cleanMarkdown(instructions)}
                </ReactMarkdown>
              </div>
            </div>
          </div>

          {/* Fixed Code Editor */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Code className="text-green-400" size={16} />
                <span className="text-white text-lg">Your Fixed Code</span>
              </div>
              <button
                onClick={() => copyToClipboard(debugCode, 'debug-code')}
                className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors"
              >
                {copiedItems['debug-code'] ? (
                  <>
                    <Check size={14} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
              <Editor
                height="300px"
                language={normalizeLanguage(challenge.programmingLanguage?.toLowerCase() || challenge.programmingLanguage || 'javascript')}
                theme="vs-dark"
                value={debugCode}
                onChange={(value) => setDebugCode(value || "")}
                options={{
                  ...monacoEditorOptions,
                  tabSize: 2,
                  readOnly: reviewMode,
                }}
              />
            </div>
            {!reviewMode && (
            <button
              onClick={() => handleSubmitCode(debugCode, challenge.solution, challenge.id)}
              disabled={isEvaluating || checking || challengeFailed || completed}
              className="mt-4 bg-[#DCC5B2] text-black px-6 py-2 rounded-lg hover:bg-opacity-80 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isEvaluating || checking ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                  Evaluating Fix...
                </>
              ) : completed ? (
                'Completed'
              ) : (
                'Submit Fix'
              )}
            </button>
            )}
          </div>
        </div>
      )
    }

    // Default coding challenge
    return (
      <div className="space-y-6">
        {/* Challenge Title */}
        <div className="bg-gradient-to-r from-[#DCC5B2] to-[#B8A082] p-6 rounded-lg">
          <h2 className="text-2xl font-bold text-black mb-2">
            💻 {challenge.title}
          </h2>
          <p className="text-black/80 text-lg">
            {challenge.description}
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-2xl text-white mb-6 flex items-center gap-3 font-semibold">
            <Target className="text-[#DCC5B2]" size={24} />
            Challenge Instructions
          </h3>
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-700 min-h-[120px] max-h-none overflow-auto">
            <div className="text-gray-200 leading-relaxed break-words">
              <ReactMarkdown components={markdownComponents}>
                {cleanMarkdown(instructions)}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Starter Code (if any) */}
        {codeSnippet && (
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg text-white mb-4 flex items-center gap-2">
              <Code className="text-[#DCC5B2]" size={16} />
              Starter Code
            </h3>
            <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
              {renderCodeSnippet(codeSnippet, challenge.programmingLanguage)}
            </div>
          </div>
        )}

        {/* Code Editor */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Code className="text-green-400" size={16} />
              <span className="text-white text-lg">Your Solution</span>
            </div>
            <button
              onClick={() => copyToClipboard(userCode, 'user-code')}
              className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition-colors"
            >
              {copiedItems['user-code'] ? (
                <>
                  <Check size={14} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
            <Editor
              height="400px"
              language={normalizeLanguage(challenge.programmingLanguage?.toLowerCase() || challenge.programmingLanguage || 'javascript')}
              theme="vs-dark"
              value={userCode}
              onChange={(value) => setUserCode(value || "")}
              options={{
                ...monacoEditorOptions,
                tabSize: 2,
                readOnly: reviewMode,
              }}
            />
          </div>
          {!reviewMode && (
          <button
            onClick={() => handleSubmitCode(userCode, challenge.solution, challenge.id)}
            disabled={isEvaluating || checking || challengeFailed}
            className="mt-4 bg-[#DCC5B2] text-black px-6 py-2 rounded-lg hover:bg-opacity-80 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isEvaluating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                Evaluating Code...
              </>
            ) : checking ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                Submitting...
              </>
            ) : challengeFailed ? (
              'Challenge Failed - Solution Revealed'
            ) : (
              'Submit Solution'
            )}
          </button>
          )}
          
          {/* Evaluation Result Display */}
          {evaluationResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 p-6 rounded-lg border-2 relative ${
                evaluationResult.result === 'PASS' 
                  ? 'bg-gray-800 border-[#DCC5B2] text-white' 
                  : 'bg-gray-800 border-red-500 text-white'
              }`}
            >
              {/* Close Button */}
              <button
                onClick={() => setEvaluationResult(null)}
                className="absolute top-3 right-3 text-gray-400 hover:text-[#DCC5B2] transition-colors p-1 rounded-full hover:bg-gray-700"
              >
                <div className="w-5 h-5 flex items-center justify-center">✕</div>
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                {evaluationResult.result === 'PASS' ? (
                  <div className="w-10 h-10 bg-gradient-to-br from-[#DCC5B2] to-[#B8A082] rounded-full flex items-center justify-center">
                    <CheckCircle size={24} className="text-black" />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                <div>
                  <h3 className={`text-lg font-bold ${
                    evaluationResult.result === 'PASS' ? 'text-[#DCC5B2]' : 'text-red-400'
                  }`}>
                    {evaluationResult.result === 'PASS' ? '✅ Code Evaluation: PASS' : '❌ Code Evaluation: FAIL'}
                  </h3>
                  <div className={`text-sm ${
                    evaluationResult.result === 'PASS' ? 'text-gray-300' : 'text-gray-300'
                  }`}>
                    <p>Attempts: {evaluationResult.attempts || 1} / 3</p>
                    {evaluationResult.timeTaken && <p>Time Taken: {evaluationResult.timeTaken} minutes</p>}
                    <p>{evaluationResult.result === 'PASS' ? 'Your solution is correct!' : 'Your solution needs improvement'}</p>
                  </div>
                </div>
              </div>

              {/* Detailed Feedback */}
              <div className={`p-4 rounded-lg ${
                evaluationResult.result === 'PASS' 
                  ? 'bg-gray-700 border border-[#DCC5B2]' 
                  : 'bg-gray-700 border border-red-500'
              }`}>
                <h4 className={`font-semibold mb-2 ${
                  evaluationResult.result === 'PASS' ? 'text-[#DCC5B2]' : 'text-red-400'
                }`}>
                  {evaluationResult.result === 'PASS' ? 'Great job!' : 'What needs to be fixed:'}
                </h4>
                <p className={`text-sm leading-relaxed ${
                  evaluationResult.result === 'PASS' ? 'text-gray-300' : 'text-gray-300'
                }`}>
                  {evaluationResult.reason}
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-[#DCC5B2] hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Dashboard
            </button>
            {completed && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-2 bg-green-600 px-4 py-2 rounded-lg"
              >
                <CheckCircle size={20} />
                Challenge Completed!
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Challenge Info Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Challenge Details */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gray-800 p-6 rounded-lg space-y-4"
              >
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-[#DCC5B2]" />
                  <span className="text-sm">{challenge.estimatedTime}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Target size={16} className="text-[#DCC5B2]" />
                  <span className="text-sm capitalize">{challenge.skillLevel}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Code size={16} className="text-[#DCC5B2]" />
                  <span className="text-sm">{challenge.programmingLanguage}</span>
                </div>
              </motion.div>

              {/* Topics */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gray-800 p-6 rounded-lg"
              >
                <h3 className="text-lg font-semibold mb-3">Topics Covered</h3>
                <div className="flex flex-wrap gap-2">
                  {challenge.topics.map((topic, index) => (
                    <span
                      key={index}
                      className="bg-[#DCC5B2] text-black px-3 py-1 rounded-full text-sm"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Learning Objectives */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gray-800 p-6 rounded-lg"
              >
                <h3 className="text-lg font-semibold mb-3">Learning Objectives</h3>
                <ul className="space-y-2">
                  {challenge.learningObjectives.map((objective, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Star size={12} className="text-[#DCC5B2] mt-1 flex-shrink-0" />
                      {objective}
                    </li>
                  ))}
                </ul>
              </motion.div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={showHints ? handleHideHints : handleShowHints}
                  className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-lg transition-colors"
                >
                  <HelpCircle size={16} />
                  {showHints ? 'Hide Hints' : 'Show Hints (−2 coins)'}
                </button>
                <button
                  onClick={handleShowSolution}
                  className="w-full flex items-center justify-center gap-2 bg-[#DCC5B2] text-black hover:bg-opacity-80 px-4 py-3 rounded-lg transition-colors"
                >
                  <Code size={16} />
                  Show Solution
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {reviewMode && (
                <div className="bg-[#DCC5B2]/15 border border-[#DCC5B2]/40 text-[#DCC5B2] rounded-lg px-4 py-3 text-sm flex items-center gap-2">
                  <CheckCircle size={16} />
                  Review mode — viewing your submitted answer and the solution. Use “Redo / Retake” on the dashboard to attempt it fresh.
                </div>
              )}
              {renderChallengeContent()}

              {/* Hints */}
              {showHints && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-800 rounded-xl border border-gray-700 shadow-lg overflow-hidden"
                >
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700 bg-gray-800/80">
                    <h3 className="text-base font-semibold text-white flex items-center gap-2">
                      <HelpCircle size={18} className="text-[#DCC5B2]" />
                      Hints
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 tabular-nums">closes in {hintSecondsLeft}s</span>
                      <button
                        onClick={handleHideHints}
                        className="text-gray-400 hover:text-white transition-colors"
                        aria-label="Close hints"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Live countdown bar */}
                  <div className="h-1 bg-gray-700">
                    <div
                      className="h-full bg-[#DCC5B2] transition-all duration-1000 ease-linear"
                      style={{ width: `${(hintSecondsLeft / 20) * 100}%` }}
                    />
                  </div>

                  <ul className="p-5 space-y-3">
                    {challenge.hints.map((hint, index) => (
                      <li key={index} className="text-gray-200 text-sm flex items-start gap-3">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#DCC5B2]/20 text-[#DCC5B2] text-xs flex items-center justify-center font-semibold">{index + 1}</span>
                        <span className="leading-relaxed">{hint}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Solution */}
              {showSolution && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-green-900 p-6 rounded-lg border border-green-700"
                >
                  <h3 className="text-xl font-semibold mb-6 text-green-200 flex items-center gap-3">
                    <CheckCircle size={24} />
                    ✅ Complete Solution
                  </h3>
                  <div className="space-y-6">
                    {renderSolutionContent(challenge.solution, formattedSolutionCode)}
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Modal for solution reveal confirmation */}
      {showSolutionModal && (
        <Modal onClose={cancelShowSolution}>
          <div className="p-6 text-center max-w-md mx-auto">
            {/* Warning Icon */}
            <div className="w-16 h-16 bg-gradient-to-br from-[#DCC5B2] to-[#B8A082] rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="text-2xl">⚠️</div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold mb-4 text-white">Are you sure?</h2>

            {/* Warning Message */}
            <div className="mb-6 p-4 bg-gray-700 border border-[#DCC5B2] rounded-lg">
              <p className="text-sm leading-relaxed text-gray-300">
                If you check the solution, you will automatically lose the challenge. 
                <strong className="text-[#DCC5B2]"> Try harder before revealing the answer!</strong>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center">
              <button 
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                onClick={confirmShowSolution}
              >
                Show Solution
              </button>
              <button 
                className="px-6 py-3 bg-[#DCC5B2] hover:bg-[#B8A082] text-black rounded-lg font-medium transition-colors"
                onClick={cancelShowSolution}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Modal for result */}
      {showResultModal && (
        <Modal onClose={() => setShowResultModal(false)}>
          <div className="p-6 text-center max-w-md mx-auto">
            {/* Icon and Title */}
            <div className="mb-4">
              {resultType === 'success' ? (
                <div className="w-16 h-16 bg-gradient-to-br from-[#DCC5B2] to-[#B8A082] rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle size={32} className="text-black" />
                </div>
              ) : (
                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              <h2 className={`text-2xl font-bold ${resultType === 'success' ? 'text-[#DCC5B2]' : 'text-red-400'}`}>
                {resultType === 'success' ? '🎉 Success!' : '❌ Try Again'}
              </h2>
            </div>

            {/* Message */}
            <div className={`mb-6 p-4 rounded-lg ${
              resultType === 'success' 
                ? 'bg-gray-700 border border-[#DCC5B2]' 
                : 'bg-gray-700 border border-red-500'
            }`}>
              <p className={`text-sm leading-relaxed ${
                resultType === 'success' ? 'text-gray-300' : 'text-gray-300'
              }`}>
                {resultMessage}
              </p>
            </div>

            {/* Action Buttons */}
            {resultType === 'success' ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-400 mb-4">What would you like to do next?</p>
                <div className="flex flex-col gap-2">
                  <button 
                    className="px-6 py-3 bg-[#DCC5B2] hover:bg-[#B8A082] text-black rounded-lg font-medium transition-colors"
                    onClick={() => {
                      setShowResultModal(false)
                      router.push('/dashboard')
                    }}
                  >
                    🏠 Back to Dashboard
                  </button>
                  <button 
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                    onClick={() => setShowResultModal(false)}
                  >
                    📝 Stay in Challenge
                  </button>
                </div>
              </div>
            ) : challengeFailed ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-400 mb-4">What would you like to do next?</p>
                <div className="flex flex-col gap-2">
                  <button 
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                    onClick={() => {
                      setShowResultModal(false)
                      router.push('/dashboard')
                    }}
                  >
                    🏠 Back to Dashboard
                  </button>
                  <button 
                    className="px-6 py-3 bg-[#DCC5B2] hover:bg-[#B8A082] text-black rounded-lg font-medium transition-colors"
                    onClick={() => setShowResultModal(false)}
                  >
                    📝 Stay and Review Solution
                  </button>
                </div>
              </div>
            ) : (
              <button 
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                onClick={() => setShowResultModal(false)}
              >
                OK
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

// Require login before viewing/working on a challenge.
export default function ChallengePageGated() {
  return (
    <ProtectedRoute>
      <ChallengePage />
    </ProtectedRoute>
  )
} 