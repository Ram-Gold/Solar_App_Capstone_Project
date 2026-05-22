import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  HiOutlineCheckCircle,
  HiOutlineArrowRight,
  HiOutlineSun,
  HiStar,
} from 'react-icons/hi2'

import pic1 from '../assets/pictures/pic1.jpg'
import pic3 from '../assets/pictures/pic3.jpg'
import pic4 from '../assets/pictures/pic4.jpg'
import pic5 from '../assets/pictures/pic5.jpg'
import pic7 from '../assets/pictures/pic7.jpg'
import pic8 from '../assets/pictures/pic8.jpg'
import pic9 from '../assets/pictures/pic9.jpg'
import pic10 from '../assets/pictures/pic10.jpg'
import pic11 from '../assets/pictures/pic11.jpg'
import pic12 from '../assets/pictures/pic12.jpg'
import pic13 from '../assets/pictures/pic13.jpg'
import pic14 from '../assets/pictures/pic14.jpg'
import pic15 from '../assets/pictures/pic15.jpg'
import { HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi2'
import { useRef } from 'react'

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

const reviews = [
  {
    name: 'Erwin ALubid',
    review: 'Verry accommodating and nothing to worry after buying. Verry good in after sales.',
    date: 'August 2025',
    source: 'Facebook Review',
  },
  {
    name: 'Jano Velasco',
    review: 'highly recommended provider of solar light. Trustworthy people, professional, madali kausap, very responsive. They can do supply and install option. Just coordinate with them thru Facebook. gagawaan pa nila ng group chat to give instruction while people onsite are doing the installation.',
    date: 'May 2024',
    source: 'Google Map Review',
  },
  {
    name: 'Bhert Agno',
    review: 'Good quality products and the transaction is fast ',
    date: 'July 2025',
    source: 'Facebook Review',
  },
]

const features = [
  'High-Efficiency Monocrystalline Panels',
  'Smart Cloud-Based Monitoring',
  'Seamless Grid-Tied Integration',
]

const galleryItems = [
  { src: pic8, title: 'Industrial Scale Solar', rowSpan: 2, width: 'w-[450px] md:w-[600px]' },
  { src: pic5, title: 'Precision Cells', rowSpan: 1, width: 'w-[300px] md:w-[400px]' },
  { src: pic9, title: 'Expert Installation', rowSpan: 1, width: 'w-[300px] md:w-[400px]' },
  { src: pic7, title: 'Residential Excellence', rowSpan: 2, width: 'w-[350px] md:w-[500px]' },
  { src: pic10, title: 'Future Ready', rowSpan: 1, width: 'w-[400px] md:w-[550px]' },
  { src: pic12, title: 'Maximum Efficiency', rowSpan: 1, width: 'w-[400px] md:w-[550px]' },
  { src: pic11, title: 'Urban Integration', rowSpan: 2, width: 'w-[500px] md:w-[700px]' },
  { src: pic13, title: 'Quality Assurance', rowSpan: 1, width: 'w-[350px] md:w-[450px]' },
  { src: pic15, title: 'Sustainable Future', rowSpan: 1, width: 'w-[350px] md:w-[450px]' },
  { src: pic14, title: 'Clean Power', rowSpan: 2, width: 'w-[300px] md:w-[400px]' },
]

export default function LandingPage() {
  const scrollRef = useRef(null)

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth / 2 : scrollLeft + clientWidth / 2
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' })
    }
  }

  return (
    <div className="jd-page-bg font-inter text-jd-on-surface selection:bg-jd-primary-fixed">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 md:pt-32 md:pb-48 px-4 sm:px-6 lg:px-8">
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
                src={pic1}
                alt="Modern rooftop solar panel installation under golden hour sun"
              />
            </div>
            {/* Background Decorations */}
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-jd-primary-fixed rounded-full blur-3xl opacity-30 -z-10" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-jd-secondary-fixed rounded-full blur-3xl opacity-30 -z-10" />
          </motion.div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="bg-jd-surface-container-low py-24 px-4 sm:px-6 lg:px-8 md:py-32">
        <div className="max-w-screen-2xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-headline-lg text-jd-on-surface mb-4 tracking-tight font-bold">
              What Our Customers Say
            </h2>
            <p className="text-jd-on-surface-variant max-w-lg mx-auto">
              We take pride in our service and product quality. Here's what our satisfied clients have to say about their experience.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {reviews.map((review, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                className="bg-jd-surface p-8 rounded-xl shadow-[0px_4px_12px_rgba(0,0,0,0.05)] border border-jd-outline-variant hover:border-jd-secondary transition-all hover:shadow-lg group flex flex-col h-full"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <HiStar key={i} className="text-[#ffb700] text-xl" />
                  ))}
                </div>
                
                <p className="text-jd-on-surface text-body-md italic mb-8 flex-grow leading-relaxed">
                  "{review.review}"
                </p>
                
                <div className="mt-auto">
                  <h3 className="text-label-lg font-bold text-jd-on-surface mb-1">
                    {review.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-label-sm text-jd-on-surface-variant">
                    <span>{review.date}</span>
                    <span className="w-1 h-1 rounded-full bg-jd-outline-variant" />
                    <span className="text-jd-secondary font-medium">{review.source}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Product Highlight Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-screen-2xl mx-auto md:py-40">
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
                  src={pic3}
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
                  src={pic4}
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

      {/* Bento Box Gallery Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-screen-2xl mx-auto md:py-32 overflow-hidden">
        <div className="flex justify-between items-end mb-16 px-4 md:px-0">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-headline-lg text-jd-on-surface mb-4 tracking-tight font-bold">
              Project Gallery
            </h2>
            <p className="text-jd-on-surface-variant max-w-lg">
              Experience our commitment to excellence through these captured moments of our solar installations across Manila.
            </p>
          </motion.div>

          <div className="flex gap-4">
            <button
              onClick={() => scroll('left')}
              className="w-12 h-12 rounded-full border border-jd-outline flex items-center justify-center text-jd-on-surface hover:bg-jd-primary hover:text-jd-on-primary hover:border-jd-primary transition-all shadow-sm"
              aria-label="Scroll left"
            >
              <HiOutlineChevronLeft size={24} />
            </button>
            <button
              onClick={() => scroll('right')}
              className="w-12 h-12 rounded-full border border-jd-outline flex items-center justify-center text-jd-on-surface hover:bg-jd-primary hover:text-jd-on-primary hover:border-jd-primary transition-all shadow-sm"
              aria-label="Scroll right"
            >
              <HiOutlineChevronRight size={24} />
            </button>
          </div>
        </div>

        <motion.div
          ref={scrollRef}
          className="grid grid-rows-2 grid-flow-col gap-4 overflow-x-auto pb-12 scrollbar-hide snap-x snap-mandatory h-[500px] md:h-[700px]"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {galleryItems.map((item, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              className={`flex-shrink-0 snap-start relative overflow-hidden rounded-[2rem] shadow-xl
                ${item.rowSpan === 2 ? 'row-span-2' : 'row-span-1'}
                ${item.width}`}
            >
              <img
                src={item.src}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </motion.div>
          ))}
          {/* Invisible padding to maintain cut-off look */}
          <div className="w-16 md:w-32" />
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
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
