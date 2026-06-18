import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const {
      topics,
      skillLevel,
      projectType,
      techStack,
      timeEstimate,
      userId,
      questionCount,
      quickMode = false
    } = await request.json()

    // Quiz question count, clamped to 5–20. Only meaningful for quiz challenges.
    const isQuiz = String(projectType).toLowerCase() === 'quiz'
    const numQuestions = Math.min(20, Math.max(5, Number(questionCount) || 5))

    if (!topics || !skillLevel || !projectType) {
      return NextResponse.json(
        { error: 'Missing required fields: topics, skillLevel, and projectType are required' },
        { status: 400 }
      )
    }

    // AI providers (Groq primary, OpenRouter backup) are read inside callAI.
    if (!process.env.GROQ_API_KEY && !process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'No AI provider configured (set GROQ_API_KEY or OPENROUTER_API_KEY)' },
        { status: 500 }
      )
    }

    const systemPrompt = `You are an expert AI programming tutor and challenge generator. Your mission is to create PERFECTLY tailored coding challenges that match the user's exact skill level and selected topics.

🎯 SKILL LEVEL INTELLIGENCE:
- BEGINNER: Use only basic syntax, simple concepts, step-by-step instructions, no complex logic, focus on fundamentals
- INTERMEDIATE: Include real-world scenarios, moderate complexity, some optimization, practical applications
- ADVANCED: Complex algorithms, design patterns, performance optimization, architectural decisions, edge cases

📚 TOPIC STRICTNESS:
- ONLY use the exact topics selected by the user
- DO NOT introduce any concepts outside the selected topics
- If topics are insufficient for the skill level, create a simpler challenge that fits the topics
- Each challenge must directly practice the selected topics

🎨 FORMATTING REQUIREMENTS:
- Instructions must be crystal clear with step-by-step guidance
- DO NOT include code examples or hints in the instructions
- Instructions should only contain requirements and steps, not solutions
- Code snippets must be properly formatted with correct syntax highlighting
- Use consistent indentation and spacing (2 spaces for JS/TS, 4 for Python)
- Separate explanation text from code blocks clearly
- Starter code must be properly formatted with line breaks, not all on one line
- Comments should be on separate lines or properly spaced
- JSX/HTML tags should be properly indented and formatted

🔧 CHALLENGE TYPES:
- CODING: Build something practical using the selected topics
- QUIZ: Test understanding of the selected topics with multiple choice
- DEBUG: Provide broken code related to the selected topics to fix



🧾 OUTPUT FORMAT (STRICT JSON):
{
  "title": "Clear, descriptive title",
  "description": "Brief overview of what they'll learn",
  "programmingLanguage": "exact language name",
  "skillLevel": "beginner|intermediate|advanced",
  "challengeType": "Coding|Quiz|Debug",
  "topics": ["exact selected topics"],
  "instructions": "Detailed, step-by-step requirements and instructions ONLY - NO code examples, NO hints, NO solutions",
  "codeSnippet": "ONLY include if starter code is absolutely necessary for the challenge",
  "solution": "ONLY the code solution - NO explanations or text",
  "solutionExplanation": "Detailed explanation of the solution in plain English",
  "learningObjectives": ["specific objectives related to selected topics"],
  "estimatedTime": "realistic time estimate",
  "hints": ["helpful hints related to selected topics"]
}`

    const userPrompt = `Create a ${skillLevel.toUpperCase()}-level ${projectType} challenge.

STRICT REQUIREMENTS:
- Programming Language: ${techStack?.[0] || 'JavaScript'}
- Selected Topics: ${topics.join(', ')}

TIME ESTIMATE (REQUIRED — set "estimatedTime" realistically):
- Calculate "estimatedTime" yourself based on the ACTUAL difficulty of THIS challenge: the skill level (${skillLevel}), the programming language (${techStack?.[0] || 'JavaScript'}), and the specific topics (${topics.join(', ')}).
- Do NOT use a fixed/generic value. A trivial beginner one-liner might be "5-10 minutes"; a multi-step intermediate task "30-45 minutes"; a complex advanced/algorithmic task "1-2 hours".
- Account for language verbosity (e.g. Java/C++ take longer than Python for equivalent logic) and how many topics must be combined.
- Return a concise human range like "15-25 minutes" or "1-2 hours".

SKILL LEVEL SPECIFICATIONS:
${skillLevel === 'beginner' ? 
  '- Use ONLY basic syntax and fundamental concepts\n- Provide step-by-step instructions\n- Include simple examples\n- Focus on understanding the basics' :
  skillLevel === 'intermediate' ? 
  '- Include real-world scenarios and practical applications\n- Add moderate complexity and optimization\n- Use industry best practices\n- Include error handling and edge cases' :
  '- Implement complex algorithms and design patterns\n- Focus on performance optimization\n- Include architectural decisions\n- Cover advanced concepts and scalability'
}

TOPIC RESTRICTIONS:
- ONLY use these exact topics: ${topics.join(', ')}
- DO NOT introduce any concepts outside these topics
- If the topics are too basic for ${skillLevel} level, create a simpler challenge that fits the topics
- Every part of the challenge must directly practice the selected topics

INSTRUCTIONS FORMAT:
- Instructions should contain ONLY requirements and steps
- DO NOT include code examples or solutions in instructions

STARTER CODE FORMATTING:
- If starter code is provided, it must be properly formatted with line breaks
- Each statement should be on its own line
- Comments should be properly spaced and formatted
- JSX/HTML tags should be properly indented
- Use consistent indentation (2 spaces for JS/TS)
- DO NOT put all code on one line
- Each semicolon-separated statement should be on a new line
- Comments should be on separate lines, not inline with code
- DO NOT include hints or tips in instructions
- Keep instructions focused on what to do, not how to do it
- Save all examples and hints for the separate hints array

CODE SNIPPET RULES:
- ONLY include starter code if it's absolutely necessary for the challenge
- For most challenges, leave codeSnippet empty
- Only use for debugging challenges or when specific code structure is required

SOLUTION FORMAT:
- solution: ONLY the working code, no explanations
- solutionExplanation: detailed explanation in plain English

INSTRUCTIONS FORMATTING:
- Use **bold** for important concepts
- Use numbered lists (1., 2., 3.) for steps
- Use bullet points (•) for lists
- Use proper headings with ###
- Make it visually structured and easy to read`

    const isDebug = String(projectType).toLowerCase() === 'debug'
    const debugInstruction = isDebug
      ? `\n\nDEBUG FORMAT (STRICT, REQUIRED):
- This is a DEBUG challenge. "codeSnippet" MUST contain a complete, runnable-looking program in ${techStack?.[0] || 'JavaScript'} that CONTAINS one or more intentional bugs (logic, syntax, or edge-case errors) related to the selected topics.
- "instructions" must describe what the code is supposed to do and ask the user to find and fix the bug(s) — WITHOUT revealing the fix.
- "solution" must contain the corrected code.
- Do NOT leave codeSnippet empty for a debug challenge.`
      : ''

    // For quizzes, require a structured multiple-choice question set.
    const quizInstruction = isQuiz
      ? `\n\nQUIZ FORMAT (STRICT, REQUIRED):
- This is a QUIZ. In the JSON include a "questions" array containing EXACTLY ${numQuestions} multiple-choice questions.
- Each item MUST be: { "question": string, "options": [exactly 4 distinct strings], "correctIndex": integer 0-3, "explanation": string that explains why the correct option is right }
- Questions must test ONLY the selected topics at the ${skillLevel} level.
- Keep top-level "title" and a short "instructions" intro (1-2 sentences).
- Do NOT include "codeSnippet" or "solution" for a quiz.
- Output STRICT JSON only.`
      : ''

    // Call OpenRouter with the ordered free-model fallback chain. The validator
    // rejects any model whose output isn't a usable challenge JSON, so the chain
    // advances to the next model instead of accepting garbage.
    const aiResult = await callAI({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt + quizInstruction + debugInstruction },
      ],
      temperature: 0.7,
      topP: 0.95,
      maxTokens: isQuiz ? 4096 : 2048,
      jsonMode: true,
      validate: (content) => {
        const parsed = parseChallengeJson(content)
        if (!parsed) return false
        if (isQuiz) {
          return Array.isArray(parsed.questions) && parsed.questions.length >= 1
        }
        return true
      },
    })

    const challengeData = aiResult ? parseChallengeJson(aiResult.content) : null

    if (!challengeData) {
      console.log('AI service unavailable or returned unusable output — using fallback challenge')
      return generateQuickFallbackChallenge(topics, skillLevel, projectType, techStack, userId)
    }

    // Preserve the model's code VERBATIM — only unescape JSON escape sequences
    // and normalize line endings. Do NOT run regex "reformatters": they collapse
    // newlines and merge comments into code (the source of the mangled snippet).
    const tidyCode = (code: unknown): string =>
      String(code).replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\t/g, '    ').replace(/\r/g, '')

    if (challengeData.solution) {
      challengeData.solution = tidyCode(challengeData.solution)
    }
    if (challengeData.codeSnippet) {
      challengeData.codeSnippet = tidyCode(challengeData.codeSnippet)
    }

    // Normalize challengeType to the lowercase value the UI branches on
    // (the model may return "Quiz"/"Coding"/"Debug").
    challengeData.challengeType = String(projectType).toLowerCase()

    console.log(`✅ [CHALLENGE] "${challengeData.title}" (${projectType}, ${challengeData.programmingLanguage || techStack?.[0]}) created by ${aiResult?.model}`)

    const finalResponse = {
      ...challengeData,
      id: generateProjectId(),
      createdAt: new Date().toISOString(),
      userId: userId || null,
      type: projectType,
      originalTopics: topics,
      difficulty: challengeData.skillLevel,
      techStack: [challengeData.programmingLanguage],
      estimatedTime: challengeData.estimatedTime,
      // Ensure solutionExplanation is included
      solutionExplanation: challengeData.solutionExplanation || ''
    }

    return NextResponse.json(finalResponse)

  } catch (error: any) {
    console.error('Error generating project:', error)
    return NextResponse.json(
      { error: 'Failed to generate project. Please try again.' },
      { status: 500 }
    )
  }
}

