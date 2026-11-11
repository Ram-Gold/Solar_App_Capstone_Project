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
import { useRef, useState, useEffect, useCallback } from 'react'

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
  'Grid-Tied System Compatibility',
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
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const updateScrollButtons = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setCanScrollLeft(scrollLeft > 10)
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 15)
    }
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    updateScrollButtons()
    const timer = setTimeout(updateScrollButtons, 300)

    el.addEventListener('scroll', updateScrollButtons, { passive: true })
    window.addEventListener('resize', updateScrollButtons)

    return () => {
      clearTimeout(timer)
      el.removeEventListener('scroll', updateScrollButtons)
      window.removeEventListener('resize', updateScrollButtons)
    }
  }, [updateScrollButtons])

  const scroll = (direction) => {
    const container = scrollRef.current
    if (!container) return

    const { scrollLeft, scrollWidth, clientWidth } = container
    const items = container.querySelectorAll('[data-gallery-item]')
    const containerRect = container.getBoundingClientRect()

    const offsets = Array.from(items).map((el) => {
      return Math.round(el.getBoundingClientRect().left - containerRect.left + container.scrollLeft)
    })

    const sortedOffsets = offsets.sort((a, b) => a - b)
    const uniqueOffsets = sortedOffsets.filter((pos, idx, arr) => {
      return idx === 0 || Math.abs(pos - arr[idx - 1]) > 15
    })

    const buffer = 15
    const maxScroll = scrollWidth - clientWidth

    if (direction === 'right') {
      const nextOffset = uniqueOffsets.find((pos) => pos > scrollLeft + buffer)
      const target = nextOffset !== undefined ? Math.min(nextOffset, maxScroll) : maxScroll
      container.scrollTo({ left: target, behavior: 'smooth' })
    } else {
      const prevOffsets = uniqueOffsets.filter((pos) => pos < scrollLeft - buffer)
      const target = prevOffsets.length > 0 ? Math.max(0, prevOffsets[prevOffsets.length - 1]) : 0
      container.scrollTo({ left: target, behavior: 'smooth' })
    }
  }

  return (
    <div className="jd-page-bg font-inter text-jd-on-surface selection:bg-jd-primary-fixed">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-14 sm:pt-16 sm:pb-24 md:pt-24 md:pb-36 px-4 sm:px-6 lg:px-8">
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
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 rounded-full bg-jd-secondary-container/20 text-jd-secondary mb-3 sm:mb-6"
            >
              <HiOutlineSun className="text-base sm:text-lg" />
              <span className="text-[11px] sm:text-label-sm uppercase tracking-wider font-semibold">Quiapo's Solar Specialist</span>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-2xl sm:text-3xl md:text-headline-xl text-jd-on-background mb-3 sm:mb-6 leading-tight tracking-tight font-extrabold"
            >
              JD Solar: Your Digital <br className="hidden md:block" />
              Guide to <span className="text-jd-primary">Clean Energy</span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-xs sm:text-base md:text-body-lg text-jd-on-surface-variant mb-6 sm:mb-8 max-w-xl leading-relaxed"
            >
              Automated consultation and equipment sizing for solar lighting in Quiapo and Cavite.
              Review verified product specifications, check local stock, and schedule branch pickups.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-2.5 sm:gap-4">
              <Link
                to="/browse"
                className="bg-jd-primary-container text-jd-on-primary-container px-6 py-3 sm:px-8 sm:py-3.5 rounded-xl text-xs sm:text-label-md font-bold hover:shadow-lg transition-all text-center"
              >
                Browse Products
              </Link>
              <Link
                to="/match"
                className="border-2 border-jd-secondary text-jd-secondary px-6 py-3 sm:px-8 sm:py-3.5 rounded-xl text-xs sm:text-label-md font-bold hover:bg-jd-secondary/5 transition-all text-center"
              >
                Product Matching
              </Link>
            </motion.div>
          </motion.div>

          {/* Hero Image */}
          <motion.div
            className="lg:col-span-5 relative mt-6 lg:mt-0"
            initial={{ opacity: 0, x: 60, rotate: 3 }}
            animate={{ opacity: 1, x: 0, rotate: 3 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <div className="relative z-10 rounded-2xl overflow-hidden shadow-xl sm:shadow-2xl transform lg:rotate-3 hover:rotate-0 transition-transform duration-500 max-w-md mx-auto lg:max-w-none">
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
      <section className="bg-jd-surface-container-low py-12 px-4 sm:px-6 lg:px-8 sm:py-16 md:py-24">
        <div className="max-w-screen-2xl mx-auto">
          <motion.div
            className="text-center mb-8 sm:mb-14"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-xl sm:text-2xl md:text-headline-lg text-jd-on-surface mb-2 sm:mb-3 tracking-tight font-bold">
              What Our Customers Say
            </h2>
            <p className="text-xs sm:text-sm text-jd-on-surface-variant max-w-lg mx-auto">
              We take pride in our service and product quality. Here's what our satisfied clients have to say about their experience.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {reviews.map((review, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                className="bg-jd-surface p-5 sm:p-7 rounded-2xl shadow-[0px_4px_12px_rgba(0,0,0,0.05)] border border-jd-outline-variant hover:border-jd-secondary transition-all hover:shadow-lg group flex flex-col h-full"
              >
                <div className="flex gap-1 mb-2.5 sm:mb-4">
                  {[...Array(5)].map((_, i) => (
                    <HiStar key={i} className="text-[#ffb700] text-base sm:text-xl" />
                  ))}
                </div>
                
                <p className="text-jd-on-surface text-xs sm:text-body-md italic mb-4 sm:mb-8 flex-grow leading-relaxed">
                  "{review.review}"
                </p>
                
                <div className="mt-auto">
                  <h3 className="text-xs sm:text-label-lg font-bold text-jd-on-surface mb-0.5">
                    {review.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-label-sm text-jd-on-surface-variant">
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
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-screen-2xl mx-auto sm:py-16 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
          {/* Image Grid */}
          <motion.div
            className="relative order-2 lg:order-1"
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-3 sm:space-y-4">
                <img
                  className="rounded-xl w-full h-44 sm:h-64 object-cover shadow-md"
                  src={pic3}
                  alt="Close-up of high-quality monocrystalline solar panel cells"
                />
                <div className="bg-jd-primary text-jd-on-primary p-4 sm:p-6 rounded-xl">
                  <span className="text-lg sm:text-headline-md font-bold block mb-0.5">2 Years</span>
                  <span className="text-xs sm:text-label-md">Official Warranty</span>
                </div>
              </div>
              <div className="pt-8 sm:pt-12">
                <img
                  className="rounded-xl w-full h-56 sm:h-80 object-cover shadow-md"
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
            <h2 className="text-xl sm:text-2xl md:text-headline-lg text-jd-on-surface mb-3 sm:mb-6 tracking-tight font-bold">
              Sustainable Precision for Every Home
            </h2>
            <p className="text-jd-on-surface-variant mb-4 sm:mb-8 text-xs sm:text-sm md:text-body-lg leading-relaxed">
              We supply solar streetlights, floodlights, and mounting hardware built for
              tropical rain, dust, and continuous dusk-to-dawn operation in Metro Manila.
            </p>
            <ul className="space-y-2.5 sm:space-y-4 mb-6 sm:mb-10">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-2.5 sm:gap-3">
                  <HiOutlineCheckCircle className="text-jd-primary text-base sm:text-xl flex-shrink-0" />
                  <span className="text-xs sm:text-body-md">{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/browse"
              className="text-jd-secondary font-bold text-xs sm:text-label-md flex items-center gap-2 hover:gap-4 transition-all group"
            >
              Learn about our technology
              <HiOutlineArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Bento Box Gallery Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-screen-2xl mx-auto sm:py-16 md:py-24 overflow-hidden">
        <div className="flex justify-between items-end mb-8 sm:mb-14 px-2 sm:px-4 md:px-0">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-xl sm:text-2xl md:text-headline-lg text-jd-on-surface mb-1.5 sm:mb-4 tracking-tight font-bold">
              Project Gallery
            </h2>
            <p className="text-xs sm:text-sm text-jd-on-surface-variant max-w-lg">
              Completed solar lighting and battery installations supplied across residential streets, compounds, and commercial sites in Metro Manila and Cavite.
            </p>
          </motion.div>

          <div className="flex gap-2 sm:gap-4">
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full border border-jd-outline flex items-center justify-center text-jd-on-surface transition-all shadow-sm ${
                canScrollLeft
                  ? 'hover:bg-jd-primary hover:text-jd-on-primary hover:border-jd-primary cursor-pointer'
                  : 'opacity-40 cursor-not-allowed pointer-events-none'
              }`}
              aria-label="Scroll left"
            >
              <HiOutlineChevronLeft className="w-4 h-4 sm:w-6 sm:h-6" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full border border-jd-outline flex items-center justify-center text-jd-on-surface transition-all shadow-sm ${
                canScrollRight
                  ? 'hover:bg-jd-primary hover:text-jd-on-primary hover:border-jd-primary cursor-pointer'
                  : 'opacity-40 cursor-not-allowed pointer-events-none'
              }`}
              aria-label="Scroll right"
            >
              <HiOutlineChevronRight className="w-4 h-4 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        <motion.div
          ref={scrollRef}
          className="grid grid-rows-2 grid-flow-col gap-3 sm:gap-4 overflow-x-auto pb-8 sm:pb-12 scrollbar-hide snap-x snap-mandatory h-[340px] sm:h-[480px] md:h-[650px]"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {galleryItems.map((item, index) => (
            <motion.div
              key={index}
              data-gallery-item
              variants={fadeInUp}
              className={`flex-shrink-0 snap-start relative overflow-hidden rounded-xl sm:rounded-[2rem] shadow-md sm:shadow-xl
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
          <div className="w-8 sm:w-16 md:w-32" />
        </motion.div>
      </section>

    </div>
  )
}
