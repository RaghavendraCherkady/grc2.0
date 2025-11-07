import { motion } from 'framer-motion';
import { DollarSign, Target, Shield, Zap, FileCheck, Building } from 'lucide-react';

export function ValuePropsSection() {
  const values = [
    {
      number: '01',
      icon: DollarSign,
      title: 'Cost Efficiency',
      description: 'Reduce compliance costs by 50-70% through intelligent automation',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      number: '02',
      icon: Target,
      title: 'High Accuracy',
      description: '99.5% accuracy in document processing and risk assessment',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      number: '03',
      icon: Shield,
      title: 'Low False Positives',
      description: 'Achieve <10% false positive rates with advanced AI models',
      color: 'from-violet-500 to-purple-500',
    },
    {
      number: '04',
      icon: Zap,
      title: 'Real-time Processing',
      description: 'Instant compliance checks and automated decision-making',
      color: 'from-orange-500 to-red-500',
    },
    {
      number: '05',
      icon: FileCheck,
      title: 'Regulatory Adherence',
      description: 'Stay compliant with RBI, SEBI, IRDAI, and DPDP Act',
      color: 'from-pink-500 to-rose-500',
    },
    {
      number: '06',
      icon: Building,
      title: 'Scalable Architecture',
      description: 'Enterprise-ready infrastructure that grows with your needs',
      color: 'from-cyan-500 to-blue-500',
    },
  ];

  return (
    <section className="py-24 px-6 bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl font-bold text-slate-900 mb-6" style={{ fontFamily: "'Funnel Display', sans-serif" }}>
            Why Choose NOVA-GRC?
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Comprehensive benefits that transform your compliance operations
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {values.map((value, index) => (
            <motion.div
              key={value.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="relative bg-white rounded-2xl p-8 border border-slate-200 shadow-lg hover:shadow-2xl transition-all duration-300 group cursor-pointer overflow-hidden"
            >
              <div className="absolute top-4 right-4 text-6xl font-bold text-slate-100 group-hover:text-slate-200 transition-colors">
                {value.number}
              </div>

              <div className={`w-14 h-14 bg-gradient-to-br ${value.color} rounded-xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform relative z-10`}>
                <value.icon className="w-7 h-7 text-white" />
              </div>

              <h3 className="text-2xl font-bold text-slate-900 mb-3 relative z-10">{value.title}</h3>
              <p className="text-slate-600 leading-relaxed relative z-10">{value.description}</p>

              <motion.div
                initial={{ scale: 0 }}
                whileHover={{ scale: 1 }}
                className={`absolute -bottom-12 -right-12 w-32 h-32 bg-gradient-to-br ${value.color} opacity-10 rounded-full blur-2xl transition-all`}
              ></motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
