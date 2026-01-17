import { describe, it, expect } from 'vitest'

describe('Hello World Test - Frontend', () => {
  it('should pass a simple hello world test', () => {
    const message = 'Hello World'
    expect(message).toBe('Hello World')
  })

  it('should perform basic arithmetic', () => {
    expect(1 + 1).toBe(2)
  })

  it('should verify string concatenation', () => {
    const hello = 'Hello'
    const world = 'World'
    expect(`${hello} ${world}`).toBe('Hello World')
  })
})
