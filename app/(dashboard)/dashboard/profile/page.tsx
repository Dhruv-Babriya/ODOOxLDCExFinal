import { getProfileAction } from '@/actions/profile';
import { UserProfileView } from '@/components/dashboard/UserProfileView';
import { redirect } from 'next/navigation';

export default async function ProfilePage() {
  const result = await getProfileAction();

  if (!result.success || !result.data) {
    redirect('/login');
  }

  return <UserProfileView initialData={result.data} />;
}
