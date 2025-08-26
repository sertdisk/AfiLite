import { NextResponse } from 'next/server';
import knex from '@/../src/db/sqlite';

// Tüm sözleşme versiyonlarını getir (sadece admin için)
export async function GET() {
  try {
    const db = knex;
    
    // Tüm sözleşmeleri versiyon sırasına göre getir
    const contracts = await db.select('*').from('contracts').orderBy('version', 'desc');
    
    return NextResponse.json(contracts);
  } catch (error) {
    console.error('Sözleşmeler getirilirken hata:', error);
    return NextResponse.json(
      { error: 'Sözleşmeler getirilemedi' },
      { status: 500 }
    );
  }
}

// Yeni sözleşme versiyonu oluştur (sadece admin için)
export async function POST(request: Request) {
  try {
    const db = knex;
    const { content } = await request.json();
    
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Sözleşme içeriği boş olamaz' },
        { status: 400 }
      );
    }
    
    // Mevcut en yüksek versiyonu bul
    const latestContract = await db.max('version as maxVersion').from('contracts').first();
    
    const newVersion = latestContract?.maxVersion ? latestContract.maxVersion + 1 : 1;
    
    // Önceki aktif sözleşmeleri pasif yap
    await db.from('contracts').where('is_active', true).update({ is_active: false });
    
    // Yeni sözleşmeyi oluştur ve aktif yap
    const [newContractId] = await db('contracts').insert({
      content: content.trim(),
      version: newVersion,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    const newContract = await db('contracts')
      .where('id', newContractId)
      .first();
    
    return NextResponse.json(newContract);
  } catch (error) {
    console.error('Yeni sözleşme oluşturulurken hata:', error);
    return NextResponse.json(
      { error: 'Yeni sözleşme oluşturulamadı' },
      { status: 500 }
    );
  }
}