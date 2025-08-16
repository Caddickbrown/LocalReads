import React from 'react'

export default function ResponsiveTest() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Responsive Test Component</h1>
      
      {/* Mobile Layout */}
      <div className="block md:hidden p-4 bg-green-200 rounded border-4 border-green-500">
        <h2 className="text-lg font-bold text-green-800">Mobile Layout (md:hidden)</h2>
        <p>This should be visible on small screens and hidden on medium screens and larger.</p>
        <p className="text-sm mt-2">Current breakpoint: &lt; 768px</p>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block p-4 bg-blue-200 rounded border-4 border-blue-500">
        <h2 className="text-lg font-bold text-blue-800">Desktop Layout (hidden md:block)</h2>
        <p>This should be hidden on small screens and visible on medium screens and larger.</p>
        <p className="text-sm mt-2">Current breakpoint: ≥ 768px</p>
      </div>

      {/* Always Visible */}
      <div className="p-4 bg-gray-200 rounded mt-4">
        <h2 className="text-lg font-bold">Always Visible</h2>
        <p>This should always be visible regardless of screen size.</p>
        <p className="text-sm mt-2">Window width: {typeof window !== 'undefined' ? window.innerWidth : 'Unknown'}px</p>
      </div>
    </div>
  )
}
