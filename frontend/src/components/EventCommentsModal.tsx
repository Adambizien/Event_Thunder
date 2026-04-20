import Modal from './Modal';
import type { CommentItem } from '../types/CommentTypes';

const COMMENT_PREVIEW_LENGTH = 220;

const toLocalInputDateTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('fr-FR');
};

interface EventCommentsModalProps {
  isOpen: boolean;
  eventTitle: string;
  loadingComments: boolean;
  eventComments: CommentItem[];
  expandedComments: Record<string, boolean>;
  deletingCommentId: string | null;
  onClose: () => void;
  onDeleteComment: (commentId: string) => void;
  onToggleExpanded: (commentId: string) => void;
}

const EventCommentsModal = ({
  isOpen,
  eventTitle,
  loadingComments,
  eventComments,
  expandedComments,
  deletingCommentId,
  onClose,
  onDeleteComment,
  onToggleExpanded,
}: EventCommentsModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={eventTitle ? `Commentaires - ${eventTitle}` : 'Commentaires'}
      size="lg"
    >
      {loadingComments ? (
        <div className="text-gray-300 text-center py-6">
          <span className="spinner mr-2 align-middle"></span>
          Chargement des commentaires...
        </div>
      ) : eventComments.length === 0 ? (
        <p className="text-gray-300">Aucun commentaire pour cet événement.</p>
      ) : (
        <div className="space-y-4">
          {eventComments.map((comment) => {
            const isLongComment = comment.content.length > COMMENT_PREVIEW_LENGTH;
            const isExpanded = Boolean(expandedComments[comment.id]);
            const visibleComment =
              isLongComment && !isExpanded
                ? `${comment.content.slice(0, COMMENT_PREVIEW_LENGTH)}...`
                : comment.content;

            return (
              <div key={comment.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{comment.authorDisplayName}</p>
                    <p className="text-xs text-gray-400">{toLocalInputDateTime(comment.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => onDeleteComment(comment.id)}
                    disabled={deletingCommentId === comment.id}
                    className="bg-red-500/25 hover:bg-red-500/30 border border-red-500/50 text-red-200 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                  >
                    {deletingCommentId === comment.id ? 'Suppression...' : 'Supprimer'}
                  </button>
                </div>

                <p className="text-gray-200 whitespace-pre-line leading-6">{visibleComment}</p>

                {isLongComment && (
                  <button
                    type="button"
                    onClick={() => onToggleExpanded(comment.id)}
                    className="mt-2 text-sm font-semibold text-thunder-gold underline underline-offset-2 decoration-thunder-gold hover:text-thunder-gold-light"
                  >
                    {isExpanded ? 'Voir moins' : 'Voir plus'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
};

export default EventCommentsModal;