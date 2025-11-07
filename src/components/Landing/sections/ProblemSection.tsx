import { motion } from 'framer-motion';
import { DollarSign, AlertTriangle, FileText } from 'lucide-react';

export function ProblemSection() {
  const problems = [
    {
      icon: DollarSign,
      stat: '60-70%',
      title: 'Budget Wasted',
      description: 'Manual processes drain resources',
    },
    {
      icon: AlertTriangle,
      stat: '95%',
      title: 'False Positives',
      description: 'Traditional systems overwhelm teams',
    },
    {
      icon: FileText,
      stat: '5+',
      title: 'Regulatory Bodies',
      description: 'RBI, SEBI, IRDAI, DPDP Act complexity',
    },
  ];

  return (
    <section className="py-24 px-6 bg-gradient-to-br from-[#0A4A55] to-[#073440] relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl font-bold text-white mb-6" style={{ fontFamily: "'Funnel Display', sans-serif" }}>
            The Compliance Crisis
          </h2>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            Traditional compliance systems are failing financial institutions across India
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {problems.map((problem, index) => (
            <motion.div
              key={problem.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:border-white/40 transition-all duration-300 group cursor-pointer"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-white/30 transition-colors"
              >
                <problem.icon className="w-8 h-8 text-white" />
              </motion.div>
              <div className="text-5xl font-bold text-white mb-3">{problem.stat}</div>
              <h3 className="text-2xl font-bold text-white mb-3">{problem.title}</h3>
              <p className="text-white/70 text-lg">{problem.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