// Helper function to generate quick fallback challenges
function generateQuickFallbackChallenge(topics: string[], skillLevel: string, projectType: string, techStack: string[] | undefined, userId: string | null) {
  const fallbackChallenge = {
    title: `${skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1)} ${projectType} Challenge`,
    description: `A ${skillLevel}-level ${projectType} challenge focused on: ${topics.join(', ')}`,
    programmingLanguage: techStack?.[0] || "JavaScript",
    skillLevel: skillLevel,
    challengeType: projectType,
    topics: topics,
    instructions: `Create a ${projectType} challenge that focuses on ${topics.join(' and ')}. This is a ${skillLevel}-level challenge that will help you practice and improve your understanding of these concepts.`,
    codeSnippet: "",
    solution: "// Solution will be provided after you attempt the challenge.",
    solutionExplanation: "Detailed explanation will be provided after you attempt the challenge.",
    learningObjectives: topics,
    estimatedTime: skillLevel === 'beginner' ? '15-30 minutes' : 
                  skillLevel === 'intermediate' ? '30-60 minutes' : '60-120 minutes',
    hints: [
      "Break down the problem into smaller parts", 
      "Review the topics you've learned",
      "Test your solution with different inputs",
      "Consider edge cases in your implementation"
    ]
  }
  
  const finalResponse = {
    ...fallbackChallenge,
    id: generateProjectId(),
    createdAt: new Date().toISOString(),
    userId: userId || null,
    type: projectType,
    originalTopics: topics,
    difficulty: fallbackChallenge.skillLevel,
    techStack: [fallbackChallenge.programmingLanguage],
    estimatedTime: fallbackChallenge.estimatedTime,
    solutionExplanation: fallbackChallenge.solutionExplanation || ''
  }

  return NextResponse.json(finalResponse)
}

