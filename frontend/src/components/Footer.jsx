import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-jds-surface-container-low mt-20">
      <div className="flex flex-col md:flex-row justify-between items-center w-full px-4 md:px-6 py-8 max-w-[1400px] mx-auto gap-4">
        <div className="flex flex-col gap-1 items-center md:items-start">
          <span className="font-inter text-label-md font-bold text-jds-on-surface">JD Solar</span>
          <span className="font-inter text-label-sm text-jds-on-surface-variant text-center md:text-left">
            © {new Date().getFullYear()} JD Solar Manila. Quiapo's trusted solar partner.
          </span>
        </div>
        <nav className="flex gap-6">
          <a
            className="font-inter text-label-sm text-jds-on-surface-variant hover:text-jds-secondary underline transition-all"
            href="#"
          >
            Contact Us
          </a>
          <a
            className="font-inter text-label-sm text-jds-on-surface-variant hover:text-jds-secondary underline transition-all"
            href="#"
          >
            Privacy Policy
          </a>
          <a
            className="font-inter text-label-sm text-jds-on-surface-variant hover:text-jds-secondary underline transition-all"
            href="#"
          >
            Terms of Service
          </a>
        </nav>
      </div>
    </footer>
  )
}
