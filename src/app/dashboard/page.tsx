"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Preloader from "@/components/Preloader"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { 
  Zap, 
  Plus, 
  BookOpen, 
  Target, 
  Clock, 
  Code2,
  Trophy,
  TrendingUp,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  X,
  Bug,
  Star,
  Award,
  CheckCircle,
  XCircle,
  RotateCcw,
  Medal
} from "lucide-react"
import { useAuth } from '../../contexts/AuthContext'

interface Project {
  id: string
  title: string
  description: string
  difficulty: string
  estimatedTime: string
  techStack: string[]
  learningObjectives: string[]
  type: string
  createdAt: string
  programmingLanguage?: string
  skillLevel?: string
  challengeType?: string
  topics?: string[]
  instructions?: string
  codeSnippet?: string
  solution?: string
  solutionExplanation?: string
  hints?: string[]
}

interface ChallengeHistory {
  id: string
  challenge_id: string
  title: string
  programmingLanguage: string
  skillLevel: string
  status: 'completed' | 'failed' | 'ongoing' | 'available'
  attempts: number
  maxAttempts: number
  completed_at?: string
  failed_at?: string
  created_at: string
}

function DashboardPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [projects, setProjects] = useState<Project[]>([])
  const [challengeHistory, setChallengeHistory] = useState<ChallengeHistory[]>([])
  const [ongoingChallenges, setOngoingChallenges] = useState<ChallengeHistory[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [showPreloader, setShowPreloader] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [challengeToDelete, setChallengeToDelete] = useState<string | null>(null)
  const [showGenerateNewModal, setShowGenerateNewModal] = useState(false)
  const [challengeToGenerateNew, setChallengeToGenerateNew] = useState<string | null>(null)
  const [showTooManyChallengesModal, setShowTooManyChallengesModal] = useState(false)
  // Points/coins, profile, leaderboard, and the Clear All confirmation
  const [points, setPoints] = useState<number>(0)
  const [displayName, setDisplayName] = useState("")
  const [techRole, setTechRole] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [leaderboard, setLeaderboard] = useState<{ id: string; name: string; tech_role: string | null; points: number }[]>([])
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  // Step 1: Language/Framework selection
  const [selectedLanguage, setSelectedLanguage] = useState("")
  const [customLanguage, setCustomLanguage] = useState("")
  
  // Step 2: Topics, skill level, challenge type
  const [topics, setTopics] = useState<string[]>([""])
  const [skillLevel, setSkillLevel] = useState("beginner")
  const [challengeType, setChallengeType] = useState("coding")
  const [questionCount, setQuestionCount] = useState(5)

  const popularLanguages = [
    // Frontend
    { name: "JavaScript", category: "Frontend" },
    { name: "React", category: "Frontend" },
    { name: "Vue.js", category: "Frontend" },
    { name: "Angular", category: "Frontend" },
    { name: "TypeScript", category: "Frontend" },
    { name: "HTML/CSS", category: "Frontend" },
    { name: "Next.js", category: "Frontend" },
    { name: "Svelte", category: "Frontend" },
    
    // Backend
    { name: "Node.js", category: "Backend" },
    { name: "Python", category: "Backend" },
    { name: "Java", category: "Backend" },
    { name: "PHP", category: "Backend" },
    { name: "C#", category: "Backend" },
    { name: "Go", category: "Backend" },
    { name: "Ruby", category: "Backend" },
    { name: "Rust", category: "Backend" },
    
    // Frameworks/Tools
    { name: "Express.js", category: "Backend" },
    { name: "Django", category: "Backend" },
    { name: "Flask", category: "Backend" },
    { name: "Spring Boot", category: "Backend" },
    { name: "Laravel", category: "Backend" },
    { name: "MongoDB", category: "Database" },
    { name: "PostgreSQL", category: "Database" },
    { name: "MySQL", category: "Database" },
  ]

  const challengeTypes = [
    {
      id: "coding",
      name: "Coding Challenge",
      description: "Build a project or feature using your learned concepts",
      icon: Code2
    },

    {
      id: "quiz",
      name: "Knowledge Quiz",
      description: "Test your theoretical understanding with questions",
      icon: BookOpen
    },
    {
      id: "debug",
      name: "Debug Challenge",
      description: "Find and fix bugs in existing code",
      icon: Bug
    },

  ]

  const addTopic = () => {
    setTopics(prev => [...prev, ""])
  }

  const updateTopic = (index: number, value: string) => {
    setTopics(prev => prev.map((topic, i) => i === index ? value : topic))
  }

  const removeTopic = (index: number) => {
    if (topics.length > 1) {
      setTopics(prev => prev.filter((_, i) => i !== index))
    }
  }

  const selectLanguage = (language: string) => {
    setSelectedLanguage(language)
    setCustomLanguage("")
  }

  const handleNext = () => {
    if (currentStep === 1) {
      const finalLanguage = selectedLanguage || customLanguage
      if (!finalLanguage.trim()) {
        alert("Please select a language or framework")
        return
      }
      setCurrentStep(2)
    }
  }

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1)
    }
  }

  const handleGenerateChallenge = async () => {
    const validTopics = topics.filter(topic => topic.trim() !== "")
    if (validTopics.length === 0) {
      alert("Please enter at least one topic you've learned")
      return
    }

    // Check if user already has 5 ongoing challenges
    if (ongoingChallenges.length >= 5) {
      setShowTooManyChallengesModal(true)
      return
    }

    // Don't clear existing challenges - allow stacking multiple challenges
    const userKey = user?.id || "demo-user"
    
    // Keep existing projects and challenges, just add new ones
    // setProjects([]) // Removed - keep existing
    // setOngoingChallenges([]) // Removed - keep existing
    // localStorage.removeItem(`projects_${userKey}`) // Removed - keep existing
    
    // Don't clear old challenge data from localStorage - keep existing challenges
    // const keysToRemove = []
    // for (let i = 0; i < localStorage.length; i++) {
    //   const key = localStorage.key(i)
    //   if (key && key.startsWith(`challenge_${userKey}_`)) {
    //     keysToRemove.push(key)
    //   }
    // }
    // keysToRemove.forEach(key => localStorage.removeItem(key))

    setIsGenerating(true)
    setShowPreloader(true)
    
    try {
      const finalLanguage = selectedLanguage || customLanguage
      const response = await fetch('/api/generate-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topics: validTopics,
          skillLevel,
          projectType: challengeType,
          techStack: [finalLanguage],
          timeEstimate: "30-60 minutes",
          questionCount: challengeType === 'quiz' ? questionCount : undefined,
          userId: user?.id || "demo-user" // Use actual user ID
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate challenge')
      }

      const newProject = await response.json()
      
      // Immediately update local state for instant UI feedback
      setProjects(prevProjects => [...prevProjects, newProject])
      
      // No need to store in old projects localStorage - we use status-based system now
      // const userKey = user?.id || "demo-user"
      // const existingProjects = JSON.parse(localStorage.getItem(`projects_${userKey}`) || '[]')
      // localStorage.setItem(`projects_${userKey}`, JSON.stringify([...existingProjects, newProject]))
      
      // Store challenge in localStorage for the challenge page (user-specific)
      localStorage.setItem(`challenge_${userKey}_${newProject.id}`, JSON.stringify(newProject))
      
      // Set the initial status as 'available' in localStorage
      localStorage.setItem(`challenge_status_${userKey}_${newProject.id}`, 'available')
      
      // Don't add to ongoing challenges until user explicitly starts them
      // const newOngoingChallenge = {
      //   id: Date.now().toString(),
      //   challenge_id: newProject.id,
      //   title: newProject.title,
      //   programmingLanguage: newProject.programmingLanguage || 'JavaScript',
      //   skillLevel: newProject.skillLevel || 'beginner',
      //   status: 'available' as const,
      //   attempts: 0,
      //   maxAttempts: 3,
      //   created_at: new Date().toISOString()
      // }
      // setOngoingChallenges(prevOngoing => [...prevOngoing, newOngoingChallenge])
      
      // Don't clear existing challenges from database - allow stacking multiple challenges
      // try {
      //   await fetch('/api/challenge-history', {
      //     method: 'DELETE',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({
      //       user_id: user?.id || "demo-user",
      //       challenge_id: 'all' // Special flag to clear all challenges
      //     })
      //   })
      // } catch (error) {
      //   console.error('Failed to clear existing challenges:', error)
      // }

      // Store challenge data in history with 'available' status initially
      try {
        await fetch('/api/challenge-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user?.id || "demo-user",
            challenge_id: newProject.id,
            title: newProject.title,
            programmingLanguage: newProject.programmingLanguage,
            skillLevel: newProject.skillLevel,
            status: 'available',
            attempts: 0,
            maxAttempts: 3,
            challengeData: newProject // Store the full challenge data
          })
        })
      } catch (error) {
        console.error('Failed to store challenge data:', error)
      }
      
    } catch (error) {
      console.error('Error generating challenge:', error)
      alert('Failed to generate challenge. Please try again.')
      setShowPreloader(false)
      setIsGenerating(false)
    }
  }

  const handlePreloaderComplete = () => {
    setShowPreloader(false)
    setIsGenerating(false)

    // Do NOT open the challenge automatically. The newly created challenge
    // stays under "Your Challenges" as Available until the user clicks Start.

    // Reset form
    setCurrentStep(1)
    setSelectedLanguage("")
    setCustomLanguage("")
    setTopics([""])
    setSkillLevel("beginner")
    setChallengeType("coding")
  }

  const handleReattemptChallenge = async (challenge: ChallengeHistory) => {
    try {
      // Clear saved inputs so the retake starts fresh.
      const uKey = user?.id || "demo-user"
      localStorage.removeItem(`challenge_code_${uKey}_${challenge.challenge_id}`)
      localStorage.removeItem(`challenge_debugcode_${uKey}_${challenge.challenge_id}`)
      localStorage.removeItem(`challenge_quizanswer_${uKey}_${challenge.challenge_id}`)
      localStorage.removeItem(`challenge_quizsel_${uKey}_${challenge.challenge_id}`)

      // Remove it from the local completed/failed list immediately.
      setChallengeHistory(prev => prev.filter(ch => ch.challenge_id !== challenge.challenge_id))

      // Reset the challenge to ongoing status with 0 attempts
      await fetch('/api/challenge-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id,
          challenge_id: challenge.challenge_id,
          title: challenge.title,
          programmingLanguage: challenge.programmingLanguage,
          skillLevel: challenge.skillLevel,
          status: 'ongoing',
          attempts: 0,
          maxAttempts: 3
        })
      })

      // Try to get challenge data from multiple sources
      let challengeData = projects.find(p => p.id === challenge.challenge_id)
      
      if (!challengeData) {
        // Try to get from localStorage (user-specific)
        const userKey = user?.id || "demo-user"
        const storedData = localStorage.getItem(`challenge_${userKey}_${challenge.challenge_id}`)
        if (storedData) {
          challengeData = JSON.parse(storedData)
        }
      }
      
      if (!challengeData) {
        // Try to get from challenge history API with data
        try {
          const response = await fetch(`/api/challenge-history?user_id=${user?.id}&get_challenge_data=true`)
          if (response.ok) {
            const data = await response.json()
            const historyItem = data.challenges.find((ch: any) => ch.challenge_id === challenge.challenge_id)
            if (historyItem?.challengeData) {
              challengeData = historyItem.challengeData
            }
          }
        } catch (error) {
          console.error('Failed to fetch challenge data from API:', error)
        }
      }
      
      if (challengeData) {
        const userKey = user?.id || "demo-user"
        localStorage.setItem(`challenge_${userKey}_${challenge.challenge_id}`, JSON.stringify(challengeData))
        router.push(`/challenge/${challenge.challenge_id}`)
      } else {
        alert('Challenge data not found. Please generate a new challenge.')
      }
    } catch (error) {
      console.error('Error reattempting challenge:', error)
      alert('Failed to restart challenge. Please try again.')
    }
  }

  const handleDeleteChallenge = async () => {
    if (!user || !challengeToDelete) return
    
    try {
      await fetch('/api/challenge-history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          challenge_id: challengeToDelete
        })
      })

      // Remove from both ongoing and available (projects) lists, and clear localStorage
      setOngoingChallenges(prevOngoing =>
        prevOngoing.filter(ch => ch.challenge_id !== challengeToDelete)
      )
      setProjects(prevProjects =>
        prevProjects.filter(p => p.id !== challengeToDelete)
      )

      // Clear the challenge status, data, and saved code from localStorage
      const userKey = user?.id || "demo-user"
      localStorage.removeItem(`challenge_status_${userKey}_${challengeToDelete}`)
      localStorage.removeItem(`challenge_${userKey}_${challengeToDelete}`)
      localStorage.removeItem(`challenge_code_${userKey}_${challengeToDelete}`)
      localStorage.removeItem(`challenge_debugcode_${userKey}_${challengeToDelete}`)
      localStorage.removeItem(`challenge_quizanswer_${userKey}_${challengeToDelete}`)
      
      // Close modal
      setShowDeleteModal(false)
      setChallengeToDelete(null)
    } catch (error) {
      console.error('Error deleting challenge:', error)
      alert('Failed to delete challenge. Please try again.')
    }
  }

  const cancelDelete = () => {
    setShowDeleteModal(false)
    setChallengeToDelete(null)
  }

  const handleGenerateNewChallenge = async () => {
    if (!user || !challengeToGenerateNew) return
    
    try {
      // Don't delete the existing challenge - just close the modal and navigate to challenge generator
      setShowGenerateNewModal(false)
      setChallengeToGenerateNew(null)
      
      // Navigate to step 1 to generate a new challenge
      setCurrentStep(1)
      setProjects([])
      setOngoingChallenges([])
      setChallengeHistory([])
      
      // Clear localStorage to start fresh for new challenge generation
      const userKey = user?.id || "demo-user"
      localStorage.removeItem(`projects_${userKey}`)
      
      // Clear challenge data and status from localStorage
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(`challenge_${userKey}_`) || key && key.startsWith(`challenge_status_${userKey}_`)) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
      
    } catch (error) {
      console.error('Failed to handle generate new challenge:', error)
      alert('Failed to handle generate new challenge. Please try again.')
    }
  }

  const cancelGenerateNew = () => {
    setShowGenerateNewModal(false)
    setChallengeToGenerateNew(null)
  }

  const renderStep1 = () => (
    <div className="bg-background border border-border rounded-lg p-6 mb-8">
      <div className="flex items-center mb-6">
        <Sparkles className="h-6 w-6 text-primary mr-2" />
        <h2 className="text-2xl font-bold text-foreground">Choose Your Language/Framework</h2>
      </div>

      <div className="mb-6">
        <p className="text-foreground/70 mb-4">
          What programming language or framework are you currently learning?
        </p>
        
        {/* Popular Languages Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          {popularLanguages.map((lang) => (
            <button
              key={lang.name}
              onClick={() => selectLanguage(lang.name)}
              className={`p-3 text-sm rounded-lg border transition-colors ${
                selectedLanguage === lang.name
                  ? 'bg-primary text-black border-primary'
                  : 'bg-background text-foreground border-border hover:border-primary'
              }`}
            >
              <div className="font-medium">{lang.name}</div>
              <div className="text-xs opacity-60">{lang.category}</div>
            </button>
          ))}
        </div>

        {/* Custom Language Input */}
        <div className="border-t border-border pt-4">
          <label className="block text-sm font-medium text-foreground mb-2">
            Other (Please specify)
          </label>
          <input
            type="text"
            placeholder="Enter language or framework name..."
            value={customLanguage}
            onChange={(e) => {
              setCustomLanguage(e.target.value)
              setSelectedLanguage("")
            }}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
          />
        </div>
      </div>

      <Button 
        onClick={handleNext}
        disabled={!selectedLanguage && !customLanguage.trim()}
        size="lg"
        className="w-full"
      >
        Next
        <ChevronRight className="h-5 w-5 ml-2" />
      </Button>
    </div>
  )

  const renderStep2 = () => (
    <div className="bg-background border border-border rounded-lg p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Target className="h-6 w-6 text-primary mr-2" />
          <h2 className="text-2xl font-bold text-foreground">Configure Your Challenge</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="mb-6 p-3 bg-primary/10 rounded-lg">
        <p className="text-sm text-foreground">
          <strong>Selected:</strong> {selectedLanguage || customLanguage}
        </p>
      </div>

      {/* Topics Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-foreground mb-3">
          What topics/concepts are you learning in {selectedLanguage || customLanguage}?
        </label>
        <div className="space-y-3">
          {topics.map((topic, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                placeholder={`Topic ${index + 1} (e.g., Variables, Functions, Classes...)`}
                value={topic}
                onChange={(e) => updateTopic(index, e.target.value)}
                className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
              />
              {topics.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTopic(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={addTopic}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another Topic
          </Button>
        </div>
      </div>

      {/* Skill Level */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-foreground mb-3">
          Skill Level
        </label>
        <div className="grid grid-cols-3 gap-2">
          {["beginner", "intermediate", "advanced"].map((level) => (
            <button
              key={level}
              onClick={() => setSkillLevel(level)}
              className={`p-3 text-sm rounded-lg border transition-colors capitalize ${
                skillLevel === level
                  ? 'bg-primary text-black border-primary'
                  : 'bg-background text-foreground border-border hover:border-primary'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Challenge Type */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-foreground mb-3">
          Challenge Type
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {challengeTypes.map((type) => {
            const Icon = type.icon
            return (
              <button
                key={type.id}
                onClick={() => setChallengeType(type.id)}
                className={`p-4 text-left rounded-lg border transition-colors ${
                  challengeType === type.id
                    ? 'bg-primary text-black border-primary'
                    : 'bg-background text-foreground border-border hover:border-primary'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon className="h-5 w-5 mt-0.5" />
                  <div>
                    <div className="font-medium">{type.name}</div>
                    <div className="text-xs opacity-70 mt-1">{type.description}</div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {challengeType === 'quiz' && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Number of Questions: <span className="text-primary font-semibold">{questionCount}</span>
          </label>
          <input
            type="range"
            min={5}
            max={20}
            step={1}
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-foreground/50 mt-1">
            <span>5 (min)</span>
            <span>20 (max)</span>
          </div>
        </div>
      )}

      <Button
        onClick={handleGenerateChallenge}
        disabled={isGenerating || topics.filter(t => t.trim()).length === 0}
        size="lg"
        className="w-full"
      >
        {isGenerating ? (
          <>
            <div className="animate-spin h-4 w-4 mr-2 border-2 border-background border-t-transparent rounded-full" />
            Generating Challenge...
          </>
        ) : (
          <>
            <Zap className="h-5 w-5 mr-2" />
            Generate Challenge
          </>
        )}
      </Button>
    </div>
  )

  const { user, signOut } = useAuth()

  // Load the user's points/profile and the leaderboard.
  const fetchProfile = async () => {
    if (!user) return
    try {
      const res = await fetch(`/api/profile?user_id=${user.id}`)
      const data = await res.json()
      if (data.profile) {
        setPoints(data.profile.points ?? 0)
        setDisplayName(data.profile.display_name || '')
        setTechRole(data.profile.tech_role || '')
      }
    } catch (e) {
      console.error('Failed to load profile:', e)
    }
  }

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard')
      const data = await res.json()
      setLeaderboard(data.leaderboard || [])
    } catch (e) {
      console.error('Failed to load leaderboard:', e)
    }
  }

  const saveProfile = async () => {
    if (!user) return
    setSavingProfile(true)
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, displayName, techRole }),
      })
      setShowProfile(false)
    } catch (e) {
      console.error('Failed to save profile:', e)
    } finally {
      setSavingProfile(false)
    }
  }

  // Clear ALL challenges (server + local). Used by the confirmation modal.
  const doClearAll = async () => {
    const userKey = user?.id || "demo-user"
    if (user?.id) {
      try {
        await fetch('/api/challenge-history', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, challenge_id: 'all' }),
        })
      } catch (e) {
        console.error('Failed to clear challenges on server:', e)
      }
    }
    setProjects([])
    setOngoingChallenges([])
    setChallengeHistory([])
    localStorage.removeItem(`projects_${userKey}`)
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (
        key.startsWith(`challenge_${userKey}_`) ||
        key.startsWith(`challenge_status_${userKey}_`) ||
        key.startsWith(`challenge_code_${userKey}_`) ||
        key.startsWith(`challenge_debugcode_${userKey}_`) ||
        key.startsWith(`challenge_quizanswer_${userKey}_`) ||
        key.startsWith(`challenge_quizsel_${userKey}_`)
      )) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
    setShowClearConfirm(false)
  }
  // Removed loadingHistory state since we load challenges immediately from localStorage

  useEffect(() => {
    // Load user-specific projects and challenges from localStorage for immediate display
    const userKey = user?.id || "demo-user"
    
    // COMPLETELY SEPARATE DATA SOURCES TO PREVENT DUPLICATES
    
    // Step 1: Load ONLY ongoing challenges from localStorage
    const ongoingChallengesData: ChallengeHistory[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(`challenge_status_${userKey}_`)) {
        const challengeId = key.replace(`challenge_status_${userKey}_`, '')
        const status = localStorage.getItem(key)
        
        if (status === 'ongoing') {
          // Get the challenge data
          const challengeKey = `challenge_${userKey}_${challengeId}`
          const challengeData = localStorage.getItem(challengeKey)
          
          if (challengeData) {
            try {
              const parsed = JSON.parse(challengeData)
              ongoingChallengesData.push({
                id: Date.now().toString() + i,
                challenge_id: challengeId,
                title: parsed.title || 'Challenge',
                programmingLanguage: parsed.programmingLanguage || 'JavaScript',
                skillLevel: parsed.skillLevel || 'beginner',
                status: 'ongoing' as const,
                attempts: 0,
                maxAttempts: 3,
                created_at: new Date().toISOString()
              })
            } catch (error) {
              console.error('Error parsing ongoing challenge:', error)
            }
          }
        }
      }
    }
    
    // Step 2: Load ONLY available challenges (not ongoing)
    const availableChallengesData: ChallengeHistory[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(`challenge_status_${userKey}_`)) {
        const challengeId = key.replace(`challenge_status_${userKey}_`, '')
        const status = localStorage.getItem(key)
        
        if (status === 'available') {
          // Get the challenge data
          const challengeKey = `challenge_${userKey}_${challengeId}`
          const challengeData = localStorage.getItem(challengeKey)
          
          if (challengeData) {
            try {
              const parsed = JSON.parse(challengeData)
              availableChallengesData.push({
                id: Date.now().toString() + i,
                challenge_id: challengeId,
                title: parsed.title || 'Challenge',
                programmingLanguage: parsed.programmingLanguage || 'JavaScript',
                skillLevel: parsed.skillLevel || 'beginner',
                status: 'available' as const,
                attempts: 0,
                maxAttempts: 3,
                created_at: new Date().toISOString()
              })
            } catch (error) {
              console.error('Error parsing available challenge:', error)
            }
          }
        }
      }
    }
    
    // Step 3: Set ongoing challenges
    setOngoingChallenges(ongoingChallengesData)
    
    // Step 4: Convert available challenges to project format and set projects
    const availableProjects = availableChallengesData.map(challenge => ({
      id: challenge.challenge_id,
      title: challenge.title,
      description: `Challenge in ${challenge.programmingLanguage} - ${challenge.skillLevel} level`,
      difficulty: challenge.skillLevel,
      estimatedTime: "30-60 minutes",
      techStack: [challenge.programmingLanguage],
      learningObjectives: [],
      type: "coding",
      createdAt: challenge.created_at,
      programmingLanguage: challenge.programmingLanguage,
      skillLevel: challenge.skillLevel
    }))
    
    // Debug logging to prevent duplicates
    console.log('🔍 Loading challenges from localStorage:')
    console.log('📊 Ongoing challenges:', ongoingChallengesData.length, ongoingChallengesData.map(ch => ({ id: ch.challenge_id, title: ch.title, status: ch.status })))
    console.log('📋 Available challenges:', availableChallengesData.length, availableChallengesData.map(ch => ({ id: ch.challenge_id, title: ch.title, status: ch.status })))
    console.log('🎯 Final projects:', availableProjects.length, availableProjects.map(p => ({ id: p.id, title: p.title })))
    
    setProjects(availableProjects)
    
    // Don't fetch challenge history on mount - let localStorage handle initial state
    // fetchChallengeHistory()
  }, [user])

  // Only fetch challenge history once when component mounts or user changes
  // Removed focus event listener to prevent constant reloading

  const fetchChallengeHistory = async () => {
    if (!user) return
    // Removed loading state management since we don't need it
    try {
      const res = await fetch(`/api/challenge-history?user_id=${user.id}&get_challenge_data=true`)
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      
      const data = await res.json()
      const allChallenges = data.challenges || []
      
      // Separate challenges by status
      const ongoing = allChallenges.filter((ch: ChallengeHistory) => ch.status === 'ongoing')
      const available = allChallenges.filter((ch: ChallengeHistory) => ch.status === 'available')
      const history = allChallenges.filter((ch: ChallengeHistory) => ch.status === 'completed' || ch.status === 'failed')
      
      // Merge with existing local state to avoid overriding immediate UI changes
      setOngoingChallenges(prevOngoing => {
        const existingIds = new Set(prevOngoing.map((ch: ChallengeHistory) => ch.challenge_id))
        const newOngoing = ongoing.filter((ch: ChallengeHistory) => !existingIds.has(ch.challenge_id))
        return [...prevOngoing, ...newOngoing]
      })
      setChallengeHistory(history)
      
      // Merge available challenges with existing local state instead of overriding
      setProjects(prevProjects => {
        const existingIds = new Set(prevProjects.map(p => p.id))
        const newAvailable = available.map((ch: ChallengeHistory) => ({
          id: ch.challenge_id,
          title: ch.title,
          description: `Challenge in ${ch.programmingLanguage} - ${ch.skillLevel} level`,
          difficulty: ch.skillLevel,
          estimatedTime: "30-60 minutes",
          techStack: [ch.programmingLanguage],
          learningObjectives: [],
          type: "coding",
          createdAt: ch.created_at,
          programmingLanguage: ch.programmingLanguage,
          skillLevel: ch.skillLevel
        }))
        const merged = [...prevProjects]
        newAvailable.forEach((newProject: any) => {
          if (!existingIds.has(newProject.id)) {
            merged.push(newProject)
          }
        })
        return merged
      })
    } catch (e) {
      console.error('Error fetching challenge history:', e)
      // Set empty arrays on error to prevent UI issues
      setOngoingChallenges([])
      setChallengeHistory([])
    }
    // Removed loading state management
  }

  // Load completed/failed (and reconcile ongoing/available) from the server on mount.
  useEffect(() => {
    if (user) {
      fetchChallengeHistory()
      fetchProfile()
      fetchLeaderboard()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <Code2 className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">PathCoder Dashboard</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Points / coins balance */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30">
                <Star className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground">{points}</span>
                <span className="text-xs text-foreground/60 hidden sm:inline">pts</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => { fetchLeaderboard(); setShowLeaderboard(true) }}>
                <Trophy className="h-4 w-4 mr-2" />
                Leaderboard
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowProfile(true)}>
                Profile
              </Button>
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => setShowClearConfirm(true)}>
                Clear All
              </Button>
              <Button variant="ghost" size="sm" onClick={async () => { await signOut(); router.push('/login') }}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Challenge Generator */}
          <div className="lg:col-span-2">
            {/* Step Indicator */}
            <div className="flex items-center mb-6">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                currentStep >= 1 ? 'bg-primary text-black' : 'bg-muted text-foreground/60'
              }`}>
                1
              </div>
              <div className={`h-0.5 w-8 mx-2 ${currentStep >= 2 ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                currentStep >= 2 ? 'bg-primary text-black' : 'bg-muted text-foreground/60'
              }`}>
                2
              </div>
              <span className="ml-4 text-sm text-foreground/70">
                {currentStep === 1 ? 'Choose Language' : 'Configure Challenge'}
              </span>
            </div>

            {currentStep === 1 ? renderStep1() : renderStep2()}

            {/* All Challenges */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-foreground flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Your Challenges
              </h3>
              
              {ongoingChallenges.length === 0 && projects.length === 0 && challengeHistory.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-lg">
                  <Target className="h-12 w-12 text-foreground/30 mx-auto mb-4" />
                  <p className="text-foreground/70">No challenges available.</p>
                  <p className="text-sm text-foreground/50">Generate a new challenge to get started!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Ongoing Challenges (exclude any already completed/failed) */}
                  {ongoingChallenges
                    .filter((challenge) => !challengeHistory.some((h) => h.challenge_id === challenge.challenge_id))
                    .map((challenge) => (
                    <div key={challenge.id} className="bg-background border border-primary/30 rounded-lg p-6 hover:border-primary transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <h4 className="text-lg font-semibold text-foreground">{challenge.title}</h4>
                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Ongoing</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-foreground/60 mb-4">
                            <div className="flex items-center">
                              <Code2 className="h-4 w-4 mr-1" />
                              {challenge.programmingLanguage}
                            </div>
                            <div className="flex items-center">
                              <Target className="h-4 w-4 mr-1" />
                              {challenge.skillLevel}
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              Attempts: {challenge.attempts}/{challenge.maxAttempts}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={async () => {
                              // Try to find challenge data from projects first
                              let challengeData = projects.find(p => p.id === challenge.challenge_id)
                              
                              // If not found in projects, try to get from localStorage
                              if (!challengeData) {
                                const userKey = user?.id || "demo-user"
                                const storedData = localStorage.getItem(`challenge_${userKey}_${challenge.challenge_id}`)
                                if (storedData) {
                                  challengeData = JSON.parse(storedData)
                                }
                              }
                              
                              // If we have challenge data, navigate to the challenge
                              if (challengeData) {
                                const userKey = user?.id || "demo-user"
                                localStorage.setItem(`challenge_${userKey}_${challenge.challenge_id}`, JSON.stringify(challengeData))
                                router.push(`/challenge/${challenge.challenge_id}`)
                              } else {
                                // If no challenge data found, ask user to generate new challenge
                                setChallengeToGenerateNew(challenge.challenge_id)
                                setShowGenerateNewModal(true)
                              }
                            }}
                          >
                            Continue
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-500 hover:text-red-700 border-red-500 hover:border-red-700"
                            onClick={() => {
                              setChallengeToDelete(challenge.challenge_id)
                              setShowDeleteModal(true)
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Available Challenges (exclude any already completed/failed) */}
                  {projects
                    .filter((project) => !challengeHistory.some((h) => h.challenge_id === project.id))
                    .map((project) => (
                    <div key={project.id} className="bg-background border border-border rounded-lg p-6 hover:border-primary transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <h4 className="text-lg font-semibold text-foreground">{project.title}</h4>
                            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Available</span>
                          </div>
                          <p className="text-foreground/70 mb-4">{project.description}</p>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-foreground/60">
                            <div className="flex items-center">
                              <Target className="h-4 w-4 mr-1" />
                              {project.difficulty}
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {project.estimatedTime}
                            </div>
                            <div className="flex items-center">
                              <Code2 className="h-4 w-4 mr-1" />
                              {project.techStack.slice(0, 2).join(", ")}
                              {project.techStack.length > 2 && ` +${project.techStack.length - 2}`}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const userKey = user?.id || "demo-user"
                            localStorage.setItem(`challenge_${userKey}_${project.id}`, JSON.stringify(project))
                            
                            // Store the challenge status as ongoing
                            localStorage.setItem(`challenge_status_${userKey}_${project.id}`, 'ongoing')
                            
                            // Immediately update the UI to show the status change
                            // Remove from available challenges and add to ongoing
                            setProjects(prevProjects => prevProjects.filter(p => p.id !== project.id))
                            setOngoingChallenges(prevOngoing => [...prevOngoing, {
                              id: Date.now().toString(),
                              challenge_id: project.id,
                              title: project.title,
                              programmingLanguage: project.programmingLanguage || 'JavaScript',
                              skillLevel: project.skillLevel || 'beginner',
                              status: 'ongoing' as const,
                              attempts: 0,
                              maxAttempts: 3,
                              created_at: new Date().toISOString()
                            }])
                            
                            // Update the challenge status to 'ongoing' in the background
                            fetch('/api/challenge-history', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                user_id: user?.id || "demo-user",
                                challenge_id: project.id,
                                title: project.title,
                                programmingLanguage: project.programmingLanguage,
                                skillLevel: project.skillLevel,
                                status: 'ongoing',
                                attempts: 0,
                                maxAttempts: 3
                              })
                            }).catch(error => {
                              console.error('Failed to update challenge status:', error)
                              // Revert the UI changes if the API call fails
                              setProjects(prevProjects => [...prevProjects, project])
                              setOngoingChallenges(prevOngoing => 
                                prevOngoing.filter(ch => ch.challenge_id !== project.id)
                              )
                            })
                            
                            router.push(`/challenge/${project.id}`)
                          }}
                        >
                          Start
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 hover:text-red-700 border-red-500 hover:border-red-700"
                          onClick={() => {
                            setChallengeToDelete(project.id)
                            setShowDeleteModal(true)
                          }}
                        >
                          Delete
                        </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Completed / Failed Challenges */}
                  {challengeHistory.map((challenge) => {
                    const isCompleted = challenge.status === 'completed'
                    return (
                      <div
                        key={challenge.id}
                        className={`bg-background border rounded-lg p-6 transition-colors ${
                          isCompleted ? 'border-green-500/40 hover:border-green-500' : 'border-red-500/40 hover:border-red-500'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {isCompleted ? (
                                <Trophy className="h-5 w-5 text-green-500" />
                              ) : (
                                <X className="h-5 w-5 text-red-500" />
                              )}
                              <h4 className="text-lg font-semibold text-foreground">{challenge.title}</h4>
                              <span className={`text-xs px-2 py-1 rounded ${
                                isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                              }`}>
                                {isCompleted ? 'Challenge Completed' : 'Challenge Failed'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-foreground/60">
                              <div className="flex items-center">
                                <Code2 className="h-4 w-4 mr-1" />
                                {challenge.programmingLanguage}
                              </div>
                              <div className="flex items-center">
                                <Target className="h-4 w-4 mr-1" />
                                {challenge.skillLevel}
                              </div>
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                Attempts: {challenge.attempts}/{challenge.maxAttempts}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReattemptChallenge(challenge)}
                            >
                              {isCompleted ? 'Redo' : 'Retake'}
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-500 hover:text-red-700 border-red-500 hover:border-red-700"
                              onClick={() => {
                                setChallengeToDelete(challenge.challenge_id)
                                setShowDeleteModal(true)
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="bg-background border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Your Progress</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-foreground/70 flex items-center gap-1.5"><Star className="h-4 w-4 text-primary" /> Points</span>
                  <span className="font-semibold text-foreground">{points}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground/70">Challenges Completed</span>
                  <span className="font-semibold text-green-500">{challengeHistory.filter(ch => ch.status === 'completed').length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground/70">Challenges Failed</span>
                  <span className="font-semibold text-red-500">{challengeHistory.filter(ch => ch.status === 'failed').length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground/70">In Progress</span>
                  <span className="font-semibold text-foreground">{ongoingChallenges.length}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-background border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setShowProfile(true)}>
                  <Award className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { fetchLeaderboard(); setShowLeaderboard(true) }}>
                  <Trophy className="h-4 w-4 mr-2" />
                  View Leaderboard
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Preloader */}
      <Preloader 
        isVisible={showPreloader} 
        onComplete={handlePreloaderComplete} 
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                <X className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Delete Challenge</h3>
                <p className="text-sm text-gray-400">This action cannot be undone.</p>
              </div>
            </div>
            
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this challenge from your history? This will permanently remove it from your records.
            </p>
            
            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={cancelDelete}
                className="px-4 bg-[#DCC5B2] hover:bg-[#B8A082] text-black border-[#DCC5B2]"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteChallenge}
                className="px-4 bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Generate New Challenge Modal */}
      {showGenerateNewModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Generate New Challenge</h3>
                <p className="text-sm text-gray-400">Challenge data not found</p>
              </div>
            </div>
            
            <p className="text-gray-300 mb-6">
              The challenge data for this ongoing challenge could not be found. Would you like to generate a new challenge? This will keep your existing challenges and add a new one.
            </p>
            
            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={cancelGenerateNew}
                className="px-4 bg-[#DCC5B2] hover:bg-[#B8A082] text-black border-[#DCC5B2]"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleGenerateNewChallenge}
                className="px-4 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Generate New Challenge
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Too Many Ongoing Challenges Modal */}
      {showTooManyChallengesModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-yellow-600 rounded-full flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Too Many Ongoing Challenges</h3>
                <p className="text-sm text-gray-400">Focus on completing existing ones</p>
              </div>
            </div>
            
            <p className="text-gray-300 mb-6">
              You currently have <strong className="text-[#DCC5B2]">{ongoingChallenges.length}</strong> ongoing challenges. 
              To maintain quality learning, please complete some of your existing challenges before starting new ones.
            </p>
            
            <div className="mb-4 p-4 bg-gray-700 rounded-lg border border-gray-600">
              <p className="text-sm text-gray-300 mb-2">Your ongoing challenges:</p>
              <div className="space-y-1">
                {ongoingChallenges.slice(0, 3).map((challenge, index) => (
                  <div key={challenge.id} className="text-xs text-gray-400 flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#DCC5B2] rounded-full"></span>
                    {challenge.title}
                  </div>
                ))}
                {ongoingChallenges.length > 3 && (
                  <div className="text-xs text-gray-500">
                    ...and {ongoingChallenges.length - 3} more
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <Button 
                onClick={() => setShowTooManyChallengesModal(false)}
                className="px-4 bg-[#DCC5B2] hover:bg-[#B8A082] text-black"
              >
                Got It
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Profile / Settings Modal */}
      {showProfile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => setShowProfile(false)}>
          <div className="bg-background border border-border rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2"><Award className="h-5 w-5 text-primary" /> Profile</h3>
              <button onClick={() => setShowProfile(false)} className="text-foreground/60 hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-foreground/70 mb-1">Account email</label>
                <p className="text-foreground/90 text-sm bg-muted/40 rounded px-3 py-2">{user?.email}</p>
              </div>
              <div>
                <label className="block text-sm text-foreground/70 mb-1">Display name (shown on the leaderboard)</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. CodeNinja"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm text-foreground/70 mb-1">Tech role</label>
                <select
                  value={techRole}
                  onChange={(e) => setTechRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select a role…</option>
                  <option value="Frontend">Frontend</option>
                  <option value="Backend">Backend</option>
                  <option value="Fullstack">Fullstack</option>
                  <option value="Mobile">Mobile</option>
                  <option value="DevOps">DevOps</option>
                  <option value="Data/ML">Data / ML</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" size="sm" onClick={() => setShowProfile(false)}>Cancel</Button>
              <Button size="sm" onClick={saveProfile} disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => setShowLeaderboard(false)}>
          <div className="bg-background border border-border rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /> Leaderboard</h3>
              <button onClick={() => setShowLeaderboard(false)} className="text-foreground/60 hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            {leaderboard.length === 0 ? (
              <p className="text-foreground/60 text-center py-8">No players yet. Be the first to earn points!</p>
            ) : (
              <div className="space-y-1">
                {leaderboard.map((entry, i) => (
                  <div key={entry.id} className={`flex items-center justify-between px-3 py-2 rounded-lg ${entry.id === user?.id ? 'bg-primary/15 border border-primary/40' : 'hover:bg-muted/40'}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-6 text-center font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-foreground/50'}`}>
                        {i < 3 ? <Medal className="h-4 w-4 inline" /> : i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-foreground font-medium truncate">{entry.name}{entry.id === user?.id ? ' (you)' : ''}</p>
                        {entry.tech_role && <p className="text-xs text-foreground/50">{entry.tech_role}</p>}
                      </div>
                    </div>
                    <span className="font-semibold text-primary flex items-center gap-1"><Star className="h-3.5 w-3.5" />{entry.points}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => setShowClearConfirm(false)}>
          <div className="bg-background border border-red-500/40 rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2"><XCircle className="h-5 w-5 text-red-500" /> Clear all challenges?</h3>
            <p className="text-foreground/70 text-sm mb-6">
              This permanently deletes <strong>all</strong> your challenges — available, in-progress, completed, and failed — from your account. Your points are not affected. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowClearConfirm(false)}>Cancel</Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={doClearAll}>Yes, clear everything</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Require login: redirects to /login if there's no authenticated user, so the
// dashboard always operates on a real, unique account (never the demo fallback).
export default function DashboardPageGated() {
  return (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  )
}