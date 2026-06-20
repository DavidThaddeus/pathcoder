import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai'

export const runtime = 'nodejs'
// Same reasoning as generate-project: an AI fallback chain can legitimately
// take 20-30s, which can exceed Vercel's account-level default function
// timeout and truncate the response, breaking the client's response.json().
export const maxDuration = 45

export async function POST(request: NextRequest) {
  try {
    const { challengeInstructions, userCode, programmingLanguage, attemptNumber = 1, timeTaken = 5 } = await request.json()

    if (!process.env.GROQ_API_KEY && !process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'No AI provider configured' }, { status: 500 })
    }

    const evaluationPrompt = `You are an expert AI code evaluator for a learning platform that helps users practice programming through tasks and challenges.

Your job is to assess whether the user's submitted code solves the challenge based on the instructions and test cases. You must determine whether it should be marked as PASS or FAIL.

---

### 📄 Challenge Instructions:
${challengeInstructions}

---

### 💻 User Code Submission:
\`\`\`${programmingLanguage}
${userCode}
\`\`\`

---

### 🎯 Evaluation Rules:

1. Does the code meet the requirements in the challenge instructions?
2. Does the code run without errors?
3. Does the output match expectations?
4. Does the user follow any required constraints (e.g., no hardcoded values)?
5. Ignore formatting, indentation, or comment differences.
6. Count this as the user's **${attemptNumber}${attemptNumber === 1 ? 'st' : attemptNumber === 2 ? 'nd' : 'rd'} attempt**.
7. Track how long the user took (from challenge start to this submission): **${timeTaken} minutes**.

---

### 💥 Failing Criteria:

* If the user has failed this challenge 3 times total, **mark it as permanently FAILED** and return "Try again later from past challenges."
* Otherwise, return **FAIL**, along with a clear, short explanation of what went wrong.

---

### ✅ Passing Criteria:

If the code works as intended and meets the rules:

* Return **PASS**
* Include a brief congratulatory message
* Include the time it took to pass (e.g., "Completed in 6 minutes")

---

### 🔁 Final Response Format:

\`\`\`
Status: PASS / FAIL
Attempts: X / 3
Time Taken: X minutes
Message: [Brief explanation or guidance]
\`\`\`

---

Now evaluate the submission and return a clear response in the specified format only.`

    // Evaluate with the ordered free-model fallback chain (low temperature
    // for deterministic grading).
    const aiResult = await callAI({
      messages: [{ role: 'user', content: evaluationPrompt }],
      temperature: 0.1,
      topP: 0.95,
      maxTokens: 1024,
    })

    const evaluationResult = aiResult?.content?.trim()
    if (!evaluationResult) {
      return NextResponse.json({ error: 'Failed to evaluate code' }, { status: 500 })
    }

    // Parse the new response format
    const statusMatch = evaluationResult.match(/Status:\s*(PASS|FAIL)/i)
    const attemptsMatch = evaluationResult.match(/Attempts:\s*(\d+)\s*\/\s*3/i)
    const timeMatch = evaluationResult.match(/Time Taken:\s*(\d+)\s*minutes/i)
    const messageMatch = evaluationResult.match(/Message:\s*([\s\S]+?)(?:\n|$)/i)

    const status = statusMatch ? statusMatch[1].toUpperCase() : 'FAIL'
    const attempts = attemptsMatch ? parseInt(attemptsMatch[1]) : 1
    const timeTakenFromResponse = timeMatch ? parseInt(timeMatch[1]) : 0
    const message = messageMatch ? messageMatch[1].trim() : evaluationResult

    // Fallback to old format if new format parsing fails
    const isPass = status === 'PASS' || evaluationResult.toUpperCase().startsWith('PASS')
    const reason = message || evaluationResult.replace(/^(PASS|FAIL):\s*/i, '').trim()

    return NextResponse.json({
      result: isPass ? 'PASS' : 'FAIL',
      reason,
      attempts,
      timeTaken: timeTakenFromResponse,
      fullResponse: evaluationResult
    })

  } catch (error: any) {
    console.error('Code evaluation error:', error)
    return NextResponse.json({ error: 'Failed to evaluate code' }, { status: 500 })
  }
} 