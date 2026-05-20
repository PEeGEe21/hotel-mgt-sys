import { UserDetailClient } from '@/components/platform/UserDetailClient';

export default function UserDetailPage({ params }: { params: { id: string } }) {
  return <UserDetailClient id={params.id} />;
}
