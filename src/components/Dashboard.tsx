import React, { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart3 } from 'lucide-react'
import { countsByYear, statsTiles } from '@/db/repo'
import { Card, CardHeader, CardContent, Button, Spinner } from './ui'

export default function Dashboard({ onBack, onYearClick }:{ onBack:()=>void, onYearClick:(y:number)=>void }){
  const [bars, setBars] = useState<{year:string, finished:number}[]>([])
  const [tiles, setTiles] = useState<{finishedThisYear:number, finishedThisMonth?:number, finishedThisWeek?:number, finishedToday?:number, toRead:number, reading:number, totalFinished:number}>({finishedThisYear:0,toRead:0,reading:0,totalFinished:0})
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [isLoadingChart, setIsLoadingChart] = useState(true)
  const currentYear = new Date().getFullYear()
  
  useEffect(()=>{ (async()=>{ 
    setIsLoadingStats(true)
    setIsLoadingChart(true)
    try {
      const [barsData, tilesData] = await Promise.all([
        countsByYear(),
        statsTiles(currentYear)
      ])
      setBars(barsData)
      setTiles(tilesData)
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
  
  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12">
        <CardHeader>
          <h2 className="font-semibold flex items-center gap-2"><BarChart3 className="w-5 h-5"/> Dashboard & Stats</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Click any tile to filter your library</p>
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
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="col-span-12">
        <CardHeader>
          <div className="font-medium">Books Finished per Year (click a bar)</div>
        </CardHeader>
        <CardContent>
          {isLoadingChart ? (
            <div className="flex flex-col items-center justify-center h-72">
              <Spinner size="lg" className="mb-4" />
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading reading statistics...</p>
            </div>
          ) : (
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bars}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="finished" fill="#6366f1" onClick={(data:any)=>{ const year = Number(data?.activeLabel ?? data?.payload?.year); if(!isNaN(year)) onYearClick(year); }} />
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
          <div className="text-4xl font-semibold leading-tight group-hover:text-white transition-colors">
            {value}
          </div>
          {icon && (
            <span className="text-2xl opacity-80 group-hover:scale-125 group-hover:rotate-12 transition-all duration-300">
              {icon}
            </span>
          )}
        </div>
        <div className="text-sm opacity-90 group-hover:opacity-100 transition-opacity">
          {label}
        </div>
        {onClick && (
          <div className="text-xs opacity-60 mt-1 group-hover:opacity-80 transition-opacity">
            Click to filter
          </div>
        )}
      </div>
    </div>
  )
}