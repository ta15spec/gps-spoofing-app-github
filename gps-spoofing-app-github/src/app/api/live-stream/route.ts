import { NextResponse } from 'next/server';
import { predictSignal } from '@/lib/mlEngine';

export async function GET() {
  const prn = Math.floor(Math.random() * 32) + 1;
  const isAttack = Math.random() < 0.4; // 40% probability of attack

  let data: Record<string, any>;

  if (isAttack) {
    const attackTypes = ['Simplistic', 'Intermediate', 'Sophisticated'];
    const attackType = attackTypes[Math.floor(Math.random() * attackTypes.length)];

    if (attackType === 'Simplistic') {
      data = {
        CN0: parseFloat((52.5 + Math.random() * 3.5).toFixed(1)),
        DO: Math.round(3000 + Math.random() * 1500),
        PRN: prn,
        EC: 63559,
        PC: 76655,
        LC: 75203,
        TOW: Math.floor(Date.now() / 1000) % 604800,
        CP: -860324,
        PD: 6601350
      };
    } else if (attackType === 'Intermediate') {
      data = {
        CN0: parseFloat((46.0 + Math.random() * 2.0).toFixed(1)),
        DO: Math.round(900 + Math.random() * 300),
        PRN: prn,
        EC: 119093,
        PC: 133146,
        LC: 115553,
        TOW: Math.floor(Date.now() / 1000) % 604800,
        CP: -89630,
        PD: 23343991
      };
    } else {
      data = {
        CN0: parseFloat((43.0 + Math.random() * 2.0).toFixed(1)),
        DO: Math.round(-300 + Math.random() * 100),
        PRN: prn,
        EC: 80773,
        PC: 82402,
        LC: 80773,
        TOW: Math.floor(Date.now() / 1000) % 604800,
        CP: 14852,
        PD: 2630890
      };
    }
  } else {
    data = {
      CN0: parseFloat((47.0 + Math.random() * 3.5).toFixed(1)),
      DO: Math.round(-1800 + Math.random() * 400),
      PRN: prn,
      EC: 144572,
      PC: 173516,
      LC: 164237,
      TOW: Math.floor(Date.now() / 1000) % 604800,
      CP: 150686,
      PD: 25077078
    };
  }

  const result = predictSignal(data);

 return NextResponse.json({
  ...result,
  telemetryData: data,
  timestamp: new Date().toLocaleTimeString()
});
}
