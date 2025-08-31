import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const cookieStore = cookies();
  const token = cookieStore.get('jwt_admin')?.value;

  if (!token) {
    return NextResponse.json({ message: 'Access token gerekli' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const backendParams = new URLSearchParams(searchParams);

  // Frontend'den gelen 'influencer' parametresini backend'in anladığı 'code' olarak değiştir
  if (backendParams.has('influencer')) {
    backendParams.set('code', backendParams.get('influencer')!);
    backendParams.delete('influencer');
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL || 'http://localhost:5003';
  const backendUrl = `${baseUrl}/api/sales?${backendParams.toString()}`;

  try {
    const res = await fetch(backendUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: 'Bilinmeyen hata' }));
      return NextResponse.json(errorData, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error proxying sales request:', error);
    return NextResponse.json({ message: 'Backend sunucusuna erişilemiyor.' }, { status: 500 });
  }
}

