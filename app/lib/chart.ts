const HEADROOM = 1.2

export function niceMax(values: number[], headroom: number = HEADROOM): number {
  const peak = Math.max(...values, 1)
  const raw = peak * headroom
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = magnitude / 10
  return Math.ceil(raw / step) * step
}
