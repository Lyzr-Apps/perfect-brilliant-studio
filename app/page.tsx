'use client'

import { useState, useEffect } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Sparkles, Trophy, Target, Zap, Award, Brain } from 'lucide-react'
import { FaFlask, FaLandmark, FaFootballBall, FaFilm, FaGlobeAmericas, FaBook } from 'react-icons/fa'

// Theme configuration
const THEME_VARS = {
  '--background': '270 30% 98%',
  '--foreground': '270 30% 10%',
  '--card': '270 30% 96%',
  '--card-foreground': '270 30% 10%',
  '--popover': '270 30% 94%',
  '--popover-foreground': '270 30% 10%',
  '--primary': '262 83% 58%',
  '--primary-foreground': '270 30% 98%',
  '--secondary': '270 25% 92%',
  '--secondary-foreground': '270 30% 15%',
  '--accent': '280 70% 50%',
  '--accent-foreground': '270 30% 98%',
  '--destructive': '0 84% 60%',
  '--destructive-foreground': '0 0% 98%',
  '--muted': '270 20% 90%',
  '--muted-foreground': '270 20% 45%',
  '--border': '270 25% 88%',
  '--input': '270 20% 80%',
  '--ring': '262 83% 58%',
  '--radius': '0.75rem'
} as React.CSSProperties

const AGENT_ID = '698dbc8958f2926d8bc39f93'

interface QuizOption {
  label: string
  text: string
}

interface QuizMasterResponse {
  question_text?: string
  options?: QuizOption[]
  question_number?: number
  is_correct?: boolean
  correct_answer?: string
  explanation?: string
  current_score?: number
  current_streak?: number
  best_streak?: number
  final_score?: number
  accuracy_percentage?: number
  quiz_complete?: boolean
}

type QuizState = 'setup' | 'active' | 'feedback' | 'results'
type Difficulty = 'Easy' | 'Medium' | 'Hard'

interface Category {
  name: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

const categories: Category[] = [
  { name: 'Science', icon: FaFlask, color: 'hsl(262 83% 58%)' },
  { name: 'History', icon: FaLandmark, color: 'hsl(280 70% 50%)' },
  { name: 'Sports', icon: FaFootballBall, color: 'hsl(262 83% 58%)' },
  { name: 'Entertainment', icon: FaFilm, color: 'hsl(280 70% 50%)' },
  { name: 'Geography', icon: FaGlobeAmericas, color: 'hsl(262 83% 58%)' },
  { name: 'General Knowledge', icon: FaBook, color: 'hsl(280 70% 50%)' }
]

// Markdown renderer for explanations
function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return (
            <h4 key={i} className="font-semibold text-sm mt-3 mb-1">
              {line.slice(4)}
            </h4>
          )
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="font-semibold text-base mt-3 mb-1">
              {line.slice(3)}
            </h3>
          )
        if (line.startsWith('# '))
          return (
            <h2 key={i} className="font-bold text-lg mt-4 mb-2">
              {line.slice(2)}
            </h2>
          )
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li key={i} className="ml-4 list-disc text-sm">
              {formatInline(line.slice(2))}
            </li>
          )
        if (/^\d+\.\s/.test(line))
          return (
            <li key={i} className="ml-4 list-decimal text-sm">
              {formatInline(line.replace(/^\d+\.\s/, ''))}
            </li>
          )
        if (!line.trim()) return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm">
            {formatInline(line)}
          </p>
        )
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {part}
      </strong>
    ) : (
      part
    )
  )
}

