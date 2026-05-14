import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  HiOutlinePencilSquare,
  HiOutlineChartBar,
  HiOutlineWrenchScrewdriver,
  HiOutlineCheckCircle,
  HiOutlineArrowRight,
  HiOutlineSun,
  HiOutlineCpuChip,
} from 'react-icons/hi2'

import solarHeroImg from '../assets/solar_hero.png'
import solarPanelsImg from '../assets/solar_panels_closeup.png'
import solarTechnicianImg from '../assets/solar_technician.png'

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
}

const steps = [
  {
    icon: HiOutlinePencilSquare,
    title: '1. Input Needs',
    desc: 'Share your average energy consumption and roof dimensions through our intuitive digital portal.',
    iconBg: 'bg-jd-primary-container',
    iconColor: 'text-jd-on-primary-container',
  },
  {
    icon: HiOutlineChartBar,
    title: '2. Get Recommendations',
    desc: 'Our automated system analyzes your data to recommend the most efficient panel and inverter configuration.',
    iconBg: 'bg-jd-secondary-container',
    iconColor: 'text-jd-on-secondary-container',
  },
  {
    icon: HiOutlineWrenchScrewdriver,
    title: '3. Installation',
    desc: 'Our certified Quiapo-based team handles the logistics and installation, bringing your solar system online.',
    iconBg: 'bg-jd-primary',
    iconColor: 'text-jd-on-primary',
  },
]

const features = [
  'High-Efficiency Monocrystalline Panels',
  'Smart Cloud-Based Monitoring',
  'Seamless Grid-Tied Integration',
]

export default function LandingPage() {
  return (
    <div className="jd-page-bg font-inter text-jd-on-surface selection:bg-jd-primary-fixed">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 md:pt-32 md:pb-48 px-0">
        <div className="max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Hero Text */}
          <motion.div
            className="lg:col-span-7 z-10"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div
              variants={fadeInUp}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-jd-secondary-container/20 text-jd-secondary mb-6"
            >
              <HiOutlineSun className="text-lg" />
              <span className="text-label-sm uppercase tracking-wider">Quiapo's Solar Specialist</span>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-headline-lg-mobile md:text-headline-xl text-jd-on-background mb-6 leading-tight tracking-tight font-extrabold"
            >
              JD Solar: Your Digital <br className="hidden md:block" />
              Guide to <span className="text-jd-primary">Clean Energy</span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-body-lg text-jd-on-surface-variant mb-10 max-w-xl"
            >
              Automated customer assistance for solar solutions in Quiapo, Manila.
              Experience a sustainable future through transparent, expert-led technology.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/chat"
                className="bg-jd-primary-container text-jd-on-primary-container px-8 py-4 rounded-lg text-label-md font-bold hover:shadow-lg transition-all text-center"
              >
                Get Started
              </Link>
              <Link
                to="/browse"
                className="border-2 border-jd-secondary text-jd-secondary px-8 py-4 rounded-lg text-label-md font-bold hover:bg-jd-secondary/5 transition-all text-center"
              >
                View Solutions
              </Link>
            </motion.div>
          </motion.div>

          {/* Hero Image */}
          <motion.div
            className="lg:col-span-5 relative mt-12 lg:mt-0"
            initial={{ opacity: 0, x: 60, rotate: 3 }}
            animate={{ opacity: 1, x: 0, rotate: 3 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl transform lg:rotate-3 hover:rotate-0 transition-transform duration-500">
              <img
                className="w-full aspect-[4/5] object-cover"
                src={solarHeroImg}
                alt="Modern rooftop solar panel installation under golden hour sun"
              />
            </div>
            {/* Background Decorations */}
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-jd-primary-fixed rounded-full blur-3xl opacity-30 -z-10" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-jd-secondary-fixed rounded-full blur-3xl opacity-30 -z-10" />
          </motion.div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="bg-jd-surface-container-low py-24 px-0 md:py-32">
        <div className="max-w-screen-2xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-headline-lg text-jd-on-surface mb-4 tracking-tight font-bold">
              How it Works
            </h2>
            <p className="text-jd-on-surface-variant max-w-lg mx-auto">
              Transitioning to solar power has never been more straightforward. Follow our three-step digital guide.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {steps.map((step) => (
              <motion.div
                key={step.title}
                variants={fadeInUp}
                className="bg-jd-surface p-8 rounded-xl shadow-[0px_4px_12px_rgba(0,0,0,0.05)] border border-jd-outline-variant hover:border-jd-secondary transition-colors group"
              >
                <div
                  className={`w-14 h-14 ${step.iconBg} flex items-center justify-center rounded-lg mb-6 group-hover:scale-110 transition-transform`}
                >
                  <step.icon className={`text-[28px] ${step.iconColor}`} />
                </div>
                <h3 className="text-headline-md mb-4 text-jd-on-surface tracking-tight">
                  {step.title}
                </h3>
                <p className="text-jd-on-surface-variant text-body-md">{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Product Highlight Section */}
      <section className="py-24 px-0 max-w-screen-2xl mx-auto md:py-40">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Image Grid */}
          <motion.div
            className="relative order-2 lg:order-1"
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <img
                  className="rounded-xl w-full h-64 object-cover shadow-md"
                  src={solarPanelsImg}
                  alt="Close-up of high-quality monocrystalline solar panel cells"
                />
                <div className="bg-jd-primary text-jd-on-primary p-6 rounded-xl">
                  <span className="text-headline-md block mb-1">25+</span>
                  <span className="text-label-md">Years Warranty</span>
                </div>
              </div>
              <div className="pt-12">
                <img
                  className="rounded-xl w-full h-80 object-cover shadow-md"
                  src={solarTechnicianImg}
                  alt="Solar technician inspecting a modern smart inverter system"
                />
              </div>
            </div>
          </motion.div>

          {/* Text Content */}
          <motion.div
            className="order-1 lg:order-2"
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-headline-lg text-jd-on-surface mb-6 tracking-tight font-bold">
              Sustainable Precision for Every Home
            </h2>
            <p className="text-jd-on-surface-variant mb-8 text-body-lg">
              We don't just sell panels; we provide a complete energy ecosystem. Our solutions
              are tailored to Manila's unique climate and urban landscape, ensuring maximum yield
              even in dense environments.
            </p>
            <ul className="space-y-4 mb-10">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <HiOutlineCheckCircle className="text-jd-primary text-xl flex-shrink-0" />
                  <span className="text-body-md">{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/browse"
              className="text-jd-secondary font-bold text-label-md flex items-center gap-2 hover:gap-4 transition-all group"
            >
              Learn about our technology
              <HiOutlineArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-0">
        <motion.div
          className="max-w-screen-2xl mx-auto bg-jd-primary rounded-[2rem] p-12 md:p-20 text-center relative overflow-hidden"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="absolute inset-0 bg-white/5 pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-headline-lg-mobile md:text-headline-xl text-jd-on-primary mb-6 tracking-tight">
              Ready to Power Your Future?
            </h2>
            <p className="text-white/80 max-w-xl mx-auto mb-10 text-body-lg">
              Join hundreds of families in Quiapo and beyond who have made the switch to clean, affordable solar energy.
            </p>
            <Link
              to="/chat"
              className="inline-block bg-white text-jd-primary px-10 py-4 rounded-lg text-headline-md hover:bg-jd-surface-container-low transition-colors shadow-lg"
            >
              Get Your Free Quote
            </Link>
          </div>
        </motion.div>
      </section>

    </div>
  )
}
