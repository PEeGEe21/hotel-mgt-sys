import { HotelDetailClient } from '@/components/platform/HotelDetailClient';

export default function HotelDetailPage({ params }: { params: { id: string } }) {
  return <HotelDetailClient id={params.id} />;
}
