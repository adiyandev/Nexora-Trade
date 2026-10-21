import { describe, expect, it } from "vitest";
import { orderInputSchema } from "./validation";
const valid={accountId:"00000000-0000-4000-8000-000000000001",assetSymbol:"BTC",side:"buy" as const,type:"market" as const,quantity:"0.25",idempotencyKey:"request-key-000001"};
describe("order input validation",()=>{it("accepts a well-formed demo order",()=>{expect(orderInputSchema.safeParse(valid).success).toBe(true)});it("rejects zero quantity",()=>{expect(orderInputSchema.safeParse({...valid,quantity:"0"}).success).toBe(false)});it("requires a price for limit orders",()=>{expect(orderInputSchema.safeParse({...valid,type:"limit"}).success).toBe(false)});it("rejects malformed symbols",()=>{expect(orderInputSchema.safeParse({...valid,assetSymbol:"BTC/USD"}).success).toBe(false)});});
