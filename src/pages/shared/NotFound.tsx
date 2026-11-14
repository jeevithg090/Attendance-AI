import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function NotFound() {
  useDocumentTitle('Page not found');
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto text-center py-12 sm:py-20">
      <div
        className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] flex items-center justify-center"
        aria-hidden="true"
      >
        <Compass size={32} />
      </div>
      <p className="text-sm font-mono font-medium text-[var(--accent-primary)]">404</p>
      <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-3 text-[var(--text-muted)]">
        There is nothing at{' '}
        <span className="font-mono break-all text-[var(--text-secondary)]">{pathname}</span>. It may have
        moved, or the link may be mistyped.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          variant="secondary"
          icon={<ArrowLeft size={16} aria-hidden="true" />}
          onClick={() => navigate(-1)}
        >
          Go back
        </Button>
        <Link
          to="/"
          className="inline-flex items-center justify-center min-h-10 px-4 rounded-[var(--radius-md)] bg-[var(--accent-primary-solid)] hover:bg-[var(--accent-primary-solid-hover)] text-white text-sm font-medium transition-colors"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
