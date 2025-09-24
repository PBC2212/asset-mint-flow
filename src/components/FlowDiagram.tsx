import { Card } from "@/components/ui/card";
import { ArrowRight, Home, Shield, Coins, TrendingUp, ArrowLeftRight } from "lucide-react";

const FlowDiagram = () => {
  const steps = [
    {
      icon: Home,
      title: "Pledge Asset",
      description: "Submit real estate, commodities, or other verified assets for tokenization",
      color: "asset-gold",
      bgGradient: "from-asset-gold/20 to-warning-amber/20"
    },
    {
      icon: Shield,
      title: "KYC & Verification",
      description: "Complete identity verification and asset appraisal process",
      color: "stellar-cyan",
      bgGradient: "from-stellar-cyan/20 to-accent/20"
    },
    {
      icon: Coins,
      title: "Mint PLAT Tokens",
      description: "Receive platform tokens equivalent to your asset's verified value",
      color: "asset-gold",
      bgGradient: "from-asset-gold/20 to-warning-amber/20"
    },
    {
      icon: TrendingUp,
      title: "Trade & Earn",
      description: "Trade PLAT tokens on Stellar DEX or provide liquidity for yields",
      color: "trading-green",
      bgGradient: "from-trading-green/20 to-success/20"
    },
    {
      icon: ArrowLeftRight,
      title: "Swap & Redeem",
      description: "Convert PLAT tokens back to XLM or redeem for underlying assets",
      color: "stellar-cyan",
      bgGradient: "from-stellar-cyan/20 to-accent/20"
    }
  ];

  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            How <span className="text-asset-gold">PLAT</span> Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            A transparent, secure process that transforms real-world assets into tradeable digital tokens
          </p>
        </div>

        {/* Flow Steps */}
        <div className="relative">
          {/* Connecting Lines */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-asset-gold via-stellar-cyan to-trading-green opacity-30" />
          
          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative">
                  <Card className={`p-6 h-full bg-gradient-to-br ${step.bgGradient} border-${step.color}/30 hover:border-${step.color}/50 transition-smooth group`}>
                    {/* Step Number */}
                    <div className={`w-8 h-8 rounded-full bg-${step.color} text-background text-sm font-bold flex items-center justify-center mb-4`}>
                      {index + 1}
                    </div>
                    
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-lg bg-${step.color}/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-bounce`}>
                      <Icon className={`w-6 h-6 text-${step.color}`} />
                    </div>
                    
                    {/* Content */}
                    <h3 className="text-lg font-semibold mb-2 text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </Card>
                  
                  {/* Arrow for desktop */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                      <div className={`w-8 h-8 rounded-full bg-${step.color}/20 flex items-center justify-center`}>
                        <ArrowRight className={`w-4 h-4 text-${step.color}`} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
          <Card className="p-6 bg-gradient-to-br from-asset-gold/10 to-warning-amber/10 border-asset-gold/20">
            <h4 className="text-lg font-semibold mb-3 text-asset-gold">Transparency</h4>
            <p className="text-muted-foreground">Full on-chain visibility of asset backing, reserve ratios, and token supply</p>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-stellar-cyan/10 to-accent/10 border-stellar-cyan/20">
            <h4 className="text-lg font-semibold mb-3 text-stellar-cyan">Liquidity</h4>
            <p className="text-muted-foreground">Trade 24/7 on Stellar DEX with instant settlements and low fees</p>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-trading-green/10 to-success/10 border-trading-green/20">
            <h4 className="text-lg font-semibold mb-3 text-trading-green">Security</h4>
            <p className="text-muted-foreground">Multi-signature custody, insurance backing, and regulatory compliance</p>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default FlowDiagram;