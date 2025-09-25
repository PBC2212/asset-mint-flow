import Hero from "@/components/Hero";
import FlowDiagram from "@/components/FlowDiagram";
import Portfolio from "@/components/Portfolio";  
import SwapInterface from "@/components/SwapInterface";
import TransparencyLedger from "@/components/TransparencyLedger";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <FlowDiagram />
      <Portfolio />
      <SwapInterface />
      <TransparencyLedger />
    </div>
  );
};

export default Index;
