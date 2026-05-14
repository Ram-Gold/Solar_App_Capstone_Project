import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  HiOutlineSparkles,
  HiOutlineCpuChip,
  HiOutlineWrenchScrewdriver,
  HiOutlineCheckBadge,
  HiOutlineBolt,
} from 'react-icons/hi2'

const features = [
  {
    icon: HiOutlineSparkles,
    title: 'Digital Product Guide',
    description:
      'Our proprietary software simplifies complex solar specifications into digestible insights, helping you choose panels that fit your specific energy profile.',
    accent: 'bg-jds-secondary-container text-jds-on-secondary-container',
  },
  {
    icon: HiOutlineCpuChip,
    title: 'Automated Assistant',
    description:
      "24/7 intelligent support that handles everything from technical troubleshooting to monitoring your system's efficiency in real-time.",
    accent: 'bg-jds-primary-container text-jds-on-primary-container',
  },
  {
    icon: HiOutlineWrenchScrewdriver,
    title: 'Technical Precision',
    description:
      'Every installation is backed by rigorous data analysis, ensuring your solar investment generates the maximum possible return for years to come.',
    accent: 'bg-jds-surface-container-high text-jds-on-surface-variant',
  },
]

const sectionVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

export default function AboutPage() {
  return (
    <div className="jds-page-bg font-inter text-jds-on-surface">
      {/* ── Hero Section ── */}
      <section className="py-16 md:py-24 px-0 bg-jds-surface">
        <div className="max-w-screen-2xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <motion.div
            className="md:col-span-7"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-label-md text-jds-secondary uppercase tracking-wider mb-4 block">
              Our Identity
            </span>
            <h1 className="text-headline-xl text-jds-on-surface mb-6 leading-tight">
              JD Solar Lightning Zone{' '}
              <br />
              <span className="text-jds-primary">Quiapo Manila</span>
            </h1>
            <p className="text-body-lg text-jds-on-surface-variant max-w-2xl mb-8">
              Empowering Manila with sustainable solar energy solutions through
              technology. We bridge the gap between complex engineering and
              everyday accessibility.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 bg-jds-surface-container-low px-4 py-2 rounded-full">
                <HiOutlineCheckBadge className="text-jds-primary text-xl" />
                <span className="text-label-md">Quiapo's Premier Partner</span>
              </div>
              <div className="flex items-center gap-2 bg-jds-surface-container-low px-4 py-2 rounded-full">
                <HiOutlineBolt className="text-jds-primary text-xl" />
                <span className="text-label-md">Sustainable Tech</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="md:col-span-5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <div className="aspect-square rounded-xl overflow-hidden shadow-[0px_4px_12px_rgba(0,0,0,0.05)]">
              <img
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBgWOrR1BZj9SxtMG3Nuoh5tPDyAeYNeAAi6tqbrmQQe7KNxvkKDz_5u6QeAEn9pdUVi_eGdI5EzVvkDY9f2o_XewBaMXvwXHETo6qLWwNKALlzFjGKUIXuAQCqx5tz3sN-iRwNjoDh0G96altU1tgqyuwmmY3w8NEIHib0fAPUp7CI_JlglKgMPWn4Qty0BOpUdx0oeKUDiL1qgFbp15pQXvA6K83jSqXaTccqixvMrdtBXvu9f_mem0siCCbUlntL8Q0A7Fzuhkg"
                alt="Solar panels on a rooftop under clear Philippine sky"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Future of Solar Selection ── */}
      <section className="py-20 px-0 bg-jds-surface-container-lowest">
        <div className="max-w-screen-2xl mx-auto">
          <motion.div
            className="text-center mb-16"
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <h2 className="text-headline-lg text-jds-on-surface mb-4">
              The Future of Solar Selection
            </h2>
            <p className="text-body-md text-jds-on-surface-variant max-w-xl mx-auto">
              We aren't just installers. We are your digital companions in the
              transition to renewable energy.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                className="bg-jds-surface p-8 rounded-xl border border-jds-outline-variant shadow-[0px_4px_12px_rgba(0,0,0,0.05)] flex flex-col items-start gap-4"
                variants={sectionVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${f.accent}`}>
                  <f.icon className="text-2xl" />
                </div>
                <h3 className="text-headline-md text-jds-on-surface">
                  {f.title}
                </h3>
                <p className="text-body-md text-jds-on-surface-variant">
                  {f.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Our Heritage / Quiapo Roots ── */}
      <section className="py-24 px-0 bg-jds-surface">
        <div className="max-w-screen-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          {/* Image */}
          <motion.div
            className="relative group order-2 md:order-1"
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <div className="absolute -inset-4 bg-jds-primary/5 rounded-[2rem] transform rotate-2 transition-transform group-hover:rotate-0 duration-700" />
            <div className="relative h-[500px] overflow-hidden rounded-2xl shadow-2xl">
              <img
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC22UDzWtnnpsCTT6kAOj1IVX4S6r4CUV3TvSCwjjbiGdOVB4VuqElU96TAY4HMVL7ykdSzUB4GCMwKEFHooBJj0UiKByPbwN3kMRFxLF7cis7LSJZoj5Xy7rnRB46Ak6hNfLWdYtYzANjXoiywmfpK4p4wHBaffQ-tJE05GJM41I9kj8AdSCHefNV6xMKSQJZp9ItpIyH6uaNGP_ssR_IT3EC2v_zdNM15JSttjHFUa_gUl7C5rXEezabBLR48thLL7Xy2O4Dq1kE"
                alt="Vibrant street scene in Quiapo, Manila"
              />
            </div>
          </motion.div>

          {/* Text */}
          <motion.div
            className="order-1 md:order-2 md:pl-12"
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <span className="text-label-md text-jds-secondary uppercase tracking-[0.3em] mb-6 block">
              Our Heritage
            </span>
            <h2 className="text-headline-xl text-jds-on-surface mb-8 leading-tight max-w-[15ch]">
              Born in the Heart of Quiapo
            </h2>
            <div className="space-y-6">
              <p className="text-body-lg text-jds-on-surface-variant leading-relaxed">
                JD Solar's journey began in the vibrant Lightning Zone of
                Quiapo, Manila. Known as the city's hub for technical innovation
                and commerce, our roots in this district taught us the value of
                resilience, community, and practical solutions.
              </p>
              <p className="text-body-lg text-jds-on-surface-variant leading-relaxed">
                We understand the specific energy needs of Manila's residents and
                businesses because we grew up alongside them. Today, we bring
                world-class solar technology back to the streets where it all
                started.
              </p>
            </div>

            <div className="mt-12 p-8 bg-jds-surface-container-low rounded-2xl border-l-8 border-jds-primary/20 relative">
              <span className="absolute top-4 left-4 text-jds-primary/10 font-serif text-6xl select-none">
                "
              </span>
              <p className="text-headline-md italic text-jds-primary leading-snug relative z-10">
                Quiapo's spirit of innovation is what drives us to push the
                boundaries of what solar energy can achieve in an urban
                environment.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Mission Statement ── */}
      <section className="py-24 px-0 bg-jds-primary text-white">
        <motion.div
          className="max-w-screen-2xl mx-auto text-center"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <h2 className="text-label-md uppercase tracking-[0.2em] mb-6 opacity-80">
            Our Mission
          </h2>
          <p className="text-headline-xl mb-10 max-w-4xl mx-auto leading-tight">
            "To democratize renewable energy in the Philippines by providing
            clear, tech-driven pathways to energy independence."
          </p>
          <div className="w-24 h-1 bg-white mx-auto mb-10 opacity-30" />
          <Link
            to="/browse"
            className="inline-block bg-white text-jds-primary text-label-md px-10 py-4 rounded-lg hover:bg-jds-surface-container-low transition-colors duration-200 font-bold"
          >
            Join the Movement
          </Link>
        </motion.div>
      </section>
    </div>
  )
}
