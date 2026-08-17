// ABOUTME: Tests the notice shown when a session never receives the room it joined.
// ABOUTME: Time is faked, since the whole point of the component is a delay.

// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import RelayNotice from './RelayNotice'
import { renderEn } from '../../test/render'

afterEach(cleanup)

describe('RelayNotice', () => {
  it('says nothing during the first seconds, when a slow relay is merely slow', () => {
    vi.useFakeTimers()
    try {
      renderEn(<RelayNotice stalled onLeave={() => {}} />)
      act(() => void vi.advanceTimersByTime(4000))
      expect(screen.queryByText(/not answering/i)).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('speaks up once the wait is no longer plausible', () => {
    vi.useFakeTimers()
    try {
      renderEn(<RelayNotice stalled onLeave={() => {}} />)
      act(() => void vi.advanceTimersByTime(5000))
      expect(screen.getByText(/not answering/i)).toBeDefined()
    } finally {
      vi.useRealTimers()
    }
  })

  it('clears itself once a late sync lands, the way y-websocket catches up on its own', () => {
    vi.useFakeTimers()
    try {
      const { rerender } = renderEn(<RelayNotice stalled onLeave={() => {}} />)
      act(() => void vi.advanceTimersByTime(5000))
      expect(screen.getByText(/not answering/i)).toBeDefined()

      rerender(<RelayNotice stalled={false} onLeave={() => {}} />)
      expect(screen.queryByText(/not answering/i)).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('says nothing at all while the session is healthy', () => {
    vi.useFakeTimers()
    try {
      renderEn(<RelayNotice stalled={false} onLeave={() => {}} />)
      act(() => void vi.advanceTimersByTime(20000))
      expect(screen.queryByText(/not answering/i)).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('offers the way out, and it is the only way out', () => {
    const onLeave = vi.fn()
    vi.useFakeTimers()
    try {
      renderEn(<RelayNotice stalled onLeave={onLeave} />)
      act(() => void vi.advanceTimersByTime(5000))
    } finally {
      vi.useRealTimers()
    }
    fireEvent.click(screen.getByRole('button', { name: /leave/i }))
    expect(onLeave).toHaveBeenCalled()
  })
})
