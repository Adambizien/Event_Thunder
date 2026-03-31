import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Modal from '../../components/Modal';
import { commentService } from '../../services/CommentService';
import { eventService } from '../../services/EventService';
import { ticketService } from '../../services/TicketService';
import type { User } from '../../types/AuthTypes';
import type { CommentItem, LikedUser } from '../../types/CommentTypes';
import type { EventItem } from '../../types/EventTypes';
import type { TicketTypeItem } from '../../types/TicketTypes';

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('fr-FR');
};

const getStatusBanner = (status: EventItem['status']) => {
  if (status === 'published') {
    return {
      text: 'Cet evenement est en cours',
      className: 'border-emerald-500/50 bg-emerald-500/20 text-emerald-200',
      badge: 'En cours',
    };
  }

  if (status === 'canceled') {
    return {
      text: 'Cet evenement est annule',
      className: 'border-red-500/50 bg-red-500/30 text-red-200',
      badge: 'Annule',
    };
  }

  if (status === 'completed') {
    return {
      text: 'Cet evenement est termine',
      className: 'border-blue-500/50 bg-blue-500/20 text-blue-200',
      badge: 'Termine',
    };
  }

  return {
    text: 'Cet evenement est en brouillon',
    className: 'border-amber-500/50 bg-amber-500/20 text-amber-200',
    badge: 'Brouillon',
  };
};

const COMMENT_PREVIEW_LENGTH = 240;
const LIKE_PREVIEW_LIMIT = 5;

const formatDisplayName = (user: { id: string; firstName?: string; lastName?: string }) => {
  const firstName = user.firstName?.trim() || '';
  const lastName = user.lastName?.trim() || '';
  const fullName = `${firstName} ${lastName}`.trim();
  if (fullName) {
    return fullName;
  }

  return `Utilisateur ${user.id.slice(0, 8)}`;
};

const EventDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketTypeItem[]>([]);
  const [ticketQuantities, setTicketQuantities] = useState<Record<string, number>>({});
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [likingCommentId, setLikingCommentId] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [likesModalCommentId, setLikesModalCommentId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = Boolean(localStorage.getItem('token'));

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      setCurrentUser(null);
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser) as User;
      setCurrentUser(parsedUser);
    } catch {
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) {
        setError('Evenement introuvable');
        setLoading(false);
        setCommentsLoading(false);
        return;
      }

      try {
        setLoading(true);
        setCommentsLoading(true);

        const [eventData, commentsData, loadedTicketTypes] = await Promise.all([
          eventService.fetchEventById(id),
          commentService.fetchByEvent(id),
          ticketService.getEventTicketTypes(id),
        ]);

        setEvent(eventData);
        setComments(commentsData);
        setTicketTypes(loadedTicketTypes);
        setTicketQuantities(
          Object.fromEntries(loadedTicketTypes.map((ticketType) => [ticketType.id, 0])),
        );
        setError(null);
        setCommentsError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        if (message.toLowerCase().includes('inaccessible')) {
          setError('Cet evenement est inaccessible');
        } else {
          setError(message);
        }

        if (message.toLowerCase().includes('comment')) {
          setCommentsError(message);
        }

        setEvent(null);
        setComments([]);
        setTicketTypes([]);
        setTicketQuantities({});
      } finally {
        setLoading(false);
        setCommentsLoading(false);
      }
    };

    void fetchDetails();
  }, [id]);

  const handleSubmitComment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!id || submittingComment) {
      return;
    }

    if (!isAuthenticated) {
      setCommentsError('Connectez-vous pour envoyer un commentaire');
      return;
    }

    const content = newComment.trim();
    if (!content) {
      setCommentsError('Le commentaire ne peut pas etre vide');
      return;
    }

    try {
      setSubmittingComment(true);
      setCommentsError(null);
      const createdComment = await commentService.create(id, content);
      setComments((prev) => [createdComment, ...prev]);
      setNewComment('');
    } catch (err) {
      setCommentsError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSubmittingComment(false);
    }
  };

  const updateTicketQuantity = (ticketTypeId: string, quantity: number) => {
    setTicketQuantities((prev) => ({
      ...prev,
      [ticketTypeId]: Math.max(0, Math.min(20, quantity)),
    }));
  };

  const handleBuyTickets = async () => {
    if (!id || !event) {
      return;
    }

    if (!isAuthenticated || !currentUser) {
      navigate('/login');
      return;
    }

    const selectedItems = ticketTypes
      .map((ticketType) => ({
        ticket_type_id: ticketType.id,
        quantity: ticketQuantities[ticketType.id] ?? 0,
      }))
      .filter((item) => item.quantity > 0);

    if (selectedItems.length === 0) {
      setPurchaseError('Sélectionnez au moins un ticket');
      return;
    }

    try {
      setPurchasing(true);
      setPurchaseError(null);

      const customerName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`
        .trim() ||
        currentUser.email;

      const result = await ticketService.createCheckoutSession({
        event_id: id,
        items: selectedItems,
        customer_email: currentUser.email,
        customer_name: customerName,
        success_url: `${window.location.origin}/my-tickets?checkout=success&eventId=${encodeURIComponent(id)}`,
        cancel_url: `${window.location.origin}/events/${id}?checkout=cancel`,
      });

      if (!result.url) {
        throw new Error('URL de paiement indisponible');
      }

      window.location.href = result.url;
    } catch (err) {
      setPurchaseError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setPurchasing(false);
    }
  };

  const handleToggleLike = async (commentId: string) => {
    if (!isAuthenticated) {
      setCommentsError('Connectez-vous pour aimer un commentaire');
      return;
    }

    try {
      setLikingCommentId(commentId);
      setCommentsError(null);
      const response = await commentService.toggleLike(commentId);
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                likeCount: response.likeCount,
                likedByCurrentUser: response.likedByCurrentUser,
                likedUserIds: response.likedUserIds,
                likedUsers: response.likedUsers,
              }
            : comment,
        ),
      );
    } catch (err) {
      setCommentsError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLikingCommentId(null);
    }
  };

  const toggleExpandedComment = (commentId: string) => {
    setExpandedComments((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const openLikesModal = (commentId: string) => {
    setLikesModalCommentId(commentId);
  };

  const closeLikesModal = () => {
    setLikesModalCommentId(null);
  };

  const likesModalComment =
    likesModalCommentId !== null
      ? comments.find((comment) => comment.id === likesModalCommentId) || null
      : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy px-4 py-12">
        <div className="max-w-4xl mx-auto rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-300 shadow-2xl backdrop-blur-lg">
          <span className="spinner mr-2 align-middle"></span>
          Chargement de l'evenement...
        </div>
      </div>
    );
  }

  if (!event || error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="rounded-2xl border border-red-500/50 bg-red-500/30 p-6 text-red-200 shadow-2xl backdrop-blur-lg">
            {error || 'Evenement introuvable'}
          </div>
          <Link
            to="/"
            className="inline-flex bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Retour a l'accueil
          </Link>
        </div>
      </div>
    );
  }

  const banner = getStatusBanner(event.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy px-4 py-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className={`rounded-xl border p-4 text-center font-semibold ${banner.className}`}>
          {banner.text}
        </div>

        <section className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
          {event.image_url ? (
            <img
              src={event.image_url}
              alt={event.title}
              className="h-[320px] w-full object-cover"
            />
          ) : (
            <div className="h-[320px] bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(197,152,73,0.35),transparent_35%),linear-gradient(120deg,#0c2f3e_0%,#095668_55%,#0b1f2c_100%)]" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />

          <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="rounded-full border border-white/30 bg-black/30 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                {banner.badge}
              </span>
              <span className="rounded-full border border-white/30 bg-black/30 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                {event.category?.name || 'Sans categorie'}
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-bold leading-tight text-white drop-shadow-md">
              {event.title}
            </h1>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/20 bg-black/25 p-3 backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-gray-300">Debut</p>
                <p className="text-white font-medium">{formatDate(event.start_date)}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-black/25 p-3 backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-gray-300">Fin</p>
                <p className="text-white font-medium">{formatDate(event.end_date)}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-black/25 p-3 backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-gray-300">Lieu</p>
                <p className="text-white font-medium">{event.location}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 shadow-2xl backdrop-blur-lg">
            <h2 className="text-2xl font-bold text-thunder-gold mb-4">A propos de cet evenement</h2>
            <p className="text-gray-200 whitespace-pre-line leading-7">
              {event.description}
            </p>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-lg">
              <h3 className="text-lg font-semibold text-white mb-4">Informations pratiques</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Adresse</p>
                  <p className="text-white">{event.address}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Lieu</p>
                  <p className="text-white">{event.location}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Date de debut</p>
                  <p className="text-white">{formatDate(event.start_date)}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Date de fin</p>
                  <p className="text-white">{formatDate(event.end_date)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-lg">
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Etat de l'evenement</p>
              <p className="text-white font-semibold">{banner.text}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-lg space-y-4">
              <h3 className="text-lg font-semibold text-white">Billetterie</h3>

              {ticketTypes.length === 0 ? (
                <p className="text-sm text-gray-300">Aucun ticket disponible pour cet événement.</p>
              ) : (
                <div className="space-y-3">
                  {ticketTypes.map((ticketType) => {
                    const remaining =
                      ticketType.max_quantity !== null && ticketType.max_quantity !== undefined
                        ? Math.max(0, ticketType.max_quantity - ticketType.sold_quantity)
                        : null;
                    const quantity = ticketQuantities[ticketType.id] ?? 0;

                    return (
                      <div
                        key={ticketType.id}
                        className="rounded-xl border border-white/10 bg-black/20 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">{ticketType.name}</p>
                            {ticketType.description && (
                              <p className="text-xs text-gray-400">{ticketType.description}</p>
                            )}
                          </div>
                          <p className="font-semibold text-thunder-gold">
                            {new Intl.NumberFormat('fr-FR', {
                              style: 'currency',
                              currency: ticketType.currency,
                            }).format(Number(ticketType.price))}
                          </p>
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-3">
                          <p className="text-xs text-gray-400">
                            {remaining === null ? 'Stock illimité' : `Restant: ${remaining}`}
                          </p>
                          {remaining !== null && remaining <= 0 ? (
                            <p className="text-xs font-semibold text-red-300">
                              Ce ticket n'est plus disponible
                            </p>
                          ) : (
                            <input
                              type="number"
                              min="0"
                              max={remaining === null ? 20 : Math.min(20, remaining)}
                              value={quantity}
                              onChange={(e) => updateTicketQuantity(ticketType.id, Number(e.target.value))}
                              className="w-24 bg-white/10 border border-white/20 rounded px-3 py-1.5 text-white focus:border-thunder-gold focus:outline-none"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {purchaseError && (
                <div className="rounded-lg border border-red-500/50 bg-red-500/20 p-3 text-sm text-red-200">
                  {purchaseError}
                </div>
              )}

              <button
                type="button"
                onClick={() => void handleBuyTickets()}
                disabled={
                  purchasing ||
                  ticketTypes.length === 0 ||
                  event.status !== 'published'
                }
                className="w-full bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold py-2.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {purchasing ? 'Redirection vers Stripe...' : 'Acheter mes tickets'}
              </button>
            </div>
          </aside>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 shadow-2xl backdrop-blur-lg space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold text-thunder-gold">Commentaires</h2>
            <span className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-xs font-semibold text-gray-200">
              {comments.length} commentaire{comments.length > 1 ? 's' : ''}
            </span>
          </div>

          <form onSubmit={handleSubmitComment} className="space-y-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={
                isAuthenticated
                  ? 'Ecrivez votre commentaire...'
                  : 'Connectez-vous pour commenter'
              }
              disabled={!isAuthenticated || submittingComment}
              className="w-full min-h-28 rounded-xl border border-white/20 bg-white/10 p-3 text-white placeholder:text-gray-400 focus:border-thunder-gold focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              {!isAuthenticated ? (
                <p className="text-sm text-gray-300">
                  Vous devez etre connecte pour commenter et aimer.
                </p>
              ) : (
                <p className="text-sm text-gray-400">
                  Maximum 2000 caracteres.
                </p>
              )}

              <button
                type="submit"
                disabled={!isAuthenticated || submittingComment}
                className="bg-white/15 hover:bg-white/25 border border-white/30 text-white px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/15"
              >
                {submittingComment ? 'Envoi...' : 'Publier'}
              </button>
            </div>
          </form>

          {commentsError && (
            <div className="rounded-xl border border-red-500/50 bg-red-500/30 p-3 text-red-200 text-sm">
              {commentsError}
            </div>
          )}

          {commentsLoading ? (
            <div className="text-gray-300">
              <span className="spinner mr-2 align-middle"></span>
              Chargement des commentaires...
            </div>
          ) : comments.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-center text-gray-300">
              Aucun commentaire pour le moment.
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => {
                const isLongComment = comment.content.length > COMMENT_PREVIEW_LENGTH;
                const showFullComment = Boolean(expandedComments[comment.id]);
                const visibleComment =
                  isLongComment && !showFullComment
                    ? `${comment.content.slice(0, COMMENT_PREVIEW_LENGTH)}...`
                    : comment.content;

                const hasManyLikes = comment.likedUsers.length > LIKE_PREVIEW_LIMIT;
                const visibleLikedUsers: LikedUser[] =
                  hasManyLikes
                    ? comment.likedUsers.slice(0, LIKE_PREVIEW_LIMIT)
                    : comment.likedUsers;

                return (
                  <article
                    key={comment.id}
                    className="rounded-xl border border-white/10 bg-white/5 p-4 md:p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {currentUser?.id === comment.userId
                            ? 'Vous'
                            : (comment.authorDisplayName || formatDisplayName(comment.user))}
                        </p>
                        <p className="text-xs text-gray-400">{formatDate(comment.createdAt)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleLike(comment.id)}
                        disabled={!isAuthenticated || likingCommentId === comment.id}
                        aria-label={comment.likedByCurrentUser ? 'Retirer aimé' : 'Ajouter aimé'}
                        className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                          comment.likedByCurrentUser
                            ? 'border-thunder-gold bg-thunder-gold/20 text-thunder-gold'
                            : 'border-white/30 bg-white/10 text-gray-200 hover:bg-white/20'
                        }`}
                      >
                        {likingCommentId === comment.id ? (
                          '...'
                        ) : (
                          <>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              className="h-5 w-5"
                              fill={comment.likedByCurrentUser ? 'currentColor' : 'none'}
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path
                                d="M12 21s-6.716-4.35-9.193-8.304C.96 9.756 2.321 5.5 6.03 4.69c2.154-.47 4.067.417 5.17 2.052C12.304 5.107 14.217 4.22 16.37 4.69c3.71.81 5.07 5.066 3.224 8.006C18.716 16.65 12 21 12 21z"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            <span className="ml-1.5">{comment.likeCount}</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-gray-200 whitespace-pre-line leading-7">{visibleComment}</p>

                    {isLongComment && (
                      <button
                        type="button"
                        onClick={() => toggleExpandedComment(comment.id)}
                        className="mt-2 text-sm font-semibold text-thunder-gold underline underline-offset-2 decoration-thunder-gold hover:text-thunder-gold-light"
                      >
                        {showFullComment ? 'Voir moins' : 'Voir plus'}
                      </button>
                    )}

                    {comment.likedUsers.length > 0 && (
                      <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3">
                        <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">
                          Aimé par
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {visibleLikedUsers.map((likedUser) => (
                            <span
                              key={`${comment.id}-${likedUser.id}`}
                              className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs text-gray-200"
                            >
                              {currentUser?.id === likedUser.id
                                ? 'Vous'
                                : (likedUser.displayName || formatDisplayName(likedUser))}
                            </span>
                          ))}
                        </div>

                        {hasManyLikes && (
                          <button
                            type="button"
                            onClick={() => openLikesModal(comment.id)}
                            className="mt-2 text-sm font-semibold text-thunder-gold underline underline-offset-2 decoration-thunder-gold hover:text-thunder-gold-light"
                          >
                            Voir plus
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <Modal
          isOpen={Boolean(likesModalComment)}
          onClose={closeLikesModal}
          title="Personnes qui ont aimé"
          size="sm"
        >
          {!likesModalComment || likesModalComment.likedUsers.length === 0 ? (
            <p className="text-gray-300">Aucune personne pour le moment.</p>
          ) : (
            <div className="space-y-3">
              {likesModalComment.likedUsers.map((likedUser) => (
                <div
                  key={`${likesModalComment.id}-${likedUser.id}`}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                >
                  {currentUser?.id === likedUser.id
                    ? 'Vous'
                    : (likedUser.displayName || formatDisplayName(likedUser))}
                </div>
              ))}
            </div>
          )}
        </Modal>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/"
            className="inline-flex bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Retour a l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;