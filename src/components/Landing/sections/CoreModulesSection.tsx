import { motion } from 'framer-motion';
import { FileText, TrendingUp, Shield, CheckCircle } from 'lucide-react';

export function CoreModulesSection() {
  const modules = [
    {
      icon: FileText,
      title: 'Intelligent KYC Verification',
      description: 'AI-powered document processing with 99.5% accuracy. Automated OCR, entity extraction, and classification.',
      features: ['Aadhaar Verification', 'PAN Integration', 'Address Proof Validation', 'Maker-Checker Workflow'],
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: TrendingUp,
      title: 'AI-Powered Risk Intelligence',
      description: 'Automated credit evaluation with CIBIL integration and explainable risk matrices.',
      features: ['Real-time CIBIL Scores', 'DTI Ratio Analysis', 'Bank Statement AI', 'Explainable Decisions'],
      gradient: 'from-emerald-500 to-teal-500',
    },
    {
      icon: Shield,
      title: 'Proactive Compliance Control',
      description: 'Executive dashboard with real-time alerts and automated intervention before violations occur.',
      features: ['Live Metrics', 'Alert Engine', 'Bias Monitoring', 'Audit Trails'],
      gradient: 'from-violet-500 to-purple-500',
    },
  ];

  return (
    <section id="modules" className="py-24 px-6 bg-[#e9eef1] relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl font-bold text-slate-900 mb-6" style={{ fontFamily: "'Funnel Display', sans-serif" }}>
            Comprehensive GRC Solutions
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            End-to-end compliance automation powered by AI
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {modules.map((module, index) => (
            <motion.div
              key={module.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-slate-200 hover:border-[#0A4A55]/30 shadow-lg hover:shadow-2xl transition-all duration-300 group cursor-pointer"
            >
              <div className={`w-16 h-16 bg-gradient-to-br ${module.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                <module.icon className="w-8 h-8 text-white" />
              </div>

              <h3 className="text-2xl font-bold text-slate-900 mb-4">{module.title}</h3>
              <p className="text-slate-600 mb-6 leading-relaxed">{module.description}</p>

              <div className="space-y-3">
                {module.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3 text-sm">
                    <div className="w-6 h-6 bg-[#0A4A55]/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-[#0A4A55]" />
                    </div>
                    <span className="text-slate-700">{feature}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
