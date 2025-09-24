import Hero from "@/components/Hero";
import FlowDiagram from "@/components/FlowDiagram";
import Portfolio from "@/components/Portfolio";  
import SwapInterface from "@/components/SwapInterface";
import TransparencyLedger from "@/components/TransparencyLedger";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <FlowDiagram />
      <Portfolio />
      <SwapInterface />
      <TransparencyLedger />
    </div>
  );
};

export default Index;
