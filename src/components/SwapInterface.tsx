import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, Info, TrendingUp, Coins } from "lucide-react";

const SwapInterface = () => {
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [fromToken, setFromToken] = useState("PLAT");
  const [toToken, setToToken] = useState("XLM");

  const exchangeRate = 1.24; // PLAT/XLM rate
  const reserveRatio = 99.2;

  const handleSwapTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const calculateExchange = (amount: string) => {
    const numAmount = parseFloat(amount) || 0;
    if (fromToken === "PLAT") {
      setToAmount((numAmount * exchangeRate).toFixed(4));
    } else {
      setToAmount((numAmount / exchangeRate).toFixed(4));
    }
  };

  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Swap & <span className="text-stellar-cyan">Trade</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Exchange PLAT tokens for XLM instantly with competitive rates and low fees
          </p>
        </div>

        {/* Swap Interface */}
        <Card className="p-8 bg-card/50 backdrop-blur-sm border-asset-gold/20 mb-8">
          <div className="space-y-6">
            {/* From Token */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-muted-foreground">From</label>
                <div className="text-sm text-muted-foreground">
                  Balance: {fromToken === "PLAT" ? "127,500" : "8,432.5"} {fromToken}
                </div>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={fromAmount}
                  onChange={(e) => {
                    setFromAmount(e.target.value);
                    calculateExchange(e.target.value);
                  }}
                  className="text-2xl font-bold h-16 pr-24 bg-background/50 border-asset-gold/30"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <Badge 
                    variant="secondary" 
                    className={`px-3 py-1 ${fromToken === "PLAT" ? "bg-asset-gold/20 text-asset-gold" : "bg-stellar-cyan/20 text-stellar-cyan"}`}
                  >
                    {fromToken}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSwapTokens}
                className="rounded-full w-12 h-12 p-0 border-asset-gold/30 hover:bg-asset-gold/10"
              >
                <ArrowUpDown className="w-4 h-4" />
              </Button>
            </div>

            {/* To Token */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-muted-foreground">To</label>
                <div className="text-sm text-muted-foreground">
                  Balance: {toToken === "PLAT" ? "127,500" : "8,432.5"} {toToken}
                </div>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={toAmount}
                  readOnly
                  className="text-2xl font-bold h-16 pr-24 bg-background/50 border-stellar-cyan/30"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <Badge 
                    variant="secondary" 
                    className={`px-3 py-1 ${toToken === "PLAT" ? "bg-asset-gold/20 text-asset-gold" : "bg-stellar-cyan/20 text-stellar-cyan"}`}
                  >
                    {toToken}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Exchange Info */}
            <div className="bg-muted/20 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Exchange Rate</span>
                <span className="font-medium">1 PLAT = {exchangeRate} XLM</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Network Fee</span>
                <span className="font-medium">0.00001 XLM</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Platform Fee</span>
                <span className="font-medium">0.3%</span>
              </div>
              <div className="border-t border-border pt-2 flex items-center justify-between font-semibold">
                <span>You'll receive</span>
                <span className="text-stellar-cyan">≈ {toAmount} {toToken}</span>
              </div>
            </div>

            {/* Swap Button */}
            <Button 
              size="lg" 
              className="w-full text-lg font-semibold gradient-primary hover:shadow-glow transition-smooth"
              disabled={!fromAmount || parseFloat(fromAmount) <= 0}
            >
              {fromAmount && parseFloat(fromAmount) > 0 ? `Swap ${fromToken} for ${toToken}` : "Enter an amount"}
            </Button>
          </div>
        </Card>

        {/* Market Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-gradient-to-br from-asset-gold/10 to-warning-amber/10 border-asset-gold/20">
            <div className="flex items-center space-x-3 mb-3">
              <TrendingUp className="w-6 h-6 text-asset-gold" />
              <h4 className="font-semibold text-asset-gold">24h Volume</h4>
            </div>
            <div className="text-2xl font-bold mb-1">$47,823</div>
            <div className="text-sm text-trading-green">+12.4% from yesterday</div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-stellar-cyan/10 to-accent/10 border-stellar-cyan/20">
            <div className="flex items-center space-x-3 mb-3">
              <Coins className="w-6 h-6 text-stellar-cyan" />
              <h4 className="font-semibold text-stellar-cyan">Total Liquidity</h4>
            </div>
            <div className="text-2xl font-bold mb-1">$1.2M</div>
            <div className="text-sm text-muted-foreground">Across all pools</div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-trading-green/10 to-success/10 border-trading-green/20">
            <div className="flex items-center space-x-3 mb-3">
              <Info className="w-6 h-6 text-trading-green" />
              <h4 className="font-semibold text-trading-green">Reserve Health</h4>
            </div>
            <div className="text-2xl font-bold mb-1">{reserveRatio}%</div>
            <div className="text-sm text-muted-foreground">Fully backed & secure</div>
          </Card>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 p-4 bg-warning-amber/10 border border-warning-amber/20 rounded-lg">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-warning-amber mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-warning-amber mb-1">Important Notice</p>
              <p>
                Swaps are subject to slippage and market conditions. PLAT tokens are backed by real assets 
                but their value may fluctuate. Please review all transaction details before confirming.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SwapInterface;