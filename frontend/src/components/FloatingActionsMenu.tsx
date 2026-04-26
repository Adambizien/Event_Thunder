import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';

export type FloatingActionItem = {
  key: string;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
  visible?: boolean;
};

type FloatingActionsMenuProps = {
  buttonLabel?: string;
  buttonDisabled?: boolean;
  buttonBusyLabel?: string;
  isBusy?: boolean;
  items: FloatingActionItem[];
  menuWidth?: number;
};

const FloatingActionsMenu = ({
  buttonLabel = 'Actions',
  buttonDisabled = false,
  buttonBusyLabel,
  isBusy = false,
  items,
  menuWidth = 256,
}: FloatingActionsMenuProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  const visibleItems = useMemo(
    () => items.filter((item) => item.visible !== false),
    [items],
  );

  const closeMenu = () => {
    setIsOpen(false);
    setMenuPosition(null);
  };

  const openMenu = (trigger: HTMLElement) => {
    const rect = trigger.getBoundingClientRect();
    const viewportPadding = 12;
    const estimatedMenuHeight = Math.max(120, visibleItems.length * 48 + 16);

    const leftInViewport = Math.min(
      Math.max(viewportPadding, rect.right - menuWidth),
      window.innerWidth - menuWidth - viewportPadding,
    );

    const overflowBottom =
      rect.bottom + 8 + estimatedMenuHeight - window.innerHeight + viewportPadding;
    if (overflowBottom > 0) {
      window.scrollBy({ top: overflowBottom, left: 0, behavior: 'auto' });
    }

    setMenuPosition({
      top: window.scrollY + rect.bottom + 8,
      left: window.scrollX + leftInViewport,
    });
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest('[data-floating-actions-root="true"]') &&
        !target.closest('[data-floating-actions-menu="true"]')
      ) {
        closeMenu();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', closeMenu);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', closeMenu);
    };
  }, [isOpen]);

  return (
    <>
      <div className="relative inline-flex" data-floating-actions-root="true" ref={rootRef}>
        <button
          type="button"
          onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
            if (isOpen) {
              closeMenu();
              return;
            }
            openMenu(event.currentTarget);
          }}
          disabled={buttonDisabled}
          className="flex items-center gap-2 rounded-lg px-3 py-2 bg-white/10 border border-white/20 hover:bg-white/20 transition-colors text-white disabled:opacity-50"
          aria-expanded={isOpen}
          aria-haspopup="menu"
        >
          {isBusy && buttonBusyLabel ? buttonBusyLabel : buttonLabel}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.51a.75.75 0 0 1-1.08 0l-4.25-4.51a.75.75 0 0 1 .02-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {isOpen &&
        menuPosition &&
        visibleItems.length > 0 &&
        createPortal(
          <div
            data-floating-actions-menu="true"
            className="absolute z-[130] rounded-xl border border-white/30 shadow-2xl overflow-hidden"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuWidth,
              backgroundColor: '#1f5664',
              opacity: 1,
            }}
          >
            {visibleItems.map((item) => (
              <button
                key={item.key}
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  closeMenu();
                  item.onClick();
                }}
                className={`block w-full px-4 py-3 text-left text-sm transition-colors disabled:opacity-50 ${
                  item.destructive
                    ? 'text-red-100 hover:bg-red-500/45'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
};

export default FloatingActionsMenu;