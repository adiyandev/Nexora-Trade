import { NextResponse } from "next/server";
export function GET(){return NextResponse.json({status:"ok",service:"nexoratrade",mode:"demo-preview",tradingEnabled:false,marketData:"sample"});}
