import type { PostItem } from '../types/PostTypes';

type SocialPostDetailsCardsProps = {
  post: PostItem;
  content: string;
  contentExpandable?: boolean;
  isContentExpanded?: boolean;
  onToggleContent?: () => void;
  eventName: string;
  networks: string;
  cancellationReason?: string | null;
  expiresAt?: Date | null;
  remainingMs?: number | null;
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const formatRemainingTime = (ms: number) => {
  if (ms <= 0) {
    return 'Expiré';
  }

  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes} min`;
  }

  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
};

const getOwnerFullName = (post: PostItem) => {
  const fullName = `${post.owner?.firstName ?? ''} ${post.owner?.lastName ?? ''}`.trim();
  return fullName || '-';
};

const getOwnerEmail = (post: PostItem) => {
  return post.owner?.email?.trim() || '-';
};

const getOwnerId = (post: PostItem) => {
  return post.owner?.id || post.user_id || '-';
};

type DetailCard = {
  label: string;
  value: string;
  fullWidth?: boolean;
};

const SocialPostDetailsCards = ({
  post,
  content,
  contentExpandable = false,
  isContentExpanded = false,
  onToggleContent,
  eventName,
  networks,
  cancellationReason,
  expiresAt,
  remainingMs,
}: SocialPostDetailsCardsProps) => {
  const ownerFullName = getOwnerFullName(post);
  const ownerEmail = getOwnerEmail(post);
  const ownerId = getOwnerId(post);
  const detailCards: DetailCard[] = [
    { label: 'Type', value: networks },
    { label: 'Événement', value: eventName },
    {
      label: 'Propriétaire',
      value: `Nom complet: ${ownerFullName}\nEmail: ${ownerEmail}\nID: ${ownerId}`,
      fullWidth: true,
    },
    { label: 'Créé le', value: formatDateTime(post.created_at) },
    { label: 'Mis à jour le', value: formatDateTime(post.updated_at) },
  ];

  if (post.status === 'published') {
    detailCards.push({
      label: 'Publié le',
      value: formatDateTime(post.published_at),
    });
  }

  if (post.status === 'archived') {
    detailCards.push({
      label: 'Annulé le',
      value: formatDateTime(post.updated_at),
    });
  }

  if (post.status === 'expired') {
    detailCards.push({
      label: 'Expiré le',
      value: formatDateTime(post.updated_at),
    });
  }

  if (cancellationReason) {
    detailCards.push({
      label: 'Raison',
      value: cancellationReason,
      fullWidth: true,
    });
  }

  if (post.status === 'awaiting_confirmation' && expiresAt && typeof remainingMs === 'number') {
    detailCards.push(
      {
        label: 'Expiration',
        value: formatDateTime(expiresAt.toISOString()),
      },
      {
        label: 'Temps restant',
        value: formatRemainingTime(remainingMs),
      },
    );
  }

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-200 sm:col-span-2">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Contenu</p>
        <p className="break-all whitespace-pre-wrap text-sm text-gray-100">{content}</p>
        {contentExpandable && onToggleContent && (
          <button
            type="button"
            onClick={onToggleContent}
            className="mt-2 text-sm font-semibold text-thunder-gold underline underline-offset-2 decoration-thunder-gold hover:text-thunder-gold-light"
          >
            {isContentExpanded ? 'Voir moins' : 'Voir plus'}
          </button>
        )}
      </div>
      {detailCards.map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          className={`rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-200 ${
            item.fullWidth ? 'sm:col-span-2' : ''
          }`}
        >
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{item.label}</p>
          <p className="break-all whitespace-pre-wrap text-sm text-gray-100">{item.value}</p>
        </div>
      ))}
    </div>
  );
};

export default SocialPostDetailsCards;
