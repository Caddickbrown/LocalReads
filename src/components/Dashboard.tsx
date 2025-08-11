import React, { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BarChart3 } from 'lucide-react'
import { countsByYear, statsTiles } from '@/db/repo'
import { Card, CardHeader, CardContent, Button } from './ui'

export default function Dashboard({ onBack, onYearClick }:{ onBack:()=>void, onYearClick:(y:number)=>void }){
  const [bars, setBars] = useState<{year:string, finished:number}[]>([])
  const [tiles, setTiles] = useState<{finishedThisYear:number, toRead:number, reading:number}>({finishedThisYear:0,toRead:0,reading:0})
  const currentYear = new Date().getFullYear()
  useEffect(()=>{ (async()=>{ setBars(await countsByYear()); setTiles(await statsTiles(currentYear)); })() },[])
  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2"><BarChart3 className="w-5 h-5"/> Dashboard & Stats</h2>
            <Button onClick={onBack}>Back to Library</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-4">
            <Stat label="Finished this year" value={tiles.finishedThisYear} onClick={()=>onYearClick(currentYear)} />
            <Stat label="To Read" value={tiles.toRead} />
            <Stat label="Reading now" value={tiles.reading} />
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-12">
        <CardHeader>
          <div className="font-medium">Books Finished per Year (click a bar)</div>
        </CardHeader>
        <CardContent>
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bars}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="finished" onClick={(data:any)=>{ const year = Number(data?.activeLabel ?? data?.payload?.year); if(!isNaN(year)) onYearClick(year); }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value, onClick }:{ label:string, value:number, onClick?:()=>void }){
  return (
    <div className="col-span-12 md:col-span-4">
      <div className="p-6 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/30 dark:to-violet-900/30 rounded-2xl cursor-pointer" onClick={onClick}>
        <div className="text-4xl font-semibold leading-tight">{value}</div>
        <div className="text-sm opacity-80 mt-1">{label}</div>
      </div>
    </div>
  )
}