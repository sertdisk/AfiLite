/* Kısa açıklama: Sağlık kontrolü — Proje iskeleti tamamlandığında basit bir JSON döndürür. */
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ ok: true });
}