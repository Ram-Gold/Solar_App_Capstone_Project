import { Sun } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center space-x-2 mb-4 md:mb-0">
          <Sun className="h-5 w-5 text-primary" />
          <span className="font-semibold">SolarApp</span>
        </div>
        <div className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} SolarApp. All rights reserved.
        </div>
        <div className="flex space-x-6 mt-4 md:mt-0">
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
            Privacy
          </a>
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
            Terms
          </a>
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
            Contact
          </a>
        </div>
      </div>
    </footer>
  )
}
