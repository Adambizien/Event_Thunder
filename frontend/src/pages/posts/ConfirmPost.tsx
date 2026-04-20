import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { postService } from '../../services/PostService';

const ConfirmPost = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('Confirmation en cours...');
  const [isError, setIsError] = useState(false);
  const [xIntentUrl, setXIntentUrl] = useState<string | null>(null);
  const [postId, setPostId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const postId = searchParams.get('postId');
    const token = searchParams.get('token');

    if (!postId || !token) {
      setIsError(true);
      setMessage('Lien de confirmation invalide.');
      setLoading(false);
      return;
    }

    setPostId(postId);
    setToken(token);

    const run = async () => {
      try {
        const result = await postService.confirmPost(postId, token);
        setMessage(result.message || 'Post confirmé avec succès.');
        if (result.xIntentUrl) {
          setXIntentUrl(result.xIntentUrl);
          setMessage('Confirmation validée. Clique sur le bouton pour publier sur X.');
        }
      } catch (error) {
        setIsError(true);
        setMessage(
          error instanceof Error
            ? error.message
            : 'Impossible de confirmér la publication.',
        );
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [searchParams]);

  const handlePublishOnX = async () => {
    if (!postId || !token || !xIntentUrl || actionLoading) {
      return;
    }

    try {
      setActionLoading(true);
      const result = await postService.publishPostManual(postId, token);
      setIsError(false);
      setMessage(result.message ?? 'Post marqué comme envoyé. Redirection vers X...');
      window.location.assign(result.xIntentUrl ?? xIntentUrl);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : 'Impossible de publier le post.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelAndBack = async () => {
    if (!postId || !token || actionLoading) {
      navigate('/admin/social-posts');
      return;
    }

    try {
      setActionLoading(true);
      await postService.cancelPostManual(postId, token);
      navigate('/admin/social-posts');
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'annuler la publication.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy px-4 py-12">
      <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/5 p-8 text-white shadow-2xl backdrop-blur-lg">
        <h1 className="mb-3 text-2xl font-bold text-thunder-gold">
          Confirmation de publication
        </h1>
        <p className="mb-6 text-gray-300">
          {loading ? 'Traitement de ta demande...' : message}
        </p>

        <div
          className={`mb-6 rounded-xl border p-4 text-sm ${
            isError
              ? 'border-red-500/40 bg-red-500/20 text-red-200'
              : 'border-emerald-500/40 bg-emerald-500/20 text-emerald-200'
          }`}
        >
          {isError
            ? 'La publication n\'a pas pu être confirmée.'
            : xIntentUrl
              ? 'La confirmation est validée. Finalise la publication dans X.'
              : 'La confirmation est bien prise en compte.'}
        </div>

        <div className="mt-8 border-t border-white/10 pt-5">
          <div className="flex flex-wrap items-center justify-end gap-3">
            {!isError && xIntentUrl && (
              <button
                type="button"
                onClick={handlePublishOnX}
                disabled={actionLoading}
                className="inline-flex items-center rounded-lg border border-sky-400/70 bg-sky-500/20 px-4 py-2 font-semibold text-sky-200 transition hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ? 'Traitement...' : 'Publiér sur X'}
              </button>
            )}
            {!isError && xIntentUrl ? (
              <button
                type="button"
                onClick={handleCancelAndBack}
                disabled={actionLoading}
                className="inline-flex items-center rounded-lg border border-thunder-gold/70 bg-thunder-gold/20 px-4 py-2 font-semibold text-thunder-gold transition hover:bg-thunder-gold/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Retour à l'administration des posts
              </button>
            ) : (
              <Link
                to="/admin/social-posts"
                className="inline-flex items-center rounded-lg border border-thunder-gold/70 bg-thunder-gold/20 px-4 py-2 font-semibold text-thunder-gold transition hover:bg-thunder-gold/30"
              >
                Retour à l'administration des posts
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmPost;
