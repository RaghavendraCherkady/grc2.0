import { motion } from 'framer-motion';
import { Database, Cpu, Cloud, Lock, Zap, Globe, Shield } from 'lucide-react';

export function TechnologySection() {
  const technologies = [
    { icon: Cpu, name: 'GPT-4', description: 'AI Intelligence', color: 'from-green-500 to-emerald-500' },
    { icon: Database, name: 'PostgreSQL', description: 'Database', color: 'from-blue-500 to-cyan-500' },
    { icon: Zap, name: 'Supabase', description: 'Backend Platform', color: 'from-emerald-500 to-teal-500' },
    { icon: Cloud, name: 'Vercel', description: 'Infrastructure', color: 'from-orange-500 to-red-500' },
    { icon: Lock, name: 'Zero-Trust', description: 'Security', color: 'from-violet-500 to-purple-500' },
    { icon: Globe, name: 'React 18', description: 'Frontend', color: 'from-cyan-500 to-blue-500' },
  ];

  return (
    <section id="technology" className="py-24 px-6 bg-gradient-to-br from-slate-50 to-slate-100 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#0A4A55]/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#106b7d]/5 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl font-bold text-slate-900 mb-6" style={{ fontFamily: "'Funnel Display', sans-serif" }}>
            Enterprise-Grade Foundation
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Built with cutting-edge technologies for reliability and performance
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6">
          {technologies.map((tech, index) => (
            <motion.div
              key={tech.name}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -10, scale: 1.1 }}
              className="relative group cursor-pointer"
            >
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 shadow-lg group-hover:shadow-2xl transition-all duration-300">
                <motion.div
                  animate={{
                    rotate: [0, 10, -10, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className={`w-12 h-12 bg-gradient-to-br ${tech.color} rounded-xl flex items-center justify-center mb-4 mx-auto shadow-lg`}
                >
                  <tech.icon className="w-6 h-6 text-white" />
                </motion.div>
                <h3 className="text-sm font-bold text-slate-900 text-center mb-1">{tech.name}</h3>
                <p className="text-xs text-slate-600 text-center">{tech.description}</p>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                className="absolute inset-0 bg-gradient-to-br from-[#0A4A55]/10 to-[#106b7d]/10 rounded-2xl blur-xl -z-10 transition-opacity"
              ></motion.div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-4 px-8 py-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-lg">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-slate-900">99.9% Uptime</span>
            </div>
            <div className="w-px h-6 bg-slate-300"></div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#0A4A55]" />
              <span className="text-sm font-semibold text-slate-900">SOC 2 Compliant</span>
            </div>
            <div className="w-px h-6 bg-slate-300"></div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#0A4A55]" />
              <span className="text-sm font-semibold text-slate-900">India Region</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
