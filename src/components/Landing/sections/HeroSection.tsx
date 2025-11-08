import { motion } from 'framer-motion';
import { TrendingDown, Target, Shield, ArrowRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

export function HeroSection() {
  const stats = [
    { icon: TrendingDown, label: '50-70%', sublabel: 'Cost Reduction' },
    { icon: Target, label: '99.5%', sublabel: 'Accuracy' },
    { icon: Shield, label: '<10%', sublabel: 'False Positives' },
  ];

  return (
    <section className="min-h-screen pt-24 pb-20 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A4A55]/5 via-transparent to-[#106b7d]/5"></div>

      <div className="absolute top-20 right-10 w-96 h-96 bg-[#0A4A55]/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-[#106b7d]/10 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-[#0A4A55]/20"
          >
            <span className="text-xs font-semibold text-[#0A4A55] uppercase tracking-wider">
              AI-First Compliance • RBI Certified • DPDP Act 2023 Compliant
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-6xl lg:text-7xl font-bold leading-tight"
            style={{ fontFamily: "'Funnel Display', sans-serif", letterSpacing: '-2px' }}
          >
            <span className="bg-gradient-to-r from-[#0A4A55] to-[#106b7d] bg-clip-text text-transparent">
              Transform Banking Compliance
            </span>
            <br />
            <span className="text-slate-900">with AI Intelligence</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-slate-600 leading-relaxed max-w-2xl"
          >
            Reduce costs by 70%. Achieve 99.5% accuracy. Real-time compliance monitoring
            powered by advanced RAG technology and GPT-4.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-3 gap-4"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                whileHover={{ y: -5, scale: 1.05 }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-[#0A4A55]/10 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
              >
                <stat.icon className="w-8 h-8 text-[#0A4A55] mb-3 group-hover:scale-110 transition-transform" />
                <div className="text-3xl font-bold text-slate-900 mb-1">{stat.label}</div>
                <div className="text-sm text-slate-600">{stat.sublabel}</div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-wrap gap-4"
          >
            <Link
              to="/app"
              className="group px-8 py-4 bg-gradient-to-r from-[#0A4A55] to-[#106b7d] text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-2xl transition-all duration-300 flex items-center gap-2 hover:scale-105"
            >
              Request Demo
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="px-8 py-4 bg-white/80 backdrop-blur-sm text-[#0A4A55] rounded-xl font-semibold text-lg border-2 border-[#0A4A55]/20 hover:border-[#0A4A55] transition-all duration-300 flex items-center gap-2 hover:scale-105">
              <Play className="w-5 h-5" />
              Watch Product Tour
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="pt-8"
          >
            <p className="text-sm text-slate-500 mb-4">Trusted by leading Indian financial institutions</p>
            <div className="flex flex-wrap gap-6 items-center opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-24 h-12 bg-slate-300 rounded flex items-center justify-center text-xs text-slate-600"
                >
                  Bank {i}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative hidden lg:block"
        >
          <div className="relative w-full h-[600px]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0A4A55]/20 to-[#106b7d]/20 rounded-3xl backdrop-blur-sm"></div>

            <motion.div
              animate={{
                y: [0, -20, 0],
                rotate: [0, 5, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-[#0A4A55] to-[#106b7d] rounded-2xl shadow-2xl"
            ></motion.div>

            <motion.div
              animate={{
                y: [0, 20, 0],
                rotate: [0, -5, 0],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}
              className="absolute bottom-40 right-20 w-40 h-40 bg-gradient-to-br from-[#106b7d] to-[#0A4A55] rounded-full shadow-2xl"
            ></motion.div>

            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-4 border-[#0A4A55]/30 rounded-full"
            ></motion.div>

            <motion.div
              animate={{
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-br from-[#0A4A55]/40 to-[#106b7d]/40 rounded-2xl backdrop-blur-xl shadow-2xl flex items-center justify-center"
            >
              <Shield className="w-24 h-24 text-white" />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
