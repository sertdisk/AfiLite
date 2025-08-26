/* /admin kökü → /admin/dashboard'a yönlendirir */
import { redirect } from 'next/navigation';

export default function AdminRoot() {
  redirect('/admin/dashboard');
}