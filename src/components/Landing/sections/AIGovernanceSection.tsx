import { motion } from 'framer-motion';
import { Shield, Lock, Eye, FileCheck, CheckCircle } from 'lucide-react';

export function AIGovernanceSection() {
  const governance = [
    { icon: Shield, label: 'NIST AI RMF Aligned' },
    { icon: CheckCircle, label: 'RBI FREE-AI Compliant' },
    { icon: Eye, label: 'AI Ethics Committee' },
    { icon: Lock, label: 'Continuous Bias Monitoring' },
  ];

  const compliance = [
    { icon: FileCheck, label: 'DPDP Act 2023 Compliant' },
    { icon: Shield, label: 'Data Localization (India)' },
    { icon: CheckCircle, label: 'Granular Consent Management' },
    { icon: Lock, label: 'Immutable Audit Trails' },
  ];

  return (
    <section id="governance" className="py-24 px-6 bg-[#e9eef1]">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl font-bold text-slate-900 mb-6" style={{ fontFamily: "'Funnel Display', sans-serif" }}>
            Ethical AI at the Core
          </h2>
          <p className="text-xl text-slate-600">
            Built on principles of transparency, fairness, and accountability
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-white to-slate-50 rounded-3xl p-8 border border-slate-200 shadow-xl"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-[#0A4A55] to-[#106b7d] rounded-2xl flex items-center justify-center shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Governance Framework</h3>
            </div>
            <div className="space-y-4">
              {governance.map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100 hover:border-[#0A4A55]/30 hover:shadow-md transition-all"
                >
                  <div className="w-10 h-10 bg-[#0A4A55]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-[#0A4A55]" />
                  </div>
                  <span className="text-slate-900 font-medium">{item.label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-slate-900 to-[#0A4A55] rounded-3xl p-8 shadow-xl text-white"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                <FileCheck className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold">Compliance Certifications</h3>
            </div>
            <div className="space-y-4">
              {compliance.map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white/20 transition-all"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-medium">{item.label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
