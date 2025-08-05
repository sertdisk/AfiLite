/* Kısa açıklama: Kök sayfa — kullanıcıyı /login sayfasına yönlendiren basit sayfa. */
import { redirect } from 'next/navigation';

export default function Home() {
  // Not: İlk açılışta login sayfasına yönlendir.
  redirect('/login');
  return null;
}