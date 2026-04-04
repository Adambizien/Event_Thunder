import Modal from './Modal';
import TicketPurchaseCards, { type TicketPurchaseCardData } from './TicketPurchaseCards';

interface EventSoldTicketsModalProps {
  isOpen: boolean;
  eventTitle: string;
  loadingSoldTickets: boolean;
  soldTicketsError: string | null;
  soldTicketsSearchTerm: string;
  hasSearchResults: boolean;
  soldTicketPurchaseCards: TicketPurchaseCardData[];
  openingSoldTicketInvoiceId: string | null;
  onClose: () => void;
  onSearchTermChange: (value: string) => void;
  onOpenInvoice: (stripePaymentIntentId: string) => void;
}

const EventSoldTicketsModal = ({
  isOpen,
  eventTitle,
  loadingSoldTickets,
  soldTicketsError,
  soldTicketsSearchTerm,
  hasSearchResults,
  soldTicketPurchaseCards,
  openingSoldTicketInvoiceId,
  onClose,
  onSearchTermChange,
  onOpenInvoice,
}: EventSoldTicketsModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={eventTitle ? `Tickets vendus - ${eventTitle}` : 'Tickets vendus'}
      size="lg"
    >
      {loadingSoldTickets ? (
        <div className="text-gray-300 text-center py-6">
          <span className="spinner mr-2 align-middle"></span>
          Chargement des tickets vendus...
        </div>
      ) : soldTicketsError ? (
        <div className="rounded-xl border border-red-500/50 bg-red-500/30 p-4 text-red-200">
          {soldTicketsError}
        </div>
      ) : soldTicketPurchaseCards.length === 0 ? (
        <p className="text-gray-300">Aucun ticket vendu pour cet evenement.</p>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Rechercher un ticket vendu</label>
            <input
              type="text"
              value={soldTicketsSearchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white focus:border-thunder-gold focus:outline-none"
              placeholder="Nom ticket, numero, acheteur, nom, email..."
            />
          </div>

          {!hasSearchResults ? (
            <p className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-gray-300">
              Aucun ticket ne correspond a votre recherche.
            </p>
          ) : (
            <div className="max-h-[56vh] overflow-y-auto pr-1">
              <TicketPurchaseCards
                purchases={soldTicketPurchaseCards}
                openingInvoiceId={openingSoldTicketInvoiceId}
                onOpenInvoice={onOpenInvoice}
                emptyMessage="Aucun ticket vendu pour cet evenement."
                emptySearchMessage="Aucun ticket ne correspond a votre recherche."
              />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default EventSoldTicketsModal;