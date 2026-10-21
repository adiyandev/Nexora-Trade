import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { LiveCandlestickChart } from "@/components/live-candlestick-chart";

export default function Markets() {
  return (
    <AppShell>
      <PageHeading
        title="Live markets"
        subtitle="Explore real historical market candles and market prices. Select an asset to inspect its price action."
      />
      <LiveCandlestickChart />
    </AppShell>
  );
}
