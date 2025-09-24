import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 py-20">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-platform-navy/20" />
      
      <div className="relative max-w-7xl mx-auto text-center">
        {/* Hero Badge */}
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-card border border-asset-gold/20 mb-8">
          <div className="w-2 h-2 bg-asset-gold rounded-full mr-2 animate-pulse" />
          <span className="text-sm font-medium text-asset-gold">Real World Assets • Stellar Network</span>
        </div>

        {/* Main heading */}
        <h1 className="text-6xl md:text-8xl font-bold mb-6">
          <span className="bg-gradient-to-r from-asset-gold via-warning-amber to-asset-gold bg-clip-text text-transparent">
            Tokenize
          </span>
          <br />
          <span className="text-foreground">Real Assets</span>
        </h1>

        {/* Subheading */}
        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12">
          Transform physical assets into tradeable PLAT tokens backed by real estate, 
          commodities, and verified collateral on the Stellar blockchain.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Button 
            size="lg" 
            className="text-lg px-8 py-4 gradient-primary hover:shadow-glow transition-smooth"
          >
            Start Tokenizing
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="text-lg px-8 py-4 border-stellar-cyan text-stellar-cyan hover:bg-stellar-cyan hover:text-background transition-smooth"
          >
            View Portfolio
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card className="p-6 bg-card/50 backdrop-blur-sm border-asset-gold/20">
            <div className="text-3xl font-bold text-asset-gold mb-2">$2.4M+</div>
            <div className="text-muted-foreground">Assets Pledged</div>
          </Card>
          <Card className="p-6 bg-card/50 backdrop-blur-sm border-stellar-cyan/20">
            <div className="text-3xl font-bold text-stellar-cyan mb-2">15,847</div>
            <div className="text-muted-foreground">PLAT Tokens Issued</div>
          </Card>
          <Card className="p-6 bg-card/50 backdrop-blur-sm border-trading-green/20">
            <div className="text-3xl font-bold text-trading-green mb-2">98.7%</div>
            <div className="text-muted-foreground">Reserve Backing</div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Hero;