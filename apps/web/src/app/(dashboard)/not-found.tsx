import { NotFoundFallback } from '@/components/errors/NotFoundFallback';

export default function DashboardNotFound() {
  return (
    <NotFoundFallback
      title="This dashboard page does not exist"
      description="That workspace view is not available. Use the dashboard to get back to a known section."
    />
  );
}
