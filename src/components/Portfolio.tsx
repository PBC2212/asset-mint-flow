import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building, TrendingUp, Coins, Eye } from "lucide-react";

const Portfolio = () => {
  const assets = [
    {
      id: "PROP-001",
      type: "Real Estate",
      name: "Downtown Commercial Property",
      value: 85000,
      platMinted: 85000,
      status: "Active",
      backing: 98.5,
      icon: Building
    },
    {
      id: "PROP-002", 
      type: "Real Estate",
      name: "Residential Duplex",
      value: 42500,
      platMinted: 42500,
      status: "Active", 
      backing: 100,
      icon: Building
    }
  ];

  const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
  const totalPlat = assets.reduce((sum, asset) => sum + asset.platMinted, 0);

  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Portfolio <span className="text-stellar-cyan">Dashboard</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Track your pledged assets, PLAT holdings, and reserve backing in real-time
          </p>
        </div>

        {/* Portfolio Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card className="p-6 bg-gradient-to-br from-asset-gold/20 to-warning-amber/20 border-asset-gold/30">
            <div className="flex items-center justify-between mb-4">
              <Building className="w-8 h-8 text-asset-gold" />
              <Badge variant="secondary" className="bg-asset-gold/20 text-asset-gold">
                Active
              </Badge>
            </div>
            <div className="text-3xl font-bold text-asset-gold mb-1">
              ${totalValue.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Total Asset Value</div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-stellar-cyan/20 to-accent/20 border-stellar-cyan/30">
            <div className="flex items-center justify-between mb-4">
              <Coins className="w-8 h-8 text-stellar-cyan" />
              <Badge variant="secondary" className="bg-stellar-cyan/20 text-stellar-cyan">
                Minted
              </Badge>
            </div>
            <div className="text-3xl font-bold text-stellar-cyan mb-1">
              {totalPlat.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">PLAT Tokens</div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-trading-green/20 to-success/20 border-trading-green/30">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-trading-green" />
              <Badge variant="secondary" className="bg-trading-green/20 text-trading-green">
                Healthy
              </Badge>
            </div>
            <div className="text-3xl font-bold text-trading-green mb-1">99.2%</div>
            <div className="text-sm text-muted-foreground">Reserve Backing</div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-card to-muted/10 border-border">
            <div className="flex items-center justify-between mb-4">
              <Eye className="w-8 h-8 text-foreground" />
              <Badge variant="outline">Live</Badge>
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">$1.24</div>
            <div className="text-sm text-muted-foreground">PLAT/XLM Rate</div>
          </Card>
        </div>

        {/* Asset List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-semibold">Pledged Assets</h3>
            <Button className="gradient-primary">
              Pledge New Asset
            </Button>
          </div>

          {assets.map((asset) => {
            const Icon = asset.icon;
            return (
              <Card key={asset.id} className="p-6 bg-card/50 border-asset-gold/20 hover:border-asset-gold/40 transition-smooth">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-lg bg-asset-gold/20 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-asset-gold" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold mb-1">{asset.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {asset.type} • ID: {asset.id}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={asset.status === 'Active' ? 'secondary' : 'outline'}
                    className={asset.status === 'Active' ? 'bg-trading-green/20 text-trading-green' : ''}
                  >
                    {asset.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Asset Value</div>
                    <div className="text-2xl font-bold text-asset-gold">
                      ${asset.value.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">PLAT Minted</div>
                    <div className="text-2xl font-bold text-stellar-cyan">
                      {asset.platMinted.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Reserve Backing</div>
                    <div className="flex items-center space-x-2">
                      <div className="text-2xl font-bold text-trading-green">
                        {asset.backing}%
                      </div>
                      <Progress value={asset.backing} className="flex-1" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                  <Button variant="outline" size="sm" className="border-stellar-cyan text-stellar-cyan hover:bg-stellar-cyan hover:text-background">
                    Trade PLAT
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Portfolio;