import { useMemo, useState } from 'react';
import type { PostItem, PostStatus } from '../types/PostTypes';
import Modal from './Modal';

type SocialPostsCalendarProps = {
  posts: PostItem[];
  onEditPost: (post: PostItem) => void;
  onDeletePost: (post: PostItem) => void;
  canEditPost: (post: PostItem) => boolean;
  canDeletePost: (post: PostItem) => boolean;
  deletingPostId: string | null;
};

const statusLabel: Record<PostStatus, string> = {
  draft: 'Brouillon',
  scheduled: 'Programme',
  awaiting_confirmation: 'En attente de confirmation',
  published: 'Publie',
  archived: 'Annule',
};

const statusCardStyle: Record<PostStatus, string> = {
  draft: 'border-white/20 bg-white/5 text-white/80',
  scheduled: 'border-white/30 bg-white/10 text-white',
  awaiting_confirmation: 'border-amber-400/40 bg-amber-400/15 text-amber-100',
  published: 'border-emerald-400/40 bg-emerald-400/15 text-emerald-100',
  archived: 'border-red-500/40 bg-red-500/15 text-red-100',
};

const statusBadgeStyle: Record<PostStatus, string> = {
  draft: 'border-white/30 bg-white/10 text-white',
  scheduled: 'border-white/40 bg-white/20 text-white',
  awaiting_confirmation: 'border-amber-400/50 bg-amber-400/20 text-amber-100',
  published: 'border-emerald-400/50 bg-emerald-400/20 text-emerald-100',
  archived: 'border-red-500/50 bg-red-500/20 text-red-100',
};

const toLocalDayKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isSameMonth = (current: Date, reference: Date) => {
  return (
    current.getMonth() === reference.getMonth() &&
    current.getFullYear() === reference.getFullYear()
  );
};

const buildMonthGrid = (month: Date) => {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  firstDay.setHours(0, 0, 0, 0);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
};

const formatMonthYear = (value: Date) => {
  return new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
  }).format(value);
};

const formatDayTitle = (dayKey: string) => {
  const date = new Date(`${dayKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dayKey;
  }

  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

const formatTime = (value?: string | null) => {
  if (!value) {
    return '--:--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatWeekdayShort = (value: Date) => {
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(value);
};

const truncate = (value: string, maxLength: number) => {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1)}...`;
};

const SocialPostsCalendar = ({
  posts,
  onEditPost,
  onDeletePost,
  canEditPost,
  canDeletePost,
  deletingPostId,
}: SocialPostsCalendarProps) => {
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const scheduledPosts = useMemo(
    () =>
      posts
        .filter((post) => post.scheduled_at)
        .filter((post) => {
          const scheduledDate = new Date(post.scheduled_at as string);
          return !Number.isNaN(scheduledDate.getTime());
        })
        .sort((first, second) => {
          const firstTime = new Date(first.scheduled_at as string).getTime();
          const secondTime = new Date(second.scheduled_at as string).getTime();
          return firstTime - secondTime;
        }),
    [posts],
  );

  const postsByDay = useMemo(() => {
    const grouped = new Map<string, PostItem[]>();

    for (const post of scheduledPosts) {
      const scheduledDate = new Date(post.scheduled_at as string);
      const key = toLocalDayKey(scheduledDate);
      const current = grouped.get(key) ?? [];
      current.push(post);
      grouped.set(key, current);
    }

    return grouped;
  }, [scheduledPosts]);

  const monthDays = useMemo(() => buildMonthGrid(calendarMonth), [calendarMonth]);

  const selectedDayPosts = selectedDay ? postsByDay.get(selectedDay) ?? [] : [];

  return (
    <>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-lg">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-white">Calendrier des programmations</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setCalendarMonth(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                )
              }
              className="rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white transition hover:bg-white/20"
            >
              {'<'}
            </button>
            <button
              type="button"
              onClick={() =>
                setCalendarMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
              }
              className="rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white transition hover:bg-white/20"
            >
              Aujourd'hui
            </button>
            <button
              type="button"
              onClick={() =>
                setCalendarMonth(
                  (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                )
              }
              className="rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white transition hover:bg-white/20"
            >
              {'>'}
            </button>
          </div>
        </div>

        <div className="mb-3 text-lg font-semibold capitalize text-thunder-gold">
          {formatMonthYear(calendarMonth)}
        </div>

        <div className="hidden grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-400 md:grid">
          {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((weekday) => (
            <div key={weekday} className="rounded-md border border-white/10 bg-black/20 px-2 py-2">
              {weekday}
            </div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {monthDays.map((day) => {
            const dayKey = toLocalDayKey(day);
            const dayPosts = postsByDay.get(dayKey) ?? [];
            const inCurrentMonth = isSameMonth(day, calendarMonth);
            const isClickable = dayPosts.length > 0;

            return (
              <div
                key={dayKey}
                onClick={() => {
                  if (isClickable) {
                    setSelectedDay(dayKey);
                  }
                }}
                className={`min-h-36 rounded-lg border p-2 ${
                  inCurrentMonth
                    ? 'border-white/15 bg-black/20'
                    : 'border-white/10 bg-black/10 opacity-60'
                } ${isClickable ? 'cursor-pointer transition hover:border-thunder-gold/50 hover:bg-black/30' : ''}`}
              >
                <div className="mb-2 flex items-center justify-between text-sm font-semibold text-white">
                  <span>{day.getDate()}</span>
                  <span className="text-[10px] uppercase tracking-wide text-gray-400 md:hidden">
                    {formatWeekdayShort(day)}
                  </span>
                </div>
                <div className="space-y-2">
                  {dayPosts.slice(0, 3).map((post) => (
                    <div
                      key={post.id}
                      className={`w-full rounded-md border px-2 py-1 text-left text-xs ${statusCardStyle[post.status]}`}
                    >
                      <div className="font-semibold">{formatTime(post.scheduled_at)}</div>
                      <div>{truncate(post.content, 46)}</div>
                    </div>
                  ))}
                  {dayPosts.length > 3 && (
                    <p className="text-xs text-gray-300">+{dayPosts.length - 3} autre(s)</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Modal
        isOpen={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? `Posts programmes - ${formatDayTitle(selectedDay)}` : 'Posts programmes'}
        size="lg"
      >
        {selectedDayPosts.length === 0 ? (
          <p className="text-gray-300">Aucun post programme ce jour.</p>
        ) : (
          <div className="space-y-4">
            {selectedDayPosts.map((post) => {
              const editingAllowed = canEditPost(post);
              const deletingAllowed = canDeletePost(post);

              return (
                <article key={post.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeStyle[post.status]}`}
                      >
                        {statusLabel[post.status]}
                      </span>
                      <span className="text-sm font-semibold text-white">
                        {formatTime(post.scheduled_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {editingAllowed && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDay(null);
                            onEditPost(post);
                          }}
                          className="rounded-md border border-white/30 bg-white/15 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-white/25"
                        >
                          Modifier
                        </button>
                      )}
                      {deletingAllowed && (
                        <button
                          type="button"
                          onClick={() => onDeletePost(post)}
                          disabled={deletingPostId === post.id}
                          className="rounded-md border border-red-500/50 bg-red-500/20 px-2.5 py-1 text-xs font-medium text-red-200 transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingPostId === post.id ? 'Suppression...' : 'Supprimer'}
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="whitespace-pre-wrap text-sm text-gray-200">{post.content}</p>
                </article>
              );
            })}
          </div>
        )}
      </Modal>
    </>
  );
};

export default SocialPostsCalendar;