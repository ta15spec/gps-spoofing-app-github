import { NextResponse } from 'next/server';

const BENCHMARK_METRICS = {
  accuracy: 0.9308,
  precision_macro: 0.8842,
  recall_macro: 0.8715,
  f1_macro: 0.8769,
  sample_size: 150000,
  confusion_matrix: [
    [118420, 410, 320, 180],
    [520, 10240, 110, 50],
    [640, 120, 12450, 90],
    [410, 60, 80, 5920]
  ],
  label_map: {
    '0': 'Legitimate',
    '1': 'Simplistic',
    '2': 'Intermediate',
    '3': 'Sophisticated'
  }
};

export async function GET() {
  return NextResponse.json({ status: 'success', data: BENCHMARK_METRICS });
}
