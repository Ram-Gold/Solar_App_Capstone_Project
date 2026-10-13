import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  HiOutlineSparkles,
  HiOutlineCpuChip,
  HiOutlineWrenchScrewdriver,
  HiOutlineCheckBadge,
  HiOutlineBolt,
  HiOutlineMapPin,
  HiOutlineClock,
  HiOutlinePhone,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineShieldCheck,
  HiOutlineUserGroup,
  HiOutlineScale,
  HiOutlineLightBulb,
} from 'react-icons/hi2'

import pic2 from '../assets/pictures/pic2.jpg'
import pic6 from '../assets/pictures/pic6.jpg'
import pic10 from '../assets/pictures/pic10.jpg'
import quezonBlvd from '../assets/pictures/Quezon_Boulevard_southbound.jpg'
import quiapoChurch from '../assets/pictures/Quiapo_Church_Facade.jpg'

const sectionVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export default function AboutPage() {
  return (
    <div className="jds-page-bg font-inter text-jds-on-surface grain-texture overflow-hidden">
      {/* ── Hero Section ── */}
      <section className="relative py-20 md:py-28 px-4 md:px-0 bg-jds-surface overflow-hidden border-b border-jds-outline-variant/30">
        {/* Background Image Layer */}
        <div
          className="absolute inset-0 z-0 opacity-10 grayscale brightness-75 contrast-125"
          style={{
            backgroundImage: `url(${quezonBlvd})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        {/* Sunlight Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-jds-primary-container/10 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-screen-2xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 items-center relative z-10 px-4 md:px-8">
          <motion.div
            className="md:col-span-7 flex flex-col justify-center"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-label-md text-jds-secondary uppercase tracking-[0.25em] mb-4 block font-semibold">
              Our Identity
            </span>
            <h1 className="text-headline-lg-mobile md:text-headline-xl text-jds-on-surface mb-2 leading-tight tracking-tight">
              JD Solar Lightning Zone <br />
              <span className="text-jds-primary font-extrabold">Quiapo Manila</span>
            </h1>
            
            <div className="w-20 h-1 bg-jds-primary mb-6 mt-2 rounded-full" />
            
            <h2 className="text-headline-md text-jds-secondary font-medium mb-4 leading-snug">
              A Spark in the Dark: Our Journey to Light the Philippines
            </h2>
            
            <p className="text-body-lg text-jds-on-surface-variant max-w-2xl mb-8 leading-relaxed">
              Founded during a global crisis, JD Force Solar was born to bring practical, 
              affordable power to Filipino families. We bridge the gap between complex 
              engineering and everyday accessibility, lighting up lives from the heart of Manila.
            </p>
            
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 bg-jds-surface-container-low px-4 py-2.5 rounded-full border border-jds-outline-variant/30 shadow-sm">
                <HiOutlineCheckBadge className="text-jds-primary text-xl shrink-0" />
                <span className="text-label-md font-medium text-jds-on-surface">Quiapo's Premier Partner</span>
              </div>
              <div className="flex items-center gap-2 bg-jds-surface-container-low px-4 py-2.5 rounded-full border border-jds-outline-variant/30 shadow-sm">
                <HiOutlineBolt className="text-jds-primary text-xl shrink-0" />
                <span className="text-label-md font-medium text-jds-on-surface">Est. 2020</span>
              </div>
              <div className="flex items-center gap-2 bg-jds-surface-container-low px-4 py-2.5 rounded-full border border-jds-outline-variant/30 shadow-sm">
                <HiOutlineMapPin className="text-jds-primary text-xl shrink-0" />
                <span className="text-label-md font-medium text-jds-on-surface">Cavite & Manila Branches</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="md:col-span-5"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-tr from-jds-primary/10 to-jds-secondary/10 rounded-2xl transform rotate-2 blur-md transition-transform group-hover:rotate-0 duration-500" />
              <div className="relative aspect-[4/3] md:aspect-square rounded-2xl overflow-hidden shadow-xl border-4 border-white">
                <img
                  className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700 ease-out"
                  src={pic6}
                  alt="Solar panels on a rooftop under clear Philippine sky"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Chapter 1: The Leap of Faith (Our Story) ── */}
      <section className="py-24 px-4 md:px-8 bg-jds-surface-container-lowest">
        <div className="max-w-screen-2xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            
            {/* Story Text */}
            <motion.div 
              className="lg:col-span-6 space-y-8"
              variants={sectionVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              <div>
                <h2 className="text-headline-lg text-jds-on-surface font-bold tracking-tight">
                  Born Out of Necessity, Built on Faith
                </h2>
                <div className="w-12 h-1 bg-jds-secondary mt-3 rounded-full" />
              </div>

              <div className="space-y-6 text-body-lg text-jds-on-surface-variant leading-relaxed font-inter">
                <p>
                  JD Force Solar Products Trading was born in the midst of the global pandemic. 
                  While the world faced unprecedented lockdowns and widespread unemployment, 
                  our founder refused to stay idle. Seeing our community struggle not just with 
                  job losses, but with the relentless burden of monthly utility bills like Meralco, 
                  we turned to solar energy as a practical, essential solution.
                </p>
                <p>
                  We started with a humble leap of faith, looking for ways to partner with Local Government 
                  Units (LGUs) to secure community distribution projects. Operating entirely online from the 
                  safety of our homes, we began by moving 100 units a day. 
                </p>
                <p>
                  Through sheer grit and consistency, that number quickly scaled to 500, and eventually to 
                  over 1,000 pieces daily. This hard-earned momentum allowed us to reinvest our capital 
                  and scale the business significantly, establishing physical branches in both Cavite and Quiapo, Manila.
                </p>
              </div>

              <div className="p-6 bg-jds-surface-container rounded-xl border border-jds-outline-variant/30 flex items-start gap-4">
                <HiOutlineLightBulb className="text-jds-primary text-3xl shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-jds-on-surface mb-1 text-headline-sm">Our Core Realization</h4>
                  <p className="text-body-md text-jds-on-surface-variant">
                    Energy independence shouldn't be a privilege. By delivering affordable, essential solar energy products, we help ease daily utility burdens and empower communities.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Timeline Graphic */}
            <motion.div 
              className="lg:col-span-6 space-y-8"
              variants={sectionVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
            >
              <div className="bg-jds-surface p-8 rounded-2xl border border-jds-outline-variant/50 shadow-md relative">
                <h3 className="text-headline-md text-jds-on-surface font-bold mb-6">Our Milestones</h3>
                
                <div className="relative border-l-2 border-jds-outline-variant/60 ml-4 space-y-10 py-2">
                  {/* Event 1 */}
                  <div className="relative pl-8">
                    <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-jds-secondary ring-4 ring-jds-surface-container-lowest" />
                    <span className="text-label-sm bg-jds-secondary-container text-jds-on-secondary-container px-2.5 py-1 rounded-md font-semibold">Expansion</span>
                    <h4 className="text-body-lg font-bold text-jds-on-surface mt-2">Opening the Cavite Branch</h4>
                    <p className="text-body-md text-jds-on-surface-variant mt-1">
                      Opened our physical showroom in Cavite to showcase products, manage regional distribution, and support the community.
                    </p>
                  </div>

                  {/* Event 2 */}
                  <div className="relative pl-8">
                    <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-jds-primary ring-4 ring-jds-surface-container-lowest" />
                    <span className="text-label-sm bg-jds-primary-fixed text-jds-on-primary-fixed px-2.5 py-1 rounded-md font-semibold">First Branch</span>
                    <h4 className="text-body-lg font-bold text-jds-on-surface mt-2">Opening the Quiapo, Manila Branch</h4>
                    <p className="text-body-md text-jds-on-surface-variant mt-1">
                      Established our first physical branch in Quiapo, Manila, placing us right in the city's commercial and technological hub.
                    </p>
                  </div>

                  {/* Event 3 */}
                  <div className="relative pl-8">
                    <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-jds-primary ring-4 ring-jds-surface-container-lowest" />
                    <span className="text-label-sm bg-jds-primary-container text-jds-on-primary-container px-2.5 py-1 rounded-md font-semibold">2020</span>
                    <h4 className="text-body-lg font-bold text-jds-on-surface mt-2">The Pandemic Foundation</h4>
                    <p className="text-body-md text-jds-on-surface-variant mt-1">
                      Founded during the lockdown. Started online, scaling operations from moving 100 units daily to over 1,000 units sold daily.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── Impact Metrics Section ── */}
      <section className="py-16 px-4 md:px-8 bg-jds-surface-container-low border-y border-jds-outline-variant/30">
        <div className="max-w-screen-2xl mx-auto">
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 text-center"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {/* Metric 1 */}
            <motion.div variants={cardVariants} className="p-6 bg-white rounded-xl border border-jds-outline-variant/30 shadow-sm hover:shadow-md transition-shadow">
              <span className="text-headline-lg-mobile md:text-headline-xl font-extrabold text-jds-primary block mb-1">3+</span>
              <span className="text-label-md text-jds-on-surface-variant uppercase tracking-wider font-semibold">Years in Business</span>
            </motion.div>

            {/* Metric 2 */}
            <motion.div variants={cardVariants} className="p-6 bg-white rounded-xl border border-jds-outline-variant/30 shadow-sm hover:shadow-md transition-shadow">
              <span className="text-headline-lg-mobile md:text-headline-xl font-extrabold text-jds-secondary block mb-1">+1,000</span>
              <span className="text-label-md text-jds-on-surface-variant uppercase tracking-wider font-semibold">Families Assisted</span>
            </motion.div>

            {/* Metric 3 */}
            <motion.div variants={cardVariants} className="p-6 bg-white rounded-xl border border-jds-outline-variant/30 shadow-sm hover:shadow-md transition-shadow">
              <span className="text-headline-lg-mobile md:text-headline-xl font-extrabold text-jds-primary block mb-1">2</span>
              <span className="text-label-md text-jds-on-surface-variant uppercase tracking-wider font-semibold">Active Branches</span>
            </motion.div>

            {/* Metric 4 */}
            <motion.div variants={cardVariants} className="p-6 bg-white rounded-xl border border-jds-outline-variant/30 shadow-sm hover:shadow-md transition-shadow">
              <span className="text-headline-lg-mobile md:text-headline-xl font-extrabold text-jds-secondary block mb-1">Tons</span>
              <span className="text-label-md text-jds-on-surface-variant uppercase tracking-wider font-semibold">Carbon Footprint Saved</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Chapter 2: Purpose & Philosophy (Social Impact & Competition) ── */}
      <section className="relative py-24 px-4 md:px-8 bg-jds-surface overflow-hidden">
        {/* Background Image Layer */}
        <div
          className="absolute inset-0 z-0 opacity-5 grayscale contrast-125 pointer-events-none"
          style={{
            backgroundImage: `url(${quiapoChurch})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        
        <div className="max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          
          {/* Image Grid Side */}
          <motion.div
            className="relative group order-2 lg:order-1"
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <div className="absolute -inset-4 bg-jds-primary/5 rounded-[2rem] transform rotate-2 transition-transform group-hover:rotate-0 duration-700" />
            <div className="relative h-[450px] lg:h-[500px] overflow-hidden rounded-2xl shadow-2xl border border-jds-outline-variant/30">
              <img
                className="w-full h-full object-cover"
                src={pic2}
                alt="Vibrant street scene in Quiapo, Manila"
              />
            </div>
          </motion.div>

          {/* Narrative Text Side */}
          <motion.div
            className="order-1 lg:order-2 space-y-8"
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <div>
              <h2 className="text-headline-lg text-jds-on-surface font-bold tracking-tight">
                Our Purpose & Core Philosophy
              </h2>
              <div className="w-12 h-1 bg-jds-primary mt-3 rounded-full" />
            </div>

            <div className="space-y-6 text-body-lg text-jds-on-surface-variant leading-relaxed">
              <p>
                For us, business growth is tied directly to social impact. As our order volumes grew, 
                so did our need for manpower. We took this as an opportunity to build a team, 
                providing meaningful employment to staff so they could support themselves 
                and their families.
              </p>
              <p>
                We view competition not as a threat, but as a powerful source of inspiration. Seeing others 
                succeed drives us to work harder, strengthen our operations, and continuously prove that 
                we can meet—and exceed—the standards of the industry.
              </p>
              <p>
                We understand that every great venture begins at step one. We do not look for overnight jackpots; 
                we embrace the trial, error, and hard lessons that come with building a resilient foundation, 
                believing that honest growth yields the most durable results.
              </p>
            </div>

            <div className="p-8 bg-jds-surface-container-low rounded-2xl border-l-8 border-jds-primary/20 relative">
              <span className="absolute top-4 left-4 text-jds-primary/10 font-serif text-6xl select-none">
                "
              </span>
              <p className="text-headline-md italic text-jds-primary leading-snug relative z-10 pl-4">
                Quiapo's spirit of innovation is what drives us to push the
                boundaries of what solar energy can achieve in our local communities.
              </p>
            </div>
          </motion.div>

        </div>
      </section>

      {/* ── Mission, Vision, and Values ── */}
      <section className="py-24 px-4 md:px-8 bg-jds-surface-container-lowest border-t border-jds-outline-variant/30">
        <div className="max-w-screen-2xl mx-auto">
          <motion.div
            className="text-center mb-16"
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <h2 className="text-headline-lg text-jds-on-surface font-bold">
              Vision, Mission, and Values
            </h2>
            <p className="text-body-lg text-jds-on-surface-variant max-w-2xl mx-auto mt-2">
              Our core blueprints outline how we pave the road toward clean energy independence in the Philippines.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Vision and Mission */}
            <motion.div
              className="space-y-8"
              variants={sectionVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {/* Vision Card */}
              <div className="bg-jds-surface p-8 rounded-2xl border border-jds-outline-variant/40 shadow-sm relative group hover:border-jds-secondary/40 transition-all duration-300">
                <h3 className="text-headline-md text-jds-on-surface font-bold mb-4">Vision</h3>
                <p className="text-body-lg text-jds-on-surface-variant leading-relaxed">
                  To be a leading provider of accessible, sustainable solar energy solutions across the Philippines, 
                  empowering every household and local community to achieve energy independence while building a 
                  brighter, self-sufficient future.
                </p>
              </div>

              {/* Mission Card */}
              <div className="bg-jds-surface p-8 rounded-2xl border border-jds-outline-variant/40 shadow-sm relative group hover:border-jds-primary/40 transition-all duration-300">
                <h3 className="text-headline-md text-jds-on-surface font-bold mb-4">Mission</h3>
                <p className="text-body-lg text-jds-on-surface-variant leading-relaxed">
                  To deliver affordable and essential solar energy products through innovative online operations and 
                  strategic community partnerships. We dedicate ourselves to reducing the burden of utility costs for 
                  everyday Filipinos, fostering economic growth through local job creation, and treating every 
                  operational challenge as a stepping stone toward excellence.
                </p>
              </div>
            </motion.div>

            {/* Core Values Grid */}
            <motion.div
              className="bg-jds-surface-container-low p-8 rounded-2xl border border-jds-outline-variant/40 shadow-sm"
              variants={sectionVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <h3 className="text-headline-md text-jds-on-surface font-bold mb-6">Core Values</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Value 1 */}
                <div className="bg-white p-5 rounded-xl border border-jds-outline-variant/30 flex flex-col gap-3 shadow-sm hover:border-jds-outline transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-jds-primary/10 text-jds-primary flex items-center justify-center shrink-0">
                    <HiOutlineSparkles className="text-xl" />
                  </div>
                  <div>
                    <h4 className="font-bold text-jds-on-surface mb-1">Resilience & Adaptability</h4>
                    <p className="text-body-md text-jds-on-surface-variant">
                      We look at setbacks not as losses, but as valuable lessons and inspirations to improve our operations for the future.
                    </p>
                  </div>
                </div>

                {/* Value 2 */}
                <div className="bg-white p-5 rounded-xl border border-jds-outline-variant/30 flex flex-col gap-3 shadow-sm hover:border-jds-outline transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-jds-secondary/10 text-jds-secondary flex items-center justify-center shrink-0">
                    <HiOutlineUserGroup className="text-xl" />
                  </div>
                  <div>
                    <h4 className="font-bold text-jds-on-surface mb-1">Community & Empowerment</h4>
                    <p className="text-body-md text-jds-on-surface-variant">
                      Our growth is meaningful only if it uplifts others. We are committed to providing sustainable livelihoods for our team and their families.
                    </p>
                  </div>
                </div>

                {/* Value 3 */}
                <div className="bg-white p-5 rounded-xl border border-jds-outline-variant/30 flex flex-col gap-3 shadow-sm hover:border-jds-outline transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-jds-primary/10 text-jds-primary flex items-center justify-center shrink-0">
                    <HiOutlineScale className="text-xl" />
                  </div>
                  <div>
                    <h4 className="font-bold text-jds-on-surface mb-1">Healthy Competition</h4>
                    <p className="text-body-md text-jds-on-surface-variant">
                      We use market competition as fuel to innovate, strengthen our resolve, and continuously elevate the quality of our service.
                    </p>
                  </div>
                </div>

                {/* Value 4 */}
                <div className="bg-white p-5 rounded-xl border border-jds-outline-variant/30 flex flex-col gap-3 shadow-sm hover:border-jds-outline transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-jds-secondary/10 text-jds-secondary flex items-center justify-center shrink-0">
                    <HiOutlineShieldCheck className="text-xl" />
                  </div>
                  <div>
                    <h4 className="font-bold text-jds-on-surface mb-1">Patience & Integrity</h4>
                    <p className="text-body-md text-jds-on-surface-variant">
                      We honor the process of growth from the ground up, rejecting shortcuts in favor of building a lasting, honest foundation from step one.
                    </p>
                  </div>
                </div>

              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ── Meet the Founder ── */}
      <section className="py-24 px-4 md:px-8 bg-jds-surface">
        <div className="max-w-screen-2xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            
            {/* Image Side */}
            <motion.div 
              className="lg:col-span-5 relative group"
              variants={sectionVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <div className="absolute -inset-4 bg-gradient-to-br from-jds-secondary/5 to-jds-primary/5 rounded-[2rem] transform -rotate-2 group-hover:rotate-0 transition-transform duration-500" />
              <div className="relative aspect-square max-w-md mx-auto overflow-hidden rounded-2xl shadow-xl border border-jds-outline-variant/40">
                <img
                  className="w-full h-full object-cover grayscale contrast-[1.05] hover:grayscale-0 transition-all duration-700"
                  src={pic10}
                  alt="Founder Jeremy"
                />
              </div>
            </motion.div>

            {/* Biography Side */}
            <motion.div 
              className="lg:col-span-7 space-y-6"
              variants={sectionVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <div>
                <span className="text-label-md text-jds-primary uppercase tracking-[0.2em] font-semibold mb-2 block">
                  Meet the Founder
                </span>
                <h2 className="text-headline-lg text-jds-on-surface font-bold">
                  Jeremy's Journey & Commitment
                </h2>
                <div className="w-12 h-1 bg-jds-secondary mt-3 rounded-full" />
              </div>

              <div className="space-y-4 text-body-lg text-jds-on-surface-variant leading-relaxed">
                <p>
                  When skyrocketing utility bills began squeezing everyday Filipino households, Jeremy refused 
                  to stand on the sidelines. He recognized that solar energy was the key to easing monthly 
                  electricity burdens, but that it needed to be approachable and affordable.
                </p>
                <p>
                  By focusing on community projects, building strategic online distribution setups, and later 
                  establishing physical showrooms in Cavite and Manila, Jeremy has led JD Force Solar to become 
                  a reliable partner for local governments, businesses, and homeowners alike, making sustainable green 
                  energy an achievable reality.
                </p>
              </div>

              <div className="border-t border-jds-outline-variant/30 pt-6 flex items-center gap-6">
                <div>
                  <h4 className="text-body-lg font-bold text-jds-on-surface">Jeremy</h4>
                  <p className="text-label-md text-jds-on-surface-variant">Founder, JD Force Solar Products Trading</p>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>


      {/* ── Visit Us Section ── */}
      <section className="py-24 px-4 md:px-8 bg-jds-surface">
        <div className="max-w-screen-2xl mx-auto">
          <motion.div
            className="bg-white rounded-[2.5rem] overflow-hidden border border-jds-outline-variant shadow-xl grid grid-cols-1 lg:grid-cols-2"
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {/* Left side: Info */}
            <div className="p-10 md:p-16 flex flex-col justify-center">
              <h2 className="text-headline-lg text-jds-on-surface mb-6 font-bold">Visit Us in Quiapo</h2>
              <p className="text-body-lg text-jds-on-surface-variant mb-10 leading-relaxed font-inter">
                Experience our solar products first-hand at our showroom in the heart of Manila's electronics district.
                Our consultants are ready to help you plan your solar journey.
              </p>

              <div className="space-y-6 mb-12">
                <div className="flex items-start gap-4">
                  <HiOutlineMapPin className="text-jds-primary text-2xl mt-1 shrink-0" />
                  <span className="text-body-md text-jds-on-surface">
                    1645 Soler St. Brgy. 309 Cor Calero, Manila, Philippines, 1001
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <HiOutlineClock className="text-jds-primary text-2xl shrink-0" />
                  <span className="text-body-md text-jds-on-surface">
                    Mon - Sun: 7:00 AM - 5:00 PM
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <HiOutlinePhone className="text-jds-primary text-2xl shrink-0" />
                  <span className="text-body-md text-jds-on-surface">
                    +63 966 843 1913
                  </span>
                </div>
              </div>

              <a
                href="https://maps.app.goo.gl/2Vpcgp9BKsuEowwu7"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-[#1e6091] text-white text-label-md px-8 py-4 rounded-xl hover:bg-[#184e77] transition-all duration-300 w-fit font-bold shadow-lg shadow-blue-900/10"
              >
                Get Directions
                <HiOutlineArrowTopRightOnSquare className="text-xl" />
              </a>
            </div>

            {/* Right side: Map */}
            <div className="h-[400px] lg:h-auto min-h-[400px] relative group">
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
          </motion.div>
        </div>
      </section>

      {/* ── Call to Action ── */}
      <section className="py-24 px-4 md:px-8 bg-jds-primary text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-jds-secondary/15 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2 pointer-events-none" />

        <motion.div
          className="max-w-screen-2xl mx-auto text-center relative z-10"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <h2 className="text-label-md uppercase tracking-[0.2em] mb-6 opacity-80 font-bold">
            Join the Movement
          </h2>
          <p className="text-headline-lg-mobile md:text-headline-xl mb-10 max-w-4xl mx-auto leading-tight font-bold tracking-tight">
            Uplift your community and cut down your utility costs with our top-tier solar solutions.
          </p>
          <div className="w-24 h-1 bg-white mx-auto mb-10 opacity-30 rounded-full" />
          <Link
            to="/browse"
            className="inline-block bg-white text-jds-primary hover:text-jds-on-primary-container text-label-md px-10 py-4 rounded-xl hover:bg-jds-primary-fixed transition-all duration-300 font-bold shadow-lg shadow-black/10"
          >
            Browse Products
          </Link>
        </motion.div>
      </section>
    </div>
  )
}
