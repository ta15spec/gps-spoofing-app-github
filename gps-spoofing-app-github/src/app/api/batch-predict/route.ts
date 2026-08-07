import { NextResponse } from 'next/server';
import { predictSignal } from '@/lib/mlEngine';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!Array.isArray(body)) {
      return NextResponse.json(
        { status: 'error', message: 'Batch prediction requires an array of GPS data records.' },
        { status: 400 }
      );
    }

    const predictions: any[] = [];
    let spoofedCount = 0;
    let legitimateCount = 0;
    const classBreakdown: Record<string, number> = {
      Legitimate: 0,
      Simplistic: 0,
      Intermediate: 0,
      Sophisticated: 0
    };

    body.forEach((record: any, idx: number) => {
      const pred = predictSignal(record);
      if (pred.isSpoofed) {
        spoofedCount++;
      } else {
        legitimateCount++;
      }
      classBreakdown[pred.classification] = (classBreakdown[pred.classification] || 0) + 1;

      predictions.push({
        recordIndex: idx,
        predictedClassId: pred.predictedClassId,
        classification: pred.classification,
        isSpoofed: pred.isSpoofed,
        confidence: pred.confidence,
        riskLevel: pred.riskLevel
      });
    });

    const totalRecords = body.length;
    const spoofingPercentage = totalRecords > 0 ? parseFloat(((spoofedCount / totalRecords) * 100).toFixed(2)) : 0;

    return NextResponse.json({
      status: 'success',
      totalRecords,
      spoofedCount,
      legitimateCount,
      spoofingPercentage,
      classBreakdown,
      predictions
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error.message || 'Invalid batch payload' },
      { status: 400 }
    );
  }
}
