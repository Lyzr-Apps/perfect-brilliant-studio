'use client'

import { useState, useEffect } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Terminal, Trophy, Target, Zap, Award, Brain, Code } from 'lucide-react'
import { FaFlask, FaLandmark, FaFootballBall, FaFilm, FaGlobeAmericas, FaBook } from 'react-icons/fa'

// Terminal/Hacker Theme Configuration
const THEME_VARS = {
  '--background': '0 0% 7%',
  '--foreground': '120 100% 50%',
  '--card': '0 0% 10%',
  '--card-foreground': '120 100% 50%',
  '--popover': '0 0% 10%',
  '--popover-foreground': '120 100% 50%',
  '--primary': '120 100% 40%',
  '--primary-foreground': '0 0% 7%',
  '--secondary': '0 0% 15%',
  '--secondary-foreground': '120 100% 50%',
  '--accent': '160 100% 50%',
  '--accent-foreground': '0 0% 7%',
  '--destructive': '0 100% 50%',
  '--destructive-foreground': '0 0% 100%',
  '--muted': '0 0% 20%',
  '--muted-foreground': '120 60% 60%',
  '--border': '120 100% 30%',
  '--input': '0 0% 15%',
  '--ring': '120 100% 50%',
  '--radius': '0.25rem'
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
  { name: 'Science', icon: FaFlask, color: 'hsl(120 100% 50%)' },
  { name: 'History', icon: FaLandmark, color: 'hsl(160 100% 50%)' },
  { name: 'Sports', icon: FaFootballBall, color: 'hsl(120 100% 50%)' },
  { name: 'Entertainment', icon: FaFilm, color: 'hsl(160 100% 50%)' },
  { name: 'Geography', icon: FaGlobeAmericas, color: 'hsl(120 100% 50%)' },
  { name: 'General Knowledge', icon: FaBook, color: 'hsl(160 100% 50%)' }
]

