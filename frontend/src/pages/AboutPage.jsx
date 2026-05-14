import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Separator } from '../components/ui/separator'
import { Users, Info, Cpu, Globe, Rocket, ShieldCheck } from 'lucide-react'

export default function AboutPage() {
  const teamMembers = [
    { name: 'Alex River', role: 'Full Stack Dev', icon: Users },
    { name: 'Sam Chen', role: 'UI/UX Designer', icon: Globe },
    { name: 'Jordan Lee', role: 'AI Specialist', icon: Cpu },
    { name: 'Taylor Swift', role: 'Project Manager', icon: Rocket },
  ]

  const techStack = [
    { name: 'React', variant: 'default' },
    { name: 'Vite', variant: 'secondary' },
    { name: 'Tailwind CSS', variant: 'outline' },
    { name: 'Framer Motion', variant: 'default' },
    { name: 'Lucide Icons', variant: 'secondary' },
    { name: 'Shadcn/UI', variant: 'outline' },
    { name: 'Supabase', variant: 'default' },
  ]

  return (
    <div className="container mx-auto py-12 px-4 max-w-5xl">
      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <h1 className="text-4xl md:text-5xl font-extrabold mb-6">About <span className="solar-text-gradient">SolarApp</span></h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          SolarApp is a capstone project dedicated to making renewable energy accessible to everyone. 
          We leverage cutting-edge AI to simplify the transition to solar power for homeowners worldwide.
        </p>
      </motion.section>

      <Separator className="my-12" />

      {/* Team Section */}
      <section className="mb-20">
        <div className="flex items-center gap-2 mb-8">
          <Users className="h-6 w-6 text-primary" />
          <h2 className="text-3xl font-bold">Our Team</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {teamMembers.map((member, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="text-center hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <member.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{member.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Background Section */}
      <section className="mb-20 bg-muted/30 p-8 rounded-2xl border">
        <div className="flex items-center gap-2 mb-6">
          <Info className="h-6 w-6 text-primary" />
          <h2 className="text-3xl font-bold">Project Background</h2>
        </div>
        <div className="space-y-6 text-lg text-muted-foreground">
          <p>
            The global shift towards sustainable energy is often hindered by complexity and high initial costs. 
            Homeowners frequently find it difficult to navigate the vast array of solar panel options and understand 
            which solution best fits their specific geographic and financial constraints.
          </p>
          <div className="grid md:grid-cols-2 gap-8 pt-4">
            <div>
              <h3 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                The Problem
              </h3>
              <p>Lack of clear, personalized information often leads to decision paralysis or sub-optimal investments in renewable energy.</p>
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                The Solution
              </h3>
              <p>SolarApp provides an AI-driven matching engine that analyzes user requirements and environmental data to deliver instant, actionable recommendations.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="text-center pb-12">
        <h2 className="text-2xl font-bold mb-8">Built With Modern Tech</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {techStack.map((tech, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              viewport={{ once: true }}
            >
              <Badge variant={tech.variant} className="px-4 py-1.5 text-sm font-medium">
                {tech.name}
              </Badge>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}
