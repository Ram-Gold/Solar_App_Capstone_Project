import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import PrivacyPolicyModal from '../PrivacyPolicyModal'
import TermsOfServiceModal from '../TermsOfServiceModal'
import Footer from '../Footer'

describe('Legal Modals Suite', () => {
  afterEach(() => {
    cleanup()
  })

  describe('PrivacyPolicyModal', () => {
    it('does not render when isOpen is false', () => {
      render(<PrivacyPolicyModal isOpen={false} onClose={vi.fn()} />)
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('renders company data privacy commitments when isOpen is true', () => {
      const handleClose = vi.fn()
      render(<PrivacyPolicyModal isOpen={true} onClose={handleClose} />)

      expect(screen.getByRole('dialog')).toBeDefined()
      expect(screen.getByText(/Terms of service and privacy policy/i)).toBeDefined()
      expect(screen.getAllByText(/Republic Act 10173/i).length).toBeGreaterThan(0)
      expect(screen.getByText(/Purpose Limitation/i)).toBeDefined()
      expect(screen.getByText(/Zero third-party sharing/i)).toBeDefined()
      expect(screen.getByText(/Zero online payment data/i)).toBeDefined()
      expect(screen.getByText(/Automatic data hygiene/i)).toBeDefined()
      expect(screen.getByText(/fozjeremy@gmail.com/i)).toBeDefined()

      // Ensure no technical database jargon like postgres appears in text
      expect(screen.queryByText(/postgres/i)).toBeNull()
    })

    it('triggers onClose when close button is clicked', () => {
      const handleClose = vi.fn()
      render(<PrivacyPolicyModal isOpen={true} onClose={handleClose} />)

      const closeButtons = screen.getAllByRole('button', { name: /close/i })
      fireEvent.click(closeButtons[0])
      expect(handleClose).toHaveBeenCalledTimes(1)
    })

    it('triggers onClose on Escape key press', () => {
      const handleClose = vi.fn()
      render(<PrivacyPolicyModal isOpen={true} onClose={handleClose} />)

      fireEvent.keyDown(window, { key: 'Escape' })
      expect(handleClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('TermsOfServiceModal', () => {
    it('does not render when isOpen is false', () => {
      render(<TermsOfServiceModal isOpen={false} onClose={vi.fn()} />)
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('renders engineering disclaimers and operational terms when isOpen is true', () => {
      const handleClose = vi.fn()
      render(<TermsOfServiceModal isOpen={true} onClose={handleClose} />)

      expect(screen.getByRole('dialog')).toBeDefined()
      expect(screen.getByText(/Terms of service and privacy policy/i)).toBeDefined()
      expect(screen.getByText(/Product Matcher and Sizing Recommendations/i)).toBeDefined()
      expect(screen.getByText(/Online-to-Offline \(O2O\) Requests and Store Visits/i)).toBeDefined()
      expect(screen.getByText(/Privacy of Inquiries and Troubleshooting Requests/i)).toBeDefined()
      expect(screen.getByText(/Data Protection under Republic Act 10173/i)).toBeDefined()
      expect(screen.getByText(/2-Year Warranty and Coverage Guidelines/i)).toBeDefined()
      expect(screen.getByText(/Contact Information & Location/i)).toBeDefined()
    })

    it('triggers onClose when close button is clicked', () => {
      const handleClose = vi.fn()
      render(<TermsOfServiceModal isOpen={true} onClose={handleClose} />)

      const closeButtons = screen.getAllByRole('button', { name: /close/i })
      fireEvent.click(closeButtons[0])
      expect(handleClose).toHaveBeenCalledTimes(1)
    })

    it('triggers onClose on Escape key press', () => {
      const handleClose = vi.fn()
      render(<TermsOfServiceModal isOpen={true} onClose={handleClose} />)

      fireEvent.keyDown(window, { key: 'Escape' })
      expect(handleClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Footer Integration', () => {
    it('opens Privacy Policy and Terms of Service modals from footer trigger links', () => {
      render(
        <MemoryRouter>
          <Footer />
        </MemoryRouter>
      )

      expect(screen.queryByRole('dialog')).toBeNull()

      // Click Privacy Policy button
      const privacyBtn = screen.getByRole('button', { name: /^privacy policy$/i })
      fireEvent.click(privacyBtn)
      expect(screen.getByText(/Terms of service and privacy policy/i)).toBeDefined()

      // Close it
      const closePrivacy = screen.getAllByRole('button', { name: /close/i })[0]
      fireEvent.click(closePrivacy)
      expect(screen.queryByText(/Terms of service and privacy policy/i)).toBeNull()

      // Click Terms of Service button
      const termsBtn = screen.getByRole('button', { name: /^terms of service$/i })
      fireEvent.click(termsBtn)
      expect(screen.getByText(/Terms of service and privacy policy/i)).toBeDefined()

      // Close it
      const closeTerms = screen.getAllByRole('button', { name: /close/i })[0]
      fireEvent.click(closeTerms)
      expect(screen.queryByText(/Terms of service and privacy policy/i)).toBeNull()
    })
  })
})

