import Modal from './Modal';
import SubscriptionDetailsContent from './SubscriptionDetailsContent';
import type { User } from '../types/AuthTypes';
import type { SubscriptionType } from '../types/SubscriptionTypes';

type ActionMessage = {
  type: 'success' | 'error';
  text: string;
};

interface UserSubscriptionDetailsModalProps {
  isOpen: boolean;
  user: User | null;
  subscriptions: SubscriptionType[];
  loading: boolean;
  error: string | null;
  actionMessage: ActionMessage | null;
  openingInvoiceId: string | null;
  cancelingSubscriptionId: string | null;
  onClose: () => void;
  onOpenInvoice: (stripeInvoiceId: string) => void;
  onCancelSubscription: (stripeSubscriptionId: string) => void;
}

const UserSubscriptionDetailsModal = ({
  isOpen,
  user,
  subscriptions,
  loading,
  error,
  actionMessage,
  openingInvoiceId,
  cancelingSubscriptionId,
  onClose,
  onOpenInvoice,
  onCancelSubscription,
}: UserSubscriptionDetailsModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        user
          ? `Transactions de ${user.firstName || user.email}`
          : 'Transactions utilisateur'
      }
      size="lg"
    >
      <SubscriptionDetailsContent
        subscriptions={subscriptions}
        loading={loading}
        error={error}
        actionMessage={actionMessage}
        openingInvoiceId={openingInvoiceId}
        cancelingSubscriptionId={cancelingSubscriptionId}
        onOpenInvoice={onOpenInvoice}
        onCancelSubscription={onCancelSubscription}
        loadingLabel="Chargement des transactions..."
        activeEmptyLabel="Aucun abonnement actif pour cet utilisateur."
        transactionsEmptyLabel="Aucune transaction disponible pour cet utilisateur."
        canceledEmptyLabel="Aucun abonnement annulé pour le moment."
      />
    </Modal>
  );
};

export default UserSubscriptionDetailsModal;