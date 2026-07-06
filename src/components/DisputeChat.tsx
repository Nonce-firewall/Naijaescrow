import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DisputeMessage } from '../types';
import { formatNGT } from '../lib/dateUtils';

function rowToDisputeMessage(row: any): DisputeMessage {
  return {
    id: row.id,
    disputeId: row.dispute_id,
    senderId: row.sender_id,
    senderEmail: row.sender_email,
    senderRole: row.sender_role,
    message: row.message,
    createdAt: row.created_at,
  };
}

interface DisputeChatProps {
  disputeId: string;
  currentUserId: string;
  currentUserEmail: string;
  currentUserRole: 'user' | 'admin';
  /** Whether the dispute is still open (controls input visibility) */
  isOpen: boolean;
  /** Called after the user successfully sends a message */
  onMessageSent?: () => void;
  /** Extra classes applied to the outer wrapper */
  className?: string;
}

export default function DisputeChat({
  disputeId,
  currentUserId,
  currentUserEmail,
  currentUserRole,
  isOpen,
  onMessageSent,
  className = '',
}: DisputeChatProps) {
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isAdmin = currentUserRole === 'admin';

  // Load + realtime subscription
  useEffect(() => {
    if (!disputeId) return;
    setLoading(true);

    supabase
      .from('dispute_messages')
      .select('*')
      .eq('dispute_id', disputeId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages(data ? data.map(rowToDisputeMessage) : []);
        setLoading(false);
      });

    const channel = supabase
      .channel(`dispute-chat-${disputeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dispute_messages',
          filter: `dispute_id=eq.${disputeId}`,
        },
        (payload) => {
          setMessages((prev) => {
            // Deduplicate in case the sender already optimistically added it
            const incoming = rowToDisputeMessage(payload.new);
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [disputeId]);

  // Auto-scroll whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending) return;
    setSendError('');
    setIsSending(true);
    setInput('');

    try {
      // Use .select().single() so we get the authoritative DB row (real UUID, server timestamp).
      // The realtime subscription will also fire — deduplicate by ID in the subscriber.
      const { data, error } = await supabase
        .from('dispute_messages')
        .insert({
          dispute_id: disputeId,
          sender_id: currentUserId,
          sender_email: currentUserEmail,
          sender_role: currentUserRole,
          message: text,
          created_at: Date.now(),
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Immediately add the confirmed row; realtime will also fire but
      // the dedup logic in the subscriber (checking existing IDs) prevents duplicates.
      if (data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, rowToDisputeMessage(data)];
        });
      }
      onMessageSent?.();
    } catch (err: any) {
      // Restore input so user can retry
      setInput(text);
      setSendError('Failed to send — please try again.');
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }, [input, isSending, disputeId, currentUserId, currentUserEmail, currentUserRole, onMessageSent]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Message thread */}
      <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto pr-0.5 scroll-smooth">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-[10px] text-slate-400 py-5 font-mono">
            No messages yet — start the conversation below.
          </p>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isMine = msg.senderId === currentUserId;
              const isAdminMsg = msg.senderRole === 'admin';
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed break-words shadow-sm ${
                      isMine
                        ? isAdmin
                          ? 'bg-[#008751] text-white rounded-br-sm'
                          : 'bg-[#1A1A1A] text-white rounded-br-sm'
                        : isAdminMsg
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-bl-sm'
                          : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                    }`}
                  >
                    {msg.message}
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono mt-0.5 px-1 select-none">
                    {isAdminMsg ? '🛡 Admin' : msg.senderEmail.split('@')[0]}
                    {' · '}
                    {formatNGT(msg.createdAt)}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Send error */}
      {sendError && (
        <p className="text-[10px] text-rose-500 font-mono">{sendError}</p>
      )}

      {/* Input row — only when dispute is open */}
      {isOpen && (
        <div className="flex gap-2 mt-1">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
            maxLength={2000}
            disabled={isSending}
            className="flex-1 min-w-0 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#008751] bg-white disabled:opacity-60 transition"
          />
          <button
            onClick={handleSend}
            disabled={isSending || !input.trim()}
            title="Send message"
            className="shrink-0 bg-[#008751] hover:bg-[#007043] disabled:opacity-40 text-white px-3 py-2 rounded-xl transition cursor-pointer flex items-center justify-center"
          >
            {isSending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      )}

      {!isOpen && messages.length > 0 && (
        <p className="text-[9px] text-slate-400 font-mono text-center pt-1">
          This dispute has been resolved — thread is read-only.
        </p>
      )}
    </div>
  );
}