// Helper function to generate unique project IDs
function generateProjectId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Robustly extract a challenge object from a model's raw text. Returns the
// parsed object only if it has the required fields (title + instructions);
// otherwise null. Used both to validate a model's output and to parse it.
function parseChallengeJson(content: string): any | null {
  if (!content) return null
  let s = content.trim()

  // Strip surrounding markdown code fences if present.
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '')

  // Extract the outermost { ... } block.
  const first = s.indexOf('{')
  const last = s.lastIndexOf('}')
  if (first === -1 || last === -1 || last <= first) return null
  s = s.substring(first, last + 1)

  const tryParse = (str: string): any | null => {
    try {
      return JSON.parse(str)
    } catch {
      return null
    }
  }

  // Attempt 1: parse as-is (well-formed JSON, pretty-printed or not).
  let obj = tryParse(s)

  // Attempt 2: repair common issues — strip control chars, normalize smart
  // quotes — then retry. (We deliberately do NOT escape structural newlines,
  // which corrupted valid pretty-printed JSON before.)
  if (!obj) {
    const repaired = s
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
    obj = tryParse(repaired)
  }

  if (!obj || typeof obj !== 'object') return null
  if (!obj.title || !obj.instructions) return null
  return obj
}

// Helper function to process and format code blocks properly
function processCodeBlocks(content: string, language: string): string {
  if (!content) return content;
  let processed = content;
  const lang = language.toLowerCase();
  
  // FORCE FIX: Pre-process any single-line JavaScript code before code block processing
  if (lang === 'javascript' || lang === 'typescript') {
    // Look for any single-line code patterns and fix them immediately
    processed = processed.replace(/([^`\n]*\/\/[^`\n]*[a-zA-Z_][^`\n]*;)/g, (match) => {
      // This matches any line with comments followed by code with semicolons
      return match.replace(/;/g, ';\n').replace(/\n\s*\n/g, '\n\n');
    });
  }
  
  // Clean up code block markers and extract content
  processed = processed
    .replace(/```\s*(\w+)?\s*/g, '```$1\n')
    .replace(/\s*```/g, '\n```');

  if (processed.includes('```')) {
    processed = processed.replace(/```(\w+)?\n([\s\S]*?)\n```/g, (match: string, detectedLang: string, code: string) => {
      const actualLang = (detectedLang || lang).toLowerCase();
      let fixedCode = code.trim();

      // FORCE FIX: Always apply JavaScript formatting if it's JS/TS
      if (actualLang === 'javascript' || actualLang === 'typescript') {
        // ALWAYS apply the single-line formatter for JavaScript
        fixedCode = formatSingleLineJavaScript(fixedCode);
      } else {
        // Enhanced language-specific formatting
        switch (actualLang) {
          case 'python':
            fixedCode = formatPythonCode(fixedCode);
            break;
          case 'java':
            fixedCode = formatJavaCode(fixedCode);
            break;
          case 'csharp':
          case 'c#':
            fixedCode = formatCSharpCode(fixedCode);
            break;
          case 'cpp':
          case 'c++':
            fixedCode = formatCppCode(fixedCode);
            break;
          case 'c':
            fixedCode = formatCCode(fixedCode);
            break;
          case 'php':
            fixedCode = formatPhpCode(fixedCode);
            break;
          case 'ruby':
            fixedCode = formatRubyCode(fixedCode);
            break;
          case 'go':
            fixedCode = formatGoCode(fixedCode);
            break;
          case 'rust':
            fixedCode = formatRustCode(fixedCode);
            break;
          default:
            fixedCode = formatGenericCode(fixedCode, actualLang);
        }
      }

      return `\`\`\`${detectedLang || actualLang}\n${fixedCode}\n\`\`\``;
    });
  }
  
  return processed;
}

// BRUTE FORCE: Hard fix for single-line JavaScript code with comments
function formatSingleLineJavaScript(code: string): string {
  // Step 1: Replace all semicolons with semicolon + newline
  let formatted = code.replace(/;/g, ';\n');
  
  // Step 2: Split by newlines and process each line
  const lines = formatted.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Step 3: Process each line to ensure proper formatting
  const processedLines = lines.map(line => {
    // If it's a comment, keep it as is
    if (line.startsWith('//')) {
      return line;
    }
    
    // If it ends with semicolon, keep it
    if (line.endsWith(';')) {
      return line;
    }
    
    // If it's a JSX/HTML line (contains < or >), don't add semicolon
    if (line.includes('<') || line.includes('>')) {
      return line;
    }
    
    // If it's an import/export, add semicolon if missing
    if (line.startsWith('import') || line.startsWith('export')) {
      return line.endsWith(';') ? line : line + ';';
    }
    
    // For everything else, add semicolon if missing
    return line.endsWith(';') ? line : line + ';';
  });
  
  // Step 4: Join with double newlines for better readability
  return processedLines.join('\n\n');
}

// Language-specific formatting functions
function formatPythonCode(code: string): string {
  return code
    .replace(/:\s*([a-zA-Z_#])/g, ':\n    $1')
    .replace(/\s+(def|if|for|while|class|try|except|finally|with|elif|else)\s+/g, '\n$1 ')
    .replace(/return\s+([^\n]+?)\s+([a-zA-Z_])/g, 'return $1\n$2')
    .replace(/print\s*\([^)]+\)\s*([a-zA-Z_])/g, (match: string, identifier: string) => `${match.slice(0,-identifier.length)}\n${identifier}`)
    .replace(/^\s*#/gm, '    #')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

function formatJavaScriptCode(code: string): string {
  // BRUTE FORCE APPROACH: Replace all semicolons with semicolon + newline
  let formatted = code.replace(/;/g, ';\n');
  
  // Split by newlines and clean up
  const lines = formatted.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  // Process each line
  const processedLines = lines.map(line => {
    // Comments stay as is
    if (line.startsWith('//')) {
      return line;
    }
    
    // JSX/HTML content (no semicolon)
    if (line.includes('<') || line.includes('>')) {
      return line;
    }
    
    // Import/export statements
    if (line.startsWith('import') || line.startsWith('export')) {
      return line.endsWith(';') ? line : line + ';';
    }
    
    // Everything else gets a semicolon if missing
    return line.endsWith(';') ? line : line + ';';
  });
  
  // Join with double newlines for readability
  return processedLines.join('\n\n');
}

function formatJavaCode(code: string): string {
  return code
    .replace(/{\s*([a-zA-Z_])/g, '{\n    $1')
    .replace(/;\s*([a-zA-Z_])/g, ';\n$1')
    .replace(/}\s*([a-zA-Z_])/g, '}\n$1')
    .replace(/}\s*else/g, '} else')
    .replace(/}\s*catch/g, '} catch')
    .replace(/}\s*finally/g, '} finally')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

function formatCSharpCode(code: string): string {
  return code
    .replace(/{\s*([a-zA-Z_])/g, '{\n    $1')
    .replace(/;\s*([a-zA-Z_])/g, ';\n$1')
    .replace(/}\s*([a-zA-Z_])/g, '}\n$1')
    .replace(/}\s*else/g, '} else')
    .replace(/}\s*catch/g, '} catch')
    .replace(/}\s*finally/g, '} finally')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

function formatCppCode(code: string): string {
  return code
    .replace(/{\s*([a-zA-Z_])/g, '{\n    $1')
    .replace(/;\s*([a-zA-Z_])/g, ';\n$1')
    .replace(/}\s*([a-zA-Z_])/g, '}\n$1')
    .replace(/}\s*else/g, '} else')
    .replace(/}\s*catch/g, '} catch')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

function formatCCode(code: string): string {
  return code
    .replace(/{\s*([a-zA-Z_])/g, '{\n    $1')
    .replace(/;\s*([a-zA-Z_])/g, ';\n$1')
    .replace(/}\s*([a-zA-Z_])/g, '}\n$1')
    .replace(/}\s*else/g, '} else')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

function formatPhpCode(code: string): string {
  return code
    .replace(/{\s*([a-zA-Z_$])/g, '{\n    $1')
    .replace(/;\s*([a-zA-Z_$])/g, ';\n$1')
    .replace(/}\s*([a-zA-Z_$])/g, '}\n$1')
    .replace(/}\s*else/g, '} else')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

function formatRubyCode(code: string): string {
  return code
    .replace(/end\s*([a-zA-Z_])/g, 'end\n$1')
    .replace(/\s+(def|if|for|while|class|begin|rescue|ensure)\s+/g, '\n$1 ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

function formatGoCode(code: string): string {
  return code
    .replace(/{\s*([a-zA-Z_])/g, '{\n    $1')
    .replace(/}\s*([a-zA-Z_])/g, '}\n$1')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

function formatRustCode(code: string): string {
  return code
    .replace(/{\s*([a-zA-Z_])/g, '{\n    $1')
    .replace(/}\s*([a-zA-Z_])/g, '}\n$1')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

function formatGenericCode(code: string, language: string): string {
  // Generic formatting for unknown languages
  return code
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}