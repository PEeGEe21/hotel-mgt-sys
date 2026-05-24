import { SupportCaseDetailClient } from '@/components/platform/SupportCaseDetailClient';

export default function PlatformSupportCaseDetailPage({ params }: { params: { id: string } }) {
  return <SupportCaseDetailClient id={params.id} />;
}
