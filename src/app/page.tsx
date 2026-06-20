import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import {
  Code,
  Zap,
  Target,
  BookOpen,
  Users,
  CheckCircle,
  ArrowRight,
  Brain,
  Lightbulb
} from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-14 sm:py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-7xl">
              Master Coding with
              <span className="text-primary"> Personalized</span> Challenges
            </h1>

            <p className="mt-4 sm:mt-6 text-base sm:text-lg leading-7 sm:leading-8 text-foreground/70 max-w-2xl mx-auto">
              Generate custom coding projects, tasks, and quizzes based on your learning journey.
              Practice with real-world challenges that adapt to your skill level and reinforce what you've learned.
            </p>

            <div className="mt-8 sm:mt-10 flex items-center justify-center gap-3 sm:gap-4 flex-col sm:flex-row">
              <Button size="xl" className="w-full sm:w-auto" asChild>
                <Link href="/signup">
                  <ArrowRight className="mr-2 h-5 w-5" />
                  Start Learning Free
                </Link>
              </Button>
              <Button variant="outline" size="xl" className="w-full sm:w-auto" asChild>
                <Link href="#how-it-works">See How It Works</Link>
              </Button>
            </div>

            <div className="mt-10 sm:mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:gap-8 text-xs sm:text-sm text-foreground/60">
              <div className="flex items-center">
                <CheckCircle className="mr-2 h-4 w-4 text-green-500 shrink-0" />
                Free to start
              </div>
              <div className="flex items-center">
                <CheckCircle className="mr-2 h-4 w-4 text-green-500 shrink-0" />
                No credit card required
              </div>
              <div className="flex items-center">
                <CheckCircle className="mr-2 h-4 w-4 text-green-500 shrink-0" />
                Cancel anytime
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-14 sm:py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-10 sm:mb-16">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              How PathCoder Works
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-foreground/70">
              Unlike generic coding challenges, PathCoder creates personalized content that builds on your specific learning path.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-background rounded-lg p-5 sm:p-6 shadow-sm border border-border">
              <Brain className="h-10 w-10 sm:h-12 sm:w-12 text-primary mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                AI-Powered Personalization
              </h3>
              <p className="text-sm sm:text-base text-foreground/70">
                Our AI analyzes your learning progress and generates challenges that perfectly match your skill level and recently learned concepts.
              </p>
            </div>

            <div className="bg-background rounded-lg p-5 sm:p-6 shadow-sm border border-border">
              <Target className="h-10 w-10 sm:h-12 sm:w-12 text-primary mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                Real-World Projects
              </h3>
              <p className="text-sm sm:text-base text-foreground/70">
                Practice with projects that simulate actual development scenarios, not just abstract algorithms.
              </p>
            </div>

            <div className="bg-background rounded-lg p-5 sm:p-6 shadow-sm border border-border">
              <Lightbulb className="h-10 w-10 sm:h-12 sm:w-12 text-primary mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                Complete Solutions
              </h3>
              <p className="text-sm sm:text-base text-foreground/70">
                Learn from well-documented solutions that teach best practices and explain the reasoning behind each approach.
              </p>
            </div>

            <div className="bg-background rounded-lg p-5 sm:p-6 shadow-sm border border-border">
              <Zap className="h-10 w-10 sm:h-12 sm:w-12 text-primary mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                Progressive Difficulty
              </h3>
              <p className="text-sm sm:text-base text-foreground/70">
                Start with beginner-friendly tasks and gradually progress to advanced challenges as your skills improve.
              </p>
            </div>

            <div className="bg-background rounded-lg p-5 sm:p-6 shadow-sm border border-border">
              <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 text-primary mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                Multi-Language Support
              </h3>
              <p className="text-sm sm:text-base text-foreground/70">
                Practice with frontend, backend, and full-stack technologies across multiple programming languages.
              </p>
            </div>

            <div className="bg-background rounded-lg p-5 sm:p-6 shadow-sm border border-border">
              <Users className="h-10 w-10 sm:h-12 sm:w-12 text-primary mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                Learning Analytics
              </h3>
              <p className="text-sm sm:text-base text-foreground/70">
                Track your progress, identify knowledge gaps, and see how your skills evolve over time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-14 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-10 sm:mb-16">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-foreground/70">
              Start free and upgrade when you're ready for unlimited learning.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {/* Free Tier */}
            <div className="bg-background rounded-lg p-5 sm:p-6 shadow-sm border border-border">
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">Starter</h3>
              <p className="text-2xl sm:text-3xl font-bold text-foreground mb-4">Free</p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-sm text-foreground/70">3 projects per month</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-sm text-foreground/70">Basic quizzes</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-sm text-foreground/70">Community solutions</span>
                </li>
              </ul>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/signup">Get Started</Link>
              </Button>
            </div>

            {/* Pro Tier */}
            <div className="bg-primary/5 rounded-lg p-5 sm:p-6 shadow-sm border-2 border-primary relative mt-3 md:mt-0">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-black px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap">
                  Most Popular
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">Pro</h3>
              <p className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                $9.99<span className="text-sm font-normal text-foreground/70">/month</span>
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-sm text-foreground/70">Unlimited projects</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-sm text-foreground/70">Instant solution access</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-sm text-foreground/70">Advanced difficulty levels</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-sm text-foreground/70">Priority AI generation</span>
                </li>
              </ul>
              <Button className="w-full" asChild>
                <Link href="/signup?plan=pro">Start Pro Trial</Link>
              </Button>
            </div>

            {/* Premium Tier */}
            <div className="bg-background rounded-lg p-5 sm:p-6 shadow-sm border border-border">
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">Premium</h3>
              <p className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                $19.99<span className="text-sm font-normal text-foreground/70">/month</span>
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-sm text-foreground/70">Everything in Pro</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-sm text-foreground/70">Custom learning paths</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-sm text-foreground/70">Team features</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-sm text-foreground/70">Progress analytics</span>
                </li>
              </ul>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/signup?plan=premium">Start Premium</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-14 sm:py-20 bg-primary/5">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl mb-3 sm:mb-4">
            Ready to Level Up Your Coding Skills?
          </h2>
          <p className="text-base sm:text-lg text-foreground/70 mb-6 sm:mb-8 max-w-2xl mx-auto">
            Join thousands of developers who are mastering programming with personalized, AI-generated challenges.
          </p>
          <Button size="xl" className="w-full sm:w-auto" asChild>
            <Link href="/signup">
              <ArrowRight className="mr-2 h-5 w-5" />
              Start Your Free Journey
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border py-10 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-2">
              <Code className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold text-foreground">PathCoder</span>
            </div>
            <p className="text-sm text-foreground/60">
              © 2024 PathCoder. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
