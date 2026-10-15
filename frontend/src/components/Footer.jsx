import { Link } from 'react-router-dom'
import { FaFacebook, FaInstagram, FaMailBulk } from 'react-icons/fa'
import jdSolarLogo from '../assets/jdsolarlogo.webp'

export default function Footer() {
  return (
    <footer className="bg-jds-surface-container-low border-t border-jds-outline-variant">
      <div className="flex flex-col md:flex-row gap-10 w-full px-4 md:px-10 py-12 max-w-[1400px] mx-auto">
        {/* Left Side: Interactive Map */}
        <div className="w-full md:w-[450px] h-[300px] rounded-2xl overflow-hidden border border-jds-outline-variant shadow-sm group relative">
          <div className="absolute inset-0 bg-jds-primary/5 pointer-events-none group-hover:opacity-0 transition-opacity z-10"></div>
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d888.9919047772149!2d120.98214420151635!3d14.602384154511645!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397cb0855ecf2eb%3A0x5f3e5e739aff7ba6!2sJD-Foz%20Solar%20Products%20Trading!5e0!3m2!1sen!2sph!4v1778779026094!5m2!1sen!2sph"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="JD-Foz Solar Store Location"
            className="grayscale contrast-[1.1] group-hover:grayscale-0 transition-all duration-700 ease-in-out"
          />
        </div>

        {/* Right Side: Branding and Navigation */}
        <div className="flex flex-col flex-1 justify-between">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-10">
            <div className="flex flex-col gap-4 max-w-sm">
              <Link to="/" className="inline-block group" aria-label="JD Solar Home">
                <img 
                  src={jdSolarLogo} 
                  alt="JD Solar" 
                  className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                />
              </Link>
              <p className="font-inter text-body-md text-jds-on-surface-variant leading-relaxed">
                JD-Foz Solar Products Trading. Quiapo's most trusted partner for sustainable energy solutions and high-quality solar technology.
              </p>
            </div>

            <nav className="flex flex-col gap-4 min-w-[140px] sm:text-right">
              <span className="font-inter text-label-sm font-bold uppercase tracking-widest text-jds-on-surface-variant/60">Navigation</span>
              <ul className="flex flex-col gap-2">
                <li><Link to="/" className="font-inter text-label-md text-jds-on-surface hover:text-jds-secondary transition-colors">Home</Link></li>
                <li><Link to="/browse" className="font-inter text-label-md text-jds-on-surface hover:text-jds-secondary transition-colors">Browse Products</Link></li>
                <li><Link to="/about" className="font-inter text-label-md text-jds-on-surface hover:text-jds-secondary transition-colors">About Us</Link></li>
                <li><Link to="/chat" className="font-inter text-label-md text-jds-on-surface hover:text-jds-secondary transition-colors">Solar Assistant</Link></li>
              </ul>
            </nav>
          </div>

          <div className="mt-12 pt-8 border-t border-jds-outline-variant flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex flex-col items-center sm:items-start gap-1">
              <span className="font-inter text-label-sm text-jds-on-surface-variant">
                © {new Date().getFullYear()} JD Solar Manila. All rights reserved.
              </span>
              <span className="font-inter text-[10px] text-jds-on-surface-variant/50 uppercase tracking-tighter">
                1645 Soler St. Brgy. 309 Cor Calero, Manila, Philippines, 1001
              </span>
            </div>

            <div className="flex items-center gap-5">
              <a href="https://www.facebook.com/profile.php?id=100067598921170" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-jds-outline-variant flex items-center justify-center text-jds-on-surface-variant hover:bg-jds-primary hover:text-white hover:border-jds-primary transition-all duration-300">
                <FaFacebook />
              </a>
              <a href="https://www.instagram.com/jdfozsolarproductstrading/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-jds-outline-variant flex items-center justify-center text-jds-on-surface-variant hover:bg-jds-primary hover:text-white hover:border-jds-primary transition-all duration-300">
                <FaInstagram />
              </a>
              <a href="mailto:fozjeremy@gmail.com" className="w-10 h-10 rounded-full border border-jds-outline-variant flex items-center justify-center text-jds-on-surface-variant hover:bg-jds-primary hover:text-white hover:border-jds-primary transition-all duration-300">
                <FaMailBulk />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

