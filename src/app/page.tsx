import { FacilitySection } from "@/components/home/facility-section";
import { FinalCta } from "@/components/home/final-cta";
import { HeroSection } from "@/components/home/hero-section";
import { Ma5Difference } from "@/components/home/ma5-difference";
import { ResultsSection } from "@/components/home/results-section";
import { ServicesOverview } from "@/components/home/services-overview";
import { TeamSection } from "@/components/home/team-section";
import { ValueProposition } from "@/components/home/value-proposition";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ValueProposition />
      <ServicesOverview />
      <Ma5Difference />
      <ResultsSection />
      <FacilitySection />
      <TeamSection />
      <FinalCta />
    </>
  );
}
