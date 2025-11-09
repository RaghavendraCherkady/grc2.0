import { motion } from 'framer-motion';
import { HeroSection } from './sections/HeroSection';
import { ProblemSection } from './sections/ProblemSection';
import { CoreModulesSection } from './sections/CoreModulesSection';
import { AIGovernanceSection } from './sections/AIGovernanceSection';
import { ValuePropsSection } from './sections/ValuePropsSection';
import { CTASection } from './sections/CTASection';
import { Footer } from './sections/Footer';
import { Navigation } from './Navigation';

export function LandingPage() {
  return (
    <div className="bg-[#e9eef1] overflow-x-hidden">
      <Navigation />
      <HeroSection />
      <ProblemSection />
      <CoreModulesSection />
      <AIGovernanceSection />
      <ValuePropsSection />
      <CTASection />
      <Footer />
    </div>
  );
}
