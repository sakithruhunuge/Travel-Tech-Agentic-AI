import Hero from "@/components/Hero";
import About from "@/components/About";
import Destinations from "@/components/Destinations";
import Packages from "@/components/Packages";
import WhyChooseUs from "@/components/WhyChooseUs";
import Testimonials from "@/components/Testimonials";
import Contact from "@/components/Contact";
import ScrollReveal from "@/components/ui/ScrollReveal";

export default function Home() {
  return (
    <>
      <Hero />
      <ScrollReveal animation="fade-in-up" delay={100}>
        <About />
      </ScrollReveal>
      <ScrollReveal animation="fade-in-up" delay={100}>
        <Destinations />
      </ScrollReveal>
      <ScrollReveal animation="fade-in-up" delay={100}>
        <Packages />
      </ScrollReveal>
      <ScrollReveal animation="fade-in-up" delay={100}>
        <WhyChooseUs />
      </ScrollReveal>
      <ScrollReveal animation="fade-in-up" delay={100}>
        <Testimonials />
      </ScrollReveal>
      <ScrollReveal animation="fade-in-up" delay={100}>
        <Contact />
      </ScrollReveal>
    </>
  );
}