// Markdown renderer for explanations
function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2 font-mono">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return (
            <h4 key={i} className="font-semibold text-sm mt-3 mb-1 text-accent tracking-wider">
              {line.slice(4)}
            </h4>
          )
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="font-semibold text-base mt-3 mb-1 text-accent tracking-wider">
              {line.slice(3)}
            </h3>
          )
        if (line.startsWith('# '))
          return (
            <h2 key={i} className="font-bold text-lg mt-4 mb-2 text-foreground tracking-wider">
              {line.slice(2)}
            </h2>
          )
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li key={i} className="ml-4 list-disc text-sm text-foreground">
              {formatInline(line.slice(2))}
            </li>
          )
        if (/^\d+\.\s/.test(line))
          return (
            <li key={i} className="ml-4 list-decimal text-sm text-foreground">
              {formatInline(line.replace(/^\d+\.\s/, ''))}
            </li>
          )
        if (!line.trim()) return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm text-foreground">
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
      <strong key={i} className="font-bold text-accent">
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
    <div style={THEME_VARS} className="min-h-screen bg-background font-mono">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Terminal className="w-10 h-10 text-primary" style={{ filter: 'drop-shadow(0 0 8px rgba(0, 255, 0, 0.5))' }} />
            <h1 className="text-4xl font-bold text-foreground tracking-wider uppercase" style={{ textShadow: '0 0 10px rgba(0, 255, 0, 0.5)' }}>
              Trivia Quest Terminal
            </h1>
            <Code className="w-8 h-8 text-accent" style={{ filter: 'drop-shadow(0 0 8px rgba(0, 255, 255, 0.5))' }} />
          </div>
          <p className="text-muted-foreground text-sm tracking-wider">
            &gt; SYSTEM v1.0 | TEST YOUR KNOWLEDGE ACROSS MULTIPLE CATEGORIES
          </p>
        </div>

        {/* Setup Screen */}
        {quizState === 'setup' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <Card className="border-2 border-border shadow-lg shadow-primary/10 bg-card">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-center tracking-wider uppercase text-foreground">
                  === SELECT CATEGORY ===
                </CardTitle>
                <CardDescription className="text-center tracking-wide text-muted-foreground">
                  &gt; INITIALIZE TRIVIA PROTOCOL
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
                        className={`p-6 rounded-sm border-2 transition-all duration-300 hover:shadow-lg ${
                          isSelected
                            ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                            : 'border-border bg-card hover:border-primary/50 hover:shadow-md hover:shadow-primary/10'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-3">
                          <IconComponent
                            className="w-8 h-8"
                            style={{
                              color: isSelected ? category.color : 'hsl(120 60% 60%)',
                              filter: isSelected ? 'drop-shadow(0 0 6px rgba(0, 255, 0, 0.4))' : 'none'
                            }}
                          />
                          <span
                            className={`text-sm font-bold text-center uppercase tracking-wider ${
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
                  <label className="text-sm font-bold text-foreground uppercase tracking-wider">
                    &gt; DIFFICULTY LEVEL
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map((level) => (
                      <button
                        key={level}
                        onClick={() => setDifficulty(level)}
                        className={`py-3 px-4 rounded-sm border-2 transition-all duration-300 font-bold text-sm uppercase tracking-wider ${
                          difficulty === level
                            ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                            : 'border-border bg-secondary text-secondary-foreground hover:border-primary/50 hover:shadow-md hover:shadow-primary/10'
                        }`}
                      >
                        [ {level} ]
                      </button>
                    ))}
                  </div>
                </div>

                {/* Start Button */}
                <Button
                  onClick={startQuiz}
                  disabled={loading}
                  className="w-full py-6 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 uppercase tracking-wider rounded-sm border-2 border-primary"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      INITIALIZING...
                    </>
                  ) : (
                    <>
                      &gt; START_QUIZ.EXE
                    </>
                  )}
                </Button>

                {error && (
                  <div className="p-4 bg-destructive/10 border-2 border-destructive rounded-sm">
                    <p className="text-destructive text-sm text-center uppercase tracking-wide">[ ERROR ] {error}</p>
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
            <Card className="border-2 border-border shadow-md shadow-primary/10 bg-card">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground uppercase tracking-wider">
                    QUESTION {String(currentQuestion.question_number ?? 0).padStart(2, '0')}/10
                  </span>
                  <div className="flex gap-4">
                    <Badge variant="secondary" className="font-bold uppercase tracking-wider border border-border">
                      <Trophy className="w-3 h-3 mr-1" />
                      SCORE: {currentQuestion.current_score ?? 0}
                    </Badge>
                    <Badge variant="secondary" className="font-bold uppercase tracking-wider border border-border">
                      <Zap className="w-3 h-3 mr-1" />
                      STREAK: {currentQuestion.current_streak ?? 0}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs uppercase tracking-wider">PROGRESS:</span>
                  <div className="flex-1">
                    <Progress
                      value={((currentQuestion.question_number ?? 0) / 10) * 100}
                      className="h-2 bg-muted border border-border"
                    />
                  </div>
                  <span className="text-foreground text-xs font-bold">{Math.round(((currentQuestion.question_number ?? 0) / 10) * 100)}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Question Card */}
            <Card className="border-2 border-border shadow-lg shadow-primary/10 bg-card">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-center leading-relaxed tracking-wide text-foreground">
                  &gt; {currentQuestion.question_text ?? 'Loading question...'}
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
                        className={`p-4 rounded-sm border-2 text-left transition-all duration-300 ${
                          selectedAnswer === option.label
                            ? 'border-primary bg-primary/10 shadow-md shadow-primary/20'
                            : 'border-border bg-secondary hover:border-primary/50 hover:shadow-sm hover:shadow-primary/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-8 h-8 rounded-sm flex items-center justify-center font-bold text-sm border ${
                              selectedAnswer === option.label
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            {option.label}
                          </span>
                          <span
                            className={`font-medium text-sm tracking-wide ${
                              selectedAnswer === option.label
                                ? 'text-primary font-bold'
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
                  className="w-full py-6 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 uppercase tracking-wider rounded-sm border-2 border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      CHECKING...
                    </>
                  ) : (
                    <>
                      <Target className="w-5 h-5 mr-2" />
                      [ SUBMIT_ANSWER ]
                    </>
                  )}
                </Button>

                {error && (
                  <div className="p-4 bg-destructive/10 border-2 border-destructive rounded-sm">
                    <p className="text-destructive text-sm text-center uppercase tracking-wide">[ ERROR ] {error}</p>
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
                  ? 'border-primary bg-primary/5 shadow-primary/20'
                  : 'border-destructive bg-destructive/5 shadow-destructive/20'
              }`}
            >
              <CardHeader>
                <div className="flex items-center justify-center gap-3 mb-2">
                  {feedbackData.is_correct ? (
                    <>
                      <Award className="w-12 h-12 text-primary" style={{ filter: 'drop-shadow(0 0 10px rgba(0, 255, 0, 0.6))' }} />
                      <CardTitle className="text-3xl font-bold uppercase tracking-wider" style={{ color: 'hsl(120 100% 50%)', textShadow: '0 0 10px rgba(0, 255, 0, 0.5)' }}>
                        [ ✓ CORRECT ]
                      </CardTitle>
                    </>
                  ) : (
                    <>
                      <Target className="w-12 h-12 text-destructive" style={{ filter: 'drop-shadow(0 0 10px rgba(255, 0, 0, 0.6))' }} />
                      <CardTitle className="text-3xl font-bold text-destructive uppercase tracking-wider" style={{ textShadow: '0 0 10px rgba(255, 0, 0, 0.3)' }}>
                        [ ✗ INCORRECT ]
                      </CardTitle>
                    </>
                  )}
                </div>
                <CardDescription className="text-center text-base text-muted-foreground tracking-wide">
                  {feedbackData.is_correct
                    ? `&gt; STREAK: ${feedbackData.current_streak ?? 0}`
                    : `&gt; CORRECT_ANSWER: ${feedbackData.correct_answer ?? 'N/A'}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Score Update */}
                <div className="flex justify-center gap-6">
                  <Badge variant="secondary" className="text-base px-4 py-2 font-bold uppercase tracking-wider border border-border">
                    <Trophy className="w-4 h-4 mr-2" />
                    SCORE: {feedbackData.current_score ?? 0}
                  </Badge>
                  <Badge variant="secondary" className="text-base px-4 py-2 font-bold uppercase tracking-wider border border-border">
                    <Zap className="w-4 h-4 mr-2" />
                    STREAK: {feedbackData.current_streak ?? 0}
                  </Badge>
                </div>

                {/* Explanation */}
                {feedbackData.explanation && (
                  <Card className="border-2 border-border bg-card/50 shadow-inner">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold uppercase tracking-wider text-accent">
                        &gt; EXPLANATION
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-foreground">
                        {renderMarkdown(feedbackData.explanation)}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Next Button */}
                <Button
                  onClick={nextQuestion}
                  disabled={loading}
                  className="w-full py-6 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 uppercase tracking-wider rounded-sm border-2 border-primary"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      LOADING...
                    </>
                  ) : (
                    <>
                      &gt; NEXT_QUESTION
                    </>
                  )}
                </Button>

                {error && (
                  <div className="p-4 bg-destructive/10 border-2 border-destructive rounded-sm">
                    <p className="text-destructive text-sm text-center uppercase tracking-wide">[ ERROR ] {error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Results Screen */}
        {quizState === 'results' && finalResults && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <Card className="border-2 border-border shadow-xl shadow-primary/20 bg-card">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <Trophy className="w-20 h-20 text-accent" style={{ filter: 'drop-shadow(0 0 15px rgba(0, 255, 255, 0.6))' }} />
                </div>
                <CardTitle className="text-4xl font-bold text-primary uppercase tracking-wider" style={{ textShadow: '0 0 10px rgba(0, 255, 0, 0.5)' }}>
                  === QUIZ COMPLETE ===
                </CardTitle>
                <CardDescription className="text-lg text-muted-foreground tracking-wide uppercase">
                  &gt; FINAL RESULTS
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Final Stats */}
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-2 text-foreground">
                    <div className="flex justify-between p-3 bg-primary/5 border border-primary/20 rounded-sm">
                      <span className="uppercase tracking-wider font-bold">FINAL SCORE</span>
                      <span className="font-bold text-primary text-xl">{finalResults.final_score ?? 0}/10</span>
                    </div>
                    <div className="flex justify-between p-3 bg-accent/5 border border-accent/20 rounded-sm">
                      <span className="uppercase tracking-wider font-bold">ACCURACY</span>
                      <span className="font-bold text-accent text-xl">{finalResults.accuracy_percentage ?? 0}%</span>
                    </div>
                    <div className="flex justify-between p-3 bg-primary/5 border border-primary/20 rounded-sm">
                      <span className="uppercase tracking-wider font-bold">BEST STREAK</span>
                      <span className="font-bold text-primary text-xl">{finalResults.best_streak ?? 0}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={resetQuiz}
                    className="py-6 text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30 uppercase tracking-wider rounded-sm border-2 border-primary"
                  >
                    [ PLAY_AGAIN ]
                  </Button>
                  <Button
                    onClick={resetQuiz}
                    variant="outline"
                    className="py-6 text-lg font-bold border-2 border-primary text-primary hover:bg-primary/10 shadow-lg shadow-primary/10 transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 uppercase tracking-wider rounded-sm bg-card"
                  >
                    [ CHANGE_CATEGORY ]
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Agent Status */}
        <Card className="mt-8 border-2 border-border shadow-sm shadow-primary/5 bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                <span className="font-bold uppercase tracking-wider text-foreground">QUIZ_MASTER_AGENT</span>
                <span className="text-muted-foreground/60">|</span>
                <span className="uppercase tracking-wide">TRIVIA GENERATION & EVALUATION</span>
              </div>
              {activeAgentId === AGENT_ID && (
                <Badge variant="secondary" className="text-xs uppercase tracking-wider border border-border">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ACTIVE
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
