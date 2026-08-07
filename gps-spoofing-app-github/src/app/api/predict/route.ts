import { NextResponse } from 'next/server';
import { predictSignal } from '@/lib/mlEngine';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = predictSignal(body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error.message || 'Invalid Request Body' },
      { status: 400 }
    );
  }
}
