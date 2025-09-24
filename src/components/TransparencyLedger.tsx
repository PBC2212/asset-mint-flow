import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, Building, TrendingUp, Users, ExternalLink } from "lucide-react";

const TransparencyLedger = () => {
  const reserveData = {
    totalAssets: 2457800,
    totalPlat: 2475000,
    reserveRatio: 99.3,
    lastAudit: "2024-01-15"
  };

  const recentTransactions = [
    {
      id: "TX-001",
      type: "Asset Pledge",
      asset: "Commercial Property #147",
      value: 125000,
      platMinted: 125000,
      timestamp: "2024-01-20 14:32:15",
      status: "Confirmed"
    },
    {
      id: "TX-002", 
      type: "PLAT Swap",
      asset: "PLAT → XLM",
      value: 15000,
      platMinted: -15000,
      timestamp: "2024-01-20 13:45:22",
      status: "Confirmed"
    },
    {
      id: "TX-003",
      type: "Asset Pledge", 
      asset: "Residential Duplex #89",
      value: 67500,
      platMinted: 67500,
      timestamp: "2024-01-20 11:18:07",
      status: "Confirmed"
    }
  ];

  const assetBreakdown = [
    { category: "Real Estate", value: 1850000, percentage: 75.3, color: "asset-gold" },
    { category: "Commodities", value: 350000, percentage: 14.2, color: "stellar-cyan" },
    { category: "Cash Reserves", value: 257800, percentage: 10.5, color: "trading-green" }
  ];

  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="text-trading-green">Transparency</span> Ledger
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Real-time visibility into asset backing, reserve ratios, and all platform transactions
          </p>
        </div>

        {/* Reserve Overview */}
        <Card className="p-8 mb-12 bg-gradient-to-br from-trading-green/10 to-success/10 border-trading-green/30">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-trading-green" />
              <h3 className="text-2xl font-bold">Reserve Status</h3>
            </div>
            <Badge className="bg-trading-green/20 text-trading-green px-4 py-2">
              Fully Backed
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-asset-gold mb-2">
                ${reserveData.totalAssets.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Total Asset Value</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-stellar-cyan mb-2">
                {reserveData.totalPlat.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">PLAT Issued</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-trading-green mb-2">
                {reserveData.reserveRatio}%
              </div>
              <div className="text-sm text-muted-foreground">Reserve Ratio</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground mb-2">
                {reserveData.lastAudit}
              </div>
              <div className="text-sm text-muted-foreground">Last Audit</div>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Reserve Health</span>
              <span className="text-sm text-trading-green font-medium">{reserveData.reserveRatio}%</span>
            </div>
            <Progress value={reserveData.reserveRatio} className="h-3" />
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            Platform maintains {reserveData.reserveRatio}% backing ratio with regular third-party audits
          </div>
        </Card>

        {/* Asset Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <Card className="p-6 bg-card/50 border-asset-gold/20">
            <h3 className="text-xl font-semibold mb-6 flex items-center">
              <Building className="w-6 h-6 mr-3 text-asset-gold" />
              Asset Composition
            </h3>
            <div className="space-y-4">
              {assetBreakdown.map((asset, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{asset.category}</span>
                    <span className={`text-${asset.color} font-semibold`}>
                      ${asset.value.toLocaleString()} ({asset.percentage}%)
                    </span>
                  </div>
                  <Progress value={asset.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 bg-card/50 border-stellar-cyan/20">
            <h3 className="text-xl font-semibold mb-6 flex items-center">
              <TrendingUp className="w-6 h-6 mr-3 text-stellar-cyan" />
              Platform Metrics
            </h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active Users</span>
                <span className="text-2xl font-bold text-stellar-cyan">2,847</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Assets Pledged</span>
                <span className="text-2xl font-bold text-asset-gold">163</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">24h Volume</span>
                <span className="text-2xl font-bold text-trading-green">$47.8K</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Swaps</span>
                <span className="text-2xl font-bold text-foreground">15,924</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="p-6 bg-card/50 border-border">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold flex items-center">
              <Users className="w-6 h-6 mr-3 text-foreground" />
              Recent Transactions
            </h3>
            <Badge variant="outline" className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-trading-green rounded-full animate-pulse" />
              <span>Live</span>
            </Badge>
          </div>

          <div className="space-y-4">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-smooth">
                <div className="flex items-center space-x-4">
                  <Badge 
                    variant="outline" 
                    className={`${
                      tx.type === 'Asset Pledge' ? 'border-asset-gold text-asset-gold' :
                      'border-stellar-cyan text-stellar-cyan'
                    }`}
                  >
                    {tx.type}
                  </Badge>
                  <div>
                    <div className="font-medium">{tx.asset}</div>
                    <div className="text-sm text-muted-foreground">{tx.timestamp}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    ${tx.value.toLocaleString()}
                  </div>
                  <div className={`text-sm ${tx.platMinted > 0 ? 'text-trading-green' : 'text-stellar-cyan'}`}>
                    {tx.platMinted > 0 ? '+' : ''}{tx.platMinted.toLocaleString()} PLAT
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-pointer" />
              </div>
            ))}
          </div>

          <div className="text-center mt-6">
            <Badge variant="outline" className="cursor-pointer hover:bg-muted/20">
              View All Transactions on Stellar Explorer
            </Badge>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default TransparencyLedger;