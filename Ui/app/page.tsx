/* Kısa açıklama: Kök sayfa — admin oturumuna göre yönlendir.
   Not: Admin panel /admin/* altına izole edildi. */
import { redirect } from 'next/navigation';

export default function Home() {
  // Admin panel tamamen /admin altında olduğundan kökten direkt /admin'e yönlendiriyoruz.
  redirect('/login');
}