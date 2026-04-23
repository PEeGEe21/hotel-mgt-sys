import { NotFoundFallback } from '@/components/errors/NotFoundFallback';

export default function NotFound() {
  return (
    <NotFoundFallback
      fullScreen
      title="We could not find that page"
      description="The route does not exist or may have been moved. Head back to the dashboard to continue working."
    />
  );
}
