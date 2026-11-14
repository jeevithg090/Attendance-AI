import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <div className="max-w-md mx-auto text-center py-16 space-y-4">
      <p className="text-sm font-mono text-[var(--text-muted)]">404</p>
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-[var(--text-muted)]">
        The page you are looking for doesn&apos;t exist or has moved.
      </p>
      <Link
        to="/"
        className="inline-block px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-white font-medium"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
