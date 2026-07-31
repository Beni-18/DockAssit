import React from 'react'

/**
 * Loader — full-page or inline loading spinner
 */
const Loader = ({ fullPage = false, size = 'md' }) => {
  const sizeMap = { sm: 'h-6 w-6', md: 'h-10 w-10', lg: 'h-16 w-16' }

  const spinner = (
    <div
      className={`animate-spin rounded-full border-b-2 border-primary ${sizeMap[size]}`}
    />
  )

  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        {spinner}
      </div>
    )
  }

  return <div className="flex items-center justify-center p-8">{spinner}</div>
}

export default Loader
