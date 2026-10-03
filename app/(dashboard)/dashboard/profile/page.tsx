import { getProfileAction } from '@/actions/profile';
import { getBookingsAction } from '@/actions/bookings';
import { UserProfileView } from '@/components/dashboard/UserProfileView';
import { MemberBookingsSection } from '@/components/dashboard/MemberBookingsSection';
import { redirect } from 'next/navigation';

export default async function ProfilePage() {
  const result = await getProfileAction();

  if (!result.success || !result.data) {
    redirect('/login');
  }

  let memberBookings: Array<{
    id: string;
    courtName: string;
    sportType: string;
    startTime: string;
    endTime: string;
    status: string;
    finalPrice: number;
    cancellationReason?: string | null;
    notes?: string | null;
  }> = [];

  if (result.data.member) {
    const bookingsResult = await getBookingsAction({
      memberId: result.data.member.id,
    });
    if (bookingsResult.success) {
      memberBookings = bookingsResult.data;
    }
  }

  return (
    <div className="space-y-8">
      <UserProfileView initialData={result.data} />
      {result.data.member && (
        <section className="max-w-4xl">
          <MemberBookingsSection bookings={memberBookings} />
        </section>
      )}
    </div>
  );
}
