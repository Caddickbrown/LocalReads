import React, { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart3 } from 'lucide-react'
import { countsByYear, statsTiles, getRecentActivity, getCurrentGoalStatus, setReadingGoal } from '@/db/repo'
import { Card, CardHeader, CardContent, Button, Spinner, EmptyState, Input, ProgressBar } from './ui'

export default function Dashboard({ onBack, onYearClick }:{ onBack:()=>void, onYearClick:(y:number)=>void }){
  const [bars, setBars] = useState<{year:string, finished:number}[]>([])
  const [tiles, setTiles] = useState<{finishedThisYear:number, finishedThisMonth?:number, finishedThisWeek?:number, finishedToday?:number, toRead:number, reading:number, totalFinished:number, gemsTotal?: number}>({finishedThisYear:0,toRead:0,reading:0,totalFinished:0})
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [goalStatus, setGoalStatus] = useState<any>({ monthly: null, yearly: null })
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [isLoadingChart, setIsLoadingChart] = useState(true)
  const [showGoalForm, setShowGoalForm] = useState<'monthly' | 'yearly' | null>(null)
  const [goalInput, setGoalInput] = useState('')
  const currentYear = new Date().getFullYear()
  
  useEffect(()=>{ (async()=>{ 
    setIsLoadingStats(true)
    setIsLoadingChart(true)
    try {
      const [barsData, tilesData, activityData, goalStatusData] = await Promise.all([
        countsByYear(),
        statsTiles(currentYear),
        getRecentActivity(8),
        getCurrentGoalStatus()
      ])
      setBars(barsData)
      setTiles(tilesData)
      setRecentActivity(activityData)
      setGoalStatus(goalStatusData)
    } finally {
      setIsLoadingStats(false)
      setIsLoadingChart(false)
    }
  })() },[])
  
  const handleTileClick = (filterType: string, filterValue?: any) => {
    // Navigate to library and apply filter
    onBack() // This takes us to the library
    
    // Dispatch custom event to filter the library
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('dashboard-filter', { 
        detail: { type: filterType, value: filterValue } 
      }))
    }, 100) // Small delay to ensure we're on the library view
  }

  const handleSetGoal = async (goalType: 'monthly' | 'yearly') => {
    const target = parseInt(goalInput)
    if (!target || target <= 0) return

    const now = new Date()
    const targetPeriod = goalType === 'monthly' 
      ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      : now.getFullYear().toString()

    try {
      await setReadingGoal(goalType, targetPeriod, target)
      
      // Refresh goal status
      const newGoalStatus = await getCurrentGoalStatus()
      setGoalStatus(newGoalStatus)
      
      setShowGoalForm(null)
      setGoalInput('')
    } catch (error) {
      console.error('Failed to set goal:', error)
    }
  }
  
  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12">
        <CardHeader>
          <h2 className="dashboard-title flex items-center gap-2"><BarChart3 className="w-5 h-5"/> Dashboard & Stats</h2>
          <p className="dashboard-subtitle">Click any tile to filter your library</p>
        </CardHeader>
        <CardContent>
          {isLoadingStats ? (
            <div className="grid grid-cols-12 gap-4">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="col-span-12 md:col-span-4">
                  <div className="p-6 dashboard-stat rounded-2xl">
                    <div className="flex items-center justify-center py-4">
                      <Spinner size="md" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-4">
              <Stat 
                label="Finished this year" 
                value={tiles.finishedThisYear} 
                onClick={() => handleTileClick('year', currentYear)}
                icon="📅"
              />
              <Stat 
                label="Finished this month" 
                value={tiles.finishedThisMonth || 0}
                onClick={() => handleTileClick('month', 'current')}
                icon="📆"
              />
              <Stat 
                label="Finished this week" 
                value={tiles.finishedThisWeek || 0}
                onClick={() => handleTileClick('week', 'current')}
                icon="🗓️"
              />
              <Stat 
                label="Finished today" 
                value={tiles.finishedToday || 0}
                onClick={() => handleTileClick('day', 'current')}
                icon="⭐"
              />
              <Stat 
                label="To Read" 
                value={tiles.toRead}
                onClick={() => handleTileClick('status', 'To Read')}
                icon="📚"
              />
              <Stat 
                label="Reading now" 
                value={tiles.reading}
                onClick={() => handleTileClick('status', 'Reading')}
                icon="👀"
              />
              <Stat 
                label="Total Finished" 
                value={tiles.totalFinished}
                onClick={() => handleTileClick('status', 'Finished')}
                icon="🏆"
              />
              <Stat 
                label="Gems total" 
                value={tiles.gemsTotal || 0}
                onClick={() => handleTileClick('gems')}
                icon="✨"
              />
              
              
              
              {/* Reading Goals Section */}
              <Card className="col-span-12">
                <CardHeader>
                  <h3 className="text-heading-2 flex items-center gap-2">🎯 Reading Goals</h3>
                  <p className="text-body-small text-zinc-600 dark:text-zinc-400">Set and track your monthly and yearly reading targets</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Monthly Goal */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-zinc-700 dark:text-zinc-300">This Month</h4>
                      {goalStatus.monthly ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-zinc-600 dark:text-zinc-400">
                              {goalStatus.monthly.progress} / {goalStatus.monthly.goal.target_count} books
                            </span>
                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {goalStatus.monthly.percentage}%
                            </span>
                          </div>
                          <ProgressBar
                            value={goalStatus.monthly.percentage}
                            size="md"
                            showLabel={false}
                            color={goalStatus.monthly.percentage >= 100 ? 'success' : goalStatus.monthly.percentage >= 75 ? 'primary' : 'warning'}
                          />
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                              {goalStatus.monthly.percentage >= 100 ? '🎉 Goal achieved!' 
                               : `${goalStatus.monthly.goal.target_count - goalStatus.monthly.progress} books to go`}
                            </span>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setShowGoalForm('monthly')
                                setGoalInput(goalStatus.monthly.goal.target_count.toString())
                              }}
                            >
                              Edit Goal
                            </Button>
                          </div>
                        </div>
                      ) : showGoalForm === 'monthly' ? (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              min="1"
                              placeholder="Books per month"
                              value={goalInput}
                              onChange={(e) => setGoalInput(e.target.value)}
                              className="flex-1"
                            />
                            <Button onClick={() => handleSetGoal('monthly')}>
                              Set Goal
                            </Button>
                            <Button 
                              variant="secondary" 
                              onClick={() => {
                                setShowGoalForm(null)
                                setGoalInput('')
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <div className="text-zinc-400 text-sm mb-3">
                            📅 No monthly goal set
                          </div>
                          <Button onClick={() => setShowGoalForm('monthly')}>
                            Set Monthly Goal
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Yearly Goal */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm text-zinc-700 dark:text-zinc-300">This Year</h4>
                      {goalStatus.yearly ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-zinc-600 dark:text-zinc-400">
                              {goalStatus.yearly.progress} / {goalStatus.yearly.goal.target_count} books
                            </span>
                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {goalStatus.yearly.percentage}%
                            </span>
                          </div>
                          <ProgressBar
                            value={goalStatus.yearly.percentage}
                            size="md"
                            showLabel={false}
                            color={goalStatus.yearly.percentage >= 100 ? 'success' : goalStatus.yearly.percentage >= 75 ? 'primary' : 'warning'}
                          />
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                              {goalStatus.yearly.percentage >= 100 ? '🎉 Goal achieved!' 
                               : `${goalStatus.yearly.goal.target_count - goalStatus.yearly.progress} books to go`}
                            </span>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setShowGoalForm('yearly')
                                setGoalInput(goalStatus.yearly.goal.target_count.toString())
                              }}
                            >
                              Edit Goal
                            </Button>
                          </div>
                        </div>
                      ) : showGoalForm === 'yearly' ? (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              min="1"
                              placeholder="Books per year"
                              value={goalInput}
                              onChange={(e) => setGoalInput(e.target.value)}
                              className="flex-1"
                            />
                            <Button onClick={() => handleSetGoal('yearly')}>
                              Set Goal
                            </Button>
                            <Button 
                              variant="secondary" 
                              onClick={() => {
                                setShowGoalForm(null)
                                setGoalInput('')
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <div className="text-zinc-400 text-sm mb-3">
                            🗓️ No yearly goal set
                          </div>
                          <Button onClick={() => setShowGoalForm('yearly')}>
                            Set Yearly Goal
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Recent Activity Feed */}
              <Card className="col-span-12">
                <CardHeader>
                  <h3 className="font-semibold flex items-center gap-2">📝 Recent Activity</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Your latest reading milestones and highlights</p>
                </CardHeader>
                <CardContent>
                  {recentActivity.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-zinc-400 text-sm">
                        📚 No recent activity yet
                      </div>
                      <div className="text-xs text-zinc-500 mt-2">
                        Start reading and adding highlights to see your activity here
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentActivity.map((activity, index) => (
                        <div 
                          key={index}
                          className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <div className="flex-shrink-0 mt-1">
                            {activity.activity_type === 'finished' && (
                              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <span className="text-green-600 dark:text-green-400 text-sm">✓</span>
                              </div>
                            )}
                            {activity.activity_type === 'started' && (
                              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <span className="text-blue-600 dark:text-blue-400 text-sm">📖</span>
                              </div>
                            )}
                            {activity.activity_type === 'highlight' && (
                              <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                                <span className="text-yellow-600 dark:text-yellow-400 text-sm">✨</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                  {activity.activity_type === 'finished' && 'Finished reading'}
                                  {activity.activity_type === 'started' && 'Started reading'}
                                  {activity.activity_type === 'highlight' && 'Added highlight to'}
                                  {' '}
                                  <span className="font-semibold">
                                    {activity.title}
                                  </span>
                                </p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                  by {activity.author}
                                  {activity.series_name && ` • ${activity.series_name}`}
                                  {activity.series_number != null ? ` #${activity.series_number}` : ''}
                                </p>
                                
                                {/* Show rating for finished books */}
                                {activity.activity_type === 'finished' && activity.rating && (
                                  <div className="flex items-center gap-1 mt-1">
                                    {[...Array(activity.rating)].map((_, i) => (
                                      <span key={i} className="text-yellow-400 text-xs">★</span>
                                    ))}
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-1">
                                      {activity.rating}/5
                                    </span>
                                  </div>
                                )}
                                
                                {/* Show highlight text (truncated) */}
                                {activity.activity_type === 'highlight' && activity.review && (
                                  <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 italic">
                                    "{activity.review.length > 100 
                                      ? activity.review.substring(0, 100) + '...' 
                                      : activity.review}"
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex flex-col items-end ml-2">
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                  {new Date(activity.activity_date).toLocaleDateString()}
                                </span>
                                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                                  {activity.type}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="col-span-12">
        <CardHeader>
          <div className="text-heading-3">Books Finished per Year (click a bar)</div>
        </CardHeader>
        <CardContent>
          {isLoadingChart ? (
            <div className="flex flex-col items-center justify-center h-72">
              <Spinner size="lg" className="mb-4" />
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading reading statistics...</p>
            </div>
          ) : bars.length === 0 ? (
            <EmptyState
              illustration="dashboard"
              title="No reading data yet"
              description="Start tracking your reading by adding books and marking them as finished. Your reading statistics will appear here as you build your library."
              tips={[
                "Add books to your library and mark them as 'Finished'",
                "Set reading dates to track your progress over time",
                "Use the Dashboard tiles to filter your library view",
                "Your yearly progress will display here"
              ]}
              action={
                <Button onClick={onBack}>
                  Go to Library
                </Button>
              }
            />
          ) : (
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bars}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar 
                    dataKey="finished" 
                    fill="#6366f1" 
                    onClick={(data: any, index: number) => {
                      console.log('Bar clicked with data:', data);
                      console.log('Index:', index);
                      console.log('Bars data:', bars);
                      
                      // Get the year from the bars array using the index
                      if (index >= 0 && index < bars.length) {
                        const year = Number(bars[index].year);
                        console.log('Year from bars array:', year);
                        if (!isNaN(year)) {
                          console.log('Calling onYearClick with year:', year);
                          onYearClick(year);
                        } else {
                          console.log('Invalid year from bars array');
                        }
                      } else {
                        console.log('Invalid index:', index);
                      }
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value, onClick, icon }:{ label:string, value:number, onClick?:()=>void, icon?:string }){
  return (
    <div className="col-span-12 md:col-span-4">
      <div 
        className={`p-6 dashboard-stat rounded-2xl transition-all duration-300 ${
          onClick 
            ? 'cursor-pointer hover:scale-105 hover:shadow-xl hover:-translate-y-2 hover:rotate-1 group' 
            : ''
        }`} 
        onClick={onClick}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="stat-number group-hover:text-white transition-colors">
            {value}
          </div>
          {icon && (
            <span className="text-2xl opacity-80 group-hover:scale-125 group-hover:rotate-12 transition-all duration-300">
              {icon}
            </span>
          )}
        </div>
        <div className="stat-label opacity-90 group-hover:opacity-100 transition-opacity">
          {label}
        </div>
      </div>
    </div>
  )
}