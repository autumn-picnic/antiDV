'use client'
import React from 'react'

export enum MediaType {
  mobile = 'mobile',
  tablet = 'tablet',
  pc = 'pc',
}

const useBreakpoints = () => {
  // Keep the server render and the first client render identical. The real
  // viewport is applied after mount, preventing a mobile hydration mismatch.
  const [width, setWidth] = React.useState<number | null>(null)
  const media = width == null
    ? MediaType.pc
    : width <= 640
      ? MediaType.mobile
      : width <= 768
        ? MediaType.tablet
        : MediaType.pc

  React.useEffect(() => {
    const handleWindowResize = () => setWidth(window.innerWidth)
    handleWindowResize()
    window.addEventListener('resize', handleWindowResize)
    return () => window.removeEventListener('resize', handleWindowResize)
  }, [])

  return media
}

export default useBreakpoints
