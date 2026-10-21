import { AppShell } from "@/components/app-shell";
import { PageHeading } from "@/components/page-heading";
import { LiveCandlestickChart } from "@/components/live-candlestick-chart";

export default async function Markets({
  searchParams,
}: {
  searchParams: Promise<{ symbol?: string }>;
}) {
  const params = await searchParams;
  const requested = (params.symbol ?? "AAPL").trim().toUpperCase();
  const initialSymbol = /^[A-Z0-9-]{1,12}$/.test(requested) ? requested : "AAPL";

  return (
    <AppShell>
      <PageHeading
        title="Markets"
        subtitle="Inspect provider-sourced historical candles, volume, and quote metadata. Data can be delayed and is not a trade execution feed."
      />
      <LiveCandlestickChart initialSymbol={initialSymbol} />
    </AppShell>
  );
}
