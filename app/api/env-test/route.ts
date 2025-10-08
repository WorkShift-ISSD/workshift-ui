import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasPostgresUrl: !!process.env.POSTGRES_URL,
    urlStart: process.env.POSTGRES_URL?.substring(0, 20) + '...',
    allEnvVars: Object.keys(process.env).filter(key => key.includes('POSTGRES'))
  });
}