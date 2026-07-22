export type MessageParticipant = {
  id: string;
  pseudo: string;
  avatarUrl: string | null;
};

export type ConversationType = 'direct' | 'group';

export type ConversationParticipant = MessageParticipant & {
  role: 'admin' | 'member';
};

export type Message = {
  id: string;
  conversationId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
  sender: MessageParticipant;
};

export type Conversation = {
  id: string;
  type: ConversationType;
  title: string | null;
  /** L'autre membre d'un direct ; `null` pour un groupe. */
  otherParticipant: MessageParticipant | null;
  participants: ConversationParticipant[];
  lastMessage: { content: string; createdAt: string; senderId: string } | null;
  unreadCount: number;
  updatedAt: string;
};

/** Notification `conversation:read` reçue en temps réel. */
export type ReadReceipt = {
  conversationId: string;
  readerId: string;
};
