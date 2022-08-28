interface TimingInput {
  size: number
  start: number
  end: number
}
export function getNetworkMbps(timings?: TimingInput[]): number {
  let mbpsSamples: number[] = []

  if (!timings) {
    if (typeof window === undefined || !window.performance || !window.performance.getEntriesByType) return 0
    mbpsSamples = window.performance
      .getEntriesByType('resource')
      .filter((r) => (r as PerformanceResourceTiming).transferSize && r.duration)
      .map(
        (r) =>
          ((r as PerformanceResourceTiming).transferSize * 8) /
          (((r as PerformanceResourceTiming).responseEnd - (r as PerformanceResourceTiming).responseStart) / 1000) /
          1000000,
      )
  } else {
    mbpsSamples = timings.filter((r) => r.size).map((r) => (r.size * 8) / ((r.end - r.start) / 1000) / 1000000)
  }
  return Math.round(mbpsSamples.reduce((a, b) => a + b) / mbpsSamples.length)
}