export default function Home() {
  const [quizState, setQuizState] = useState<QuizState>('setup')
  const [selectedCategory, setSelectedCategory] = useState<string>('Science')
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium')
  const [messageHistory, setMessageHistory] = useState<any[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<QuizMasterResponse | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [feedbackData, setFeedbackData] = useState<QuizMasterResponse | null>(null)
  const [finalResults, setFinalResults] = useState<QuizMasterResponse | null>(null)
  const [activeAgentId, setActiveAgentId] = useState<string>('')

  const startQuiz = async () => {
    setLoading(true)
    setError('')
    setActiveAgentId(AGENT_ID)

    try {
      const message = `Start quiz: Category=${selectedCategory}, Difficulty=${difficulty}`
      const result = await callAIAgent(AGENT_ID, message, [])

      if (result.success && result.response?.result) {
        const data = result.response.result as QuizMasterResponse
        setCurrentQuestion(data)
        setMessageHistory([
          { role: 'user', content: message },
          { role: 'assistant', content: JSON.stringify(result.response.result) }
        ])
        setQuizState('active')
      } else {
        setError('Failed to start quiz. Please try again.')
      }
    } catch (err) {
      setError('An error occurred while starting the quiz.')
      console.error(err)
    } finally {
      setLoading(false)
      setActiveAgentId('')
    }
  }

  const submitAnswer = async () => {
    if (!selectedAnswer) return

    setLoading(true)
    setError('')
    setActiveAgentId(AGENT_ID)

    try {
      const message = `My answer is ${selectedAnswer}`
      const result = await callAIAgent(AGENT_ID, message, messageHistory)

      if (result.success && result.response?.result) {
        const data = result.response.result as QuizMasterResponse
        setFeedbackData(data)
        setMessageHistory(prev => [
          ...prev,
          { role: 'user', content: message },
          { role: 'assistant', content: JSON.stringify(result.response.result) }
        ])
        setQuizState('feedback')
      } else {
        setError('Failed to submit answer. Please try again.')
      }
    } catch (err) {
      setError('An error occurred while submitting your answer.')
      console.error(err)
    } finally {
      setLoading(false)
      setActiveAgentId('')
    }
  }

  const nextQuestion = async () => {
    setLoading(true)
    setError('')
    setActiveAgentId(AGENT_ID)
    setSelectedAnswer('')

    try {
      const message = 'Next question'
      const result = await callAIAgent(AGENT_ID, message, messageHistory)

      if (result.success && result.response?.result) {
        const data = result.response.result as QuizMasterResponse

        if (data.quiz_complete) {
          setFinalResults(data)
          setQuizState('results')
        } else {
          setCurrentQuestion(data)
          setMessageHistory(prev => [
            ...prev,
            { role: 'user', content: message },
            { role: 'assistant', content: JSON.stringify(result.response.result) }
          ])
          setQuizState('active')
        }
      } else {
        setError('Failed to load next question. Please try again.')
      }
    } catch (err) {
      setError('An error occurred while loading the next question.')
      console.error(err)
    } finally {
      setLoading(false)
      setActiveAgentId('')
    }
  }

  const resetQuiz = () => {
    setQuizState('setup')
    setMessageHistory([])
    setCurrentQuestion(null)
    setSelectedAnswer('')
    setFeedbackData(null)
    setFinalResults(null)
    setError('')
  }

  return (
    <div style={THEME_VARS} className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Brain className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-bold text-foreground tracking-tight font-sans">
              Trivia Quest
            </h1>
            <Sparkles className="w-8 h-8 text-accent" />
          </div>
          <p className="text-muted-foreground text-sm font-sans">
            Test your knowledge across multiple categories and difficulty levels
          </p>
        </div>

        {/* Setup Screen */}
        {quizState === 'setup' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <Card className="border-border shadow-md bg-card">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-center font-sans tracking-tight">
                  Choose Your Category
                </CardTitle>
                <CardDescription className="text-center font-sans">
                  Select a category and difficulty to begin your trivia challenge
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Category Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {categories.map((category) => {
                    const IconComponent = category.icon
                    const isSelected = selectedCategory === category.name
                    return (
                      <button
                        key={category.name}
                        onClick={() => setSelectedCategory(category.name)}
                        className={`p-6 rounded-xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg font-sans ${
                          isSelected
                            ? 'border-primary bg-primary/10 shadow-md'
                            : 'border-border bg-card hover:border-primary/50'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-3">
                          <IconComponent
                            className="w-8 h-8"
                            style={{ color: isSelected ? category.color : 'hsl(270 20% 45%)' }}
                          />
                          <span
                            className={`text-sm font-semibold text-center ${
                              isSelected ? 'text-primary' : 'text-foreground'
                            }`}
                          >
                            {category.name}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Difficulty Selector */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-foreground font-sans">
                    Difficulty Level
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map((level) => (
                      <button
                        key={level}
                        onClick={() => setDifficulty(level)}
                        className={`py-3 px-4 rounded-xl border-2 transition-all duration-300 font-sans font-semibold text-sm ${
                          difficulty === level
                            ? 'border-primary bg-primary text-primary-foreground shadow-md'
                            : 'border-border bg-secondary text-secondary-foreground hover:border-primary/50'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Start Button */}
                <Button
                  onClick={startQuiz}
                  disabled={loading}
                  className="w-full py-6 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg transition-all duration-300 hover:scale-105 font-sans tracking-tight rounded-xl"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Starting Quiz...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Start Quiz
                    </>
                  )}
                </Button>

                {error && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
                    <p className="text-destructive text-sm text-center font-sans">{error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Active Quiz Screen */}
        {quizState === 'active' && currentQuestion && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Progress and Stats */}
            <Card className="border-border shadow-md bg-card">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between text-sm font-sans">
                  <span className="text-muted-foreground">
                    Question {currentQuestion.question_number ?? 0} of 10
                  </span>
                  <div className="flex gap-4">
                    <Badge variant="secondary" className="font-semibold">
                      <Trophy className="w-3 h-3 mr-1" />
                      Score: {currentQuestion.current_score ?? 0}
                    </Badge>
                    <Badge variant="secondary" className="font-semibold">
                      <Zap className="w-3 h-3 mr-1" />
                      Streak: {currentQuestion.current_streak ?? 0}
                    </Badge>
                  </div>
                </div>
                <Progress
                  value={((currentQuestion.question_number ?? 0) / 10) * 100}
                  className="h-2"
                />
              </CardContent>
            </Card>

            {/* Question Card */}
            <Card className="border-border shadow-lg bg-card">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-center leading-relaxed font-sans tracking-tight">
                  {currentQuestion.question_text ?? 'Loading question...'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Answer Options */}
                <div className="grid grid-cols-1 gap-3">
                  {Array.isArray(currentQuestion.options) &&
                    currentQuestion.options.map((option) => (
                      <button
                        key={option.label}
                        onClick={() => setSelectedAnswer(option.label)}
                        disabled={loading}
                        className={`p-4 rounded-xl border-2 text-left transition-all duration-300 hover:scale-102 font-sans ${
                          selectedAnswer === option.label
                            ? 'border-primary bg-primary/10 shadow-md'
                            : 'border-border bg-secondary hover:border-primary/50 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                              selectedAnswer === option.label
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {option.label}
                          </span>
                          <span
                            className={`font-medium text-sm ${
                              selectedAnswer === option.label
                                ? 'text-primary font-semibold'
                                : 'text-foreground'
                            }`}
                          >
                            {option.text}
                          </span>
                        </div>
                      </button>
                    ))}
                </div>

                {/* Submit Button */}
                <Button
                  onClick={submitAnswer}
                  disabled={!selectedAnswer || loading}
                  className="w-full py-6 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg transition-all duration-300 hover:scale-105 font-sans tracking-tight rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Checking Answer...
                    </>
                  ) : (
                    <>
                      <Target className="w-5 h-5 mr-2" />
                      Submit Answer
                    </>
                  )}
                </Button>

                {error && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
                    <p className="text-destructive text-sm text-center font-sans">{error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Feedback Screen */}
        {quizState === 'feedback' && feedbackData && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Feedback Card */}
            <Card
              className={`border-2 shadow-lg ${
                feedbackData.is_correct
                  ? 'border-green-500 bg-green-50'
                  : 'border-destructive bg-destructive/5'
              }`}
            >
              <CardHeader>
                <div className="flex items-center justify-center gap-3 mb-2">
                  {feedbackData.is_correct ? (
                    <>
                      <Award className="w-12 h-12 text-green-600" />
                      <CardTitle className="text-3xl font-bold text-green-700 font-sans tracking-tight">
                        Correct!
                      </CardTitle>
                    </>
                  ) : (
                    <>
                      <Target className="w-12 h-12 text-destructive" />
                      <CardTitle className="text-3xl font-bold text-destructive font-sans tracking-tight">
                        Incorrect
                      </CardTitle>
                    </>
                  )}
                </div>
                <CardDescription className="text-center text-base font-sans">
                  {feedbackData.is_correct
                    ? `Great job! Your streak is now ${feedbackData.current_streak ?? 0}`
                    : `The correct answer was: ${feedbackData.correct_answer ?? 'N/A'}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Score Update */}
                <div className="flex justify-center gap-6">
                  <Badge variant="secondary" className="text-base px-4 py-2 font-semibold">
                    <Trophy className="w-4 h-4 mr-2" />
                    Score: {feedbackData.current_score ?? 0}
                  </Badge>
                  <Badge variant="secondary" className="text-base px-4 py-2 font-semibold">
                    <Zap className="w-4 h-4 mr-2" />
                    Streak: {feedbackData.current_streak ?? 0}
                  </Badge>
                </div>

                {/* Explanation */}
                {feedbackData.explanation && (
                  <Card className="border-border bg-card/50">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold font-sans tracking-tight">
                        Explanation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-foreground font-sans">
                        {renderMarkdown(feedbackData.explanation)}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Next Button */}
                <Button
                  onClick={nextQuestion}
                  disabled={loading}
                  className="w-full py-6 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg transition-all duration-300 hover:scale-105 font-sans tracking-tight rounded-xl"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Loading Next Question...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Next Question
                    </>
                  )}
                </Button>

                {error && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
                    <p className="text-destructive text-sm text-center font-sans">{error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Results Screen */}
        {quizState === 'results' && finalResults && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <Card className="border-border shadow-xl bg-card">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <Trophy className="w-20 h-20 text-accent" />
                </div>
                <CardTitle className="text-4xl font-bold text-primary font-sans tracking-tight">
                  Quiz Complete!
                </CardTitle>
                <CardDescription className="text-lg font-sans">
                  Here's how you performed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Final Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="pt-6 text-center">
                      <div className="text-4xl font-bold text-primary mb-2 font-sans">
                        {finalResults.final_score ?? 0}
                      </div>
                      <div className="text-sm text-muted-foreground font-sans font-semibold">
                        Final Score
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-accent/20 bg-accent/5">
                    <CardContent className="pt-6 text-center">
                      <div className="text-4xl font-bold text-accent mb-2 font-sans">
                        {finalResults.accuracy_percentage ?? 0}%
                      </div>
                      <div className="text-sm text-muted-foreground font-sans font-semibold">
                        Accuracy
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="pt-6 text-center">
                      <div className="text-4xl font-bold text-primary mb-2 font-sans">
                        {finalResults.best_streak ?? 0}
                      </div>
                      <div className="text-sm text-muted-foreground font-sans font-semibold">
                        Best Streak
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={resetQuiz}
                    className="py-6 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg transition-all duration-300 hover:scale-105 font-sans tracking-tight rounded-xl"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Play Again
                  </Button>
                  <Button
                    onClick={resetQuiz}
                    variant="outline"
                    className="py-6 text-lg font-bold border-2 border-primary text-primary hover:bg-primary/10 shadow-lg transition-all duration-300 hover:scale-105 font-sans tracking-tight rounded-xl"
                  >
                    <Brain className="w-5 h-5 mr-2" />
                    Change Category
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Agent Status */}
        <Card className="mt-8 border-border shadow-sm bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-sans">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                <span className="font-semibold">Quiz Master Agent</span>
                <span className="text-muted-foreground/60">•</span>
                <span>Trivia generation & evaluation</span>
              </div>
              {activeAgentId === AGENT_ID && (
                <Badge variant="secondary" className="text-xs">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Active
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
