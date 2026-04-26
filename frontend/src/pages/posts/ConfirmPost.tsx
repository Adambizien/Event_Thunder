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
  const [intentUrl, setIntentUrl] = useState<string | null>(null);
  const [intentNetwork, setIntentNetwork] = useState<'x' | 'facebook' | null>(null);
  const [postId, setPostId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const networkLabel = intentNetwork === 'facebook' ? 'Facebook' : 'X';

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
        const resolvedIntentUrl = result.intentUrl ?? result.xIntentUrl;
        const resolvedNetwork = result.intentNetwork ?? (result.xIntentUrl ? 'x' : null);

        if (resolvedIntentUrl) {
          setIntentUrl(resolvedIntentUrl);
          setIntentNetwork(resolvedNetwork);
          setMessage(
            `Confirmation validée. Clique sur le bouton pour publier sur ${resolvedNetwork === 'facebook' ? 'Facebook' : 'X'}.`,
          );
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

  const handlePublishOnNetwork = async () => {
    if (!postId || !token || !intentUrl || actionLoading) {
      return;
    }

    try {
      setActionLoading(true);
      const result = await postService.publishPostManual(postId, token);
      const resolvedIntentUrl = result.intentUrl ?? result.xIntentUrl ?? intentUrl;
      setIsError(false);
      setMessage(
        result.message ?? `Post marqué comme envoyé. Redirection vers ${networkLabel}...`,
      );
      window.location.assign(resolvedIntentUrl);
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
            : intentUrl
              ? `La confirmation est validée. Finalise la publication dans ${networkLabel}.`
              : 'La confirmation est bien prise en compte.'}
        </div>

        <div className="mt-8 border-t border-white/10 pt-5">
          <div className="grid grid-cols-2 gap-3">
            {!isError && intentUrl && (
              <button
                type="button"
                onClick={handlePublishOnNetwork}
                disabled={actionLoading}
                className="btn-primary inline-flex w-full items-center justify-center gap-2"
              >
                {actionLoading ? 'Traitement...' : `Publier sur ${networkLabel}`}
              </button>
            )}
            {!isError && intentUrl ? (
              <button
                type="button"
                onClick={handleCancelAndBack}
                disabled={actionLoading}
                className="inline-flex w-full items-center justify-center rounded border border-white/30 bg-white/15 px-6 py-2 font-semibold text-white transition-colors hover:bg-white/25 disabled:opacity-60"
              >
                Annuler et revenir à la gestion des posts
              </button>
            ) : (
              <Link
                to="/admin/social-posts"
                className="col-span-2 inline-flex w-full items-center justify-center rounded border border-white/30 bg-white/15 px-6 py-2 font-semibold text-white transition-colors hover:bg-white/25"
              >
                Annuler et revenir à la gestion des posts
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmPost;
