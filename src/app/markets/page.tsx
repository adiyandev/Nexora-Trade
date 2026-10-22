import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { LiveCandlestickChart } from "@/components/live-candlestick-chart";
import { getDemoInstrument } from "@/lib/demo-instruments";

export default async function Markets({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string }>;
}) {
  const params = await searchParams;
  const requested = (params.symbol ?? "MEDI").trim().toUpperCase();
  const initialSymbol = getDemoInstrument(requested) ? requested : "MEDI";

  return (
    <AppShell>
      <PageHeading
        title="Markets"
        subtitle="Explore fictional instruments on the Nexora demo exchange. Prices and candles are simulated for practice."
      />
      <LiveCandlestickChart initialSymbol={initialSymbol} />
    </AppShell>
  );
}
