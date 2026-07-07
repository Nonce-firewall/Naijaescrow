import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Loader2, ShieldCheck, CheckCircle2, Paperclip } from 'lucide-react';
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

  // ── Integrated context props ──────────────────────────────
  /** The user's original dispute description (shown as first bubble) */
  initialMessage?: string;
  initialMessageAt?: number;
  /** Email of the person who filed the dispute */
  initialMessageEmail?: string;
  /** Legal / display name of the person who filed the dispute (overrides email prefix) */
  initialMessageDisplayName?: string;
  /** Evidence image URLs attached to the dispute */
  evidenceUrls?: string[];
  /** Admin's final resolution note (shown as system event at thread end) */
  adminResponse?: string;
  resolvedAt?: number;
  /** Called when user clicks an evidence thumbnail */
  onEvidenceClick?: (url: string) => void;
  /** Legal / display name for the current user's own message labels */
  currentUserDisplayName?: string;
}

export default function DisputeChat({
  disputeId,
  currentUserId,
  currentUserEmail,
  currentUserRole,
  isOpen,
  onMessageSent,
  className = '',
  initialMessage,
  initialMessageAt,
  initialMessageEmail,
  initialMessageDisplayName,
  evidenceUrls,
  adminResponse,
  resolvedAt,
  onEvidenceClick,
  currentUserDisplayName,
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
  }, [messages, adminResponse]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending) return;
    setSendError('');
    setIsSending(true);
    setInput('');

    try {
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

      if (data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, rowToDisputeMessage(data)];
        });
      }
      onMessageSent?.();
    } catch (err: any) {
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

  /** Avatar for a given sender */
  function Avatar({ role, email, size = 'sm' }: { role: 'user' | 'admin'; email: string; size?: 'sm' | 'xs' }) {
    const dim = size === 'xs' ? 'w-6 h-6 text-[9px]' : 'w-8 h-8 text-[10px]';
    if (role === 'admin') {
      return (
        <div className={`${dim} rounded-full bg-[#008751] flex items-center justify-center shrink-0`}>
          <ShieldCheck className={size === 'xs' ? 'w-3 h-3 text-white' : 'w-3.5 h-3.5 text-white'} />
        </div>
      );
    }
    const initial = (email || 'U')[0].toUpperCase();
    return (
      <div className={`${dim} rounded-full bg-slate-300 flex items-center justify-center shrink-0 font-bold text-slate-600`}>
        {initial}
      </div>
    );
  }

  /** Single chat bubble */
  function Bubble({
    msg,
    showAvatar,
    isLastInGroup,
  }: {
    msg: DisputeMessage;
    showAvatar: boolean;
    isLastInGroup: boolean;
  }) {
    const isMine = msg.senderId === currentUserId;
    const isAdminMsg = msg.senderRole === 'admin';
    const displayName = isAdminMsg
      ? 'Admin'
      : isMine
        ? (currentUserDisplayName || (msg.senderEmail || '').split('@')[0])
        : (msg.senderEmail || '').split('@')[0];

    return (
      <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar — only on last message in a group */}
        <div className="w-8 shrink-0">
          {isLastInGroup && showAvatar && (
            <Avatar role={msg.senderRole} email={msg.senderEmail} />
          )}
        </div>

        <div className={`flex flex-col gap-0.5 max-w-[75%] ${isMine ? 'items-end' : 'items-start'}`}>
          <div
            className={`px-3.5 py-2.5 text-[13px] leading-relaxed break-words shadow-sm ${
              isMine
                ? isAdmin
                  ? 'bg-[#008751] text-white rounded-3xl rounded-br-md'
                  : 'bg-[#1A1A1A] text-white rounded-3xl rounded-br-md'
                : isAdminMsg
                  ? 'bg-white border border-[#008751]/25 text-slate-800 rounded-3xl rounded-bl-md shadow-[0_1px_4px_rgba(0,135,81,0.08)]'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-3xl rounded-bl-md shadow-sm'
            }`}
          >
            {msg.message}
          </div>

          {/* Timestamp + name — only on last in group */}
          {isLastInGroup && (
            <span className={`text-[10px] text-slate-400 font-mono px-1 ${isMine ? 'text-right' : 'text-left'}`}>
              {isAdminMsg && <ShieldCheck className="inline w-2.5 h-2.5 mr-0.5 text-[#008751] mb-px" />}
              {displayName} · {formatNGT(msg.createdAt)}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Group consecutive messages from the same sender
  type MessageGroup = { senderId: string; messages: DisputeMessage[] };
  const groups: MessageGroup[] = [];
  for (const msg of messages) {
    const last = groups[groups.length - 1];
    if (last && last.senderId === msg.senderId) {
      last.messages.push(msg);
    } else {
      groups.push({ senderId: msg.senderId, messages: [msg] });
    }
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* ── Chat window ─────────────────────────────────────── */}
      <div className="flex flex-col gap-1 min-h-[220px] max-h-[420px] overflow-y-auto px-3 py-3 scroll-smooth bg-[#F6F8F6] rounded-2xl border border-[#E0E7E0]">

        {/* Initial dispute message as first bubble */}
        {initialMessage && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-1.5 mb-1"
          >
            {/* Date pill */}
            {initialMessageAt && (
              <div className="flex justify-center">
                <span className="text-[10px] text-slate-400 font-mono bg-white border border-slate-200 rounded-full px-2.5 py-0.5 shadow-sm">
                  {formatNGT(initialMessageAt)}
                </span>
              </div>
            )}
            {/* Bubble — always on the right (it's the user who filed) */}
            <div className={`flex items-end gap-2 ${isAdmin ? 'flex-row' : 'flex-row-reverse'}`}>
              <div className="w-8 shrink-0">
                <Avatar role="user" email={initialMessageEmail || currentUserEmail} />
              </div>
              <div className={`flex flex-col gap-0.5 max-w-[75%] ${isAdmin ? 'items-start' : 'items-end'}`}>
                <div className="relative px-3.5 py-2.5 text-[13px] leading-relaxed break-words bg-[#1A1A1A] text-white rounded-3xl rounded-br-md shadow-sm">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-white/50 mb-1">📌 Initial dispute</span>
                  {initialMessage}
                </div>
                <span className="text-[10px] text-slate-400 font-mono px-1 text-right">
                  {initialMessageDisplayName || (initialMessageEmail || currentUserEmail).split('@')[0]} · {initialMessageAt ? formatNGT(initialMessageAt) : ''}
                </span>
              </div>
            </div>

            {/* Evidence thumbnails — shown as an attachment strip */}
            {evidenceUrls && evidenceUrls.length > 0 && (
              <div className={`flex gap-2 flex-wrap ml-10 ${isAdmin ? '' : 'justify-end mr-10'}`}>
                {evidenceUrls.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onEvidenceClick?.(url)}
                    className="relative group cursor-pointer"
                  >
                    <img
                      src={url}
                      alt={`Evidence ${idx + 1}`}
                      className="w-20 h-20 object-cover rounded-2xl border-2 border-white shadow-md group-hover:opacity-85 transition"
                    />
                    <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center">
                      <Paperclip className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition drop-shadow" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Message separator if there are chat messages */}
        {(initialMessage && messages.length > 0) && (
          <div className="flex items-center gap-2 my-1">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider shrink-0">conversation</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && messages.length === 0 && !initialMessage && (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
              <Send className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-[11px] text-slate-400 font-mono">No messages yet — start the conversation.</p>
          </div>
        )}

        {/* Grouped messages */}
        {!loading && (
          <AnimatePresence initial={false}>
            {groups.map((group, gi) =>
              group.messages.map((msg, mi) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className={mi === 0 && gi > 0 ? 'mt-2' : mi === 0 ? '' : ''}
                >
                  <Bubble
                    msg={msg}
                    showAvatar={true}
                    isLastInGroup={mi === group.messages.length - 1}
                  />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        )}

        {/* Resolution system event — always at the very bottom of the thread */}
        {adminResponse && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center gap-2 mt-3"
          >
            <div className="flex items-center gap-2 w-full">
              <div className="flex-1 h-px bg-emerald-200" />
              <CheckCircle2 className="w-3.5 h-3.5 text-[#008751] shrink-0" />
              <div className="flex-1 h-px bg-emerald-200" />
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 max-w-[85%] text-center shadow-sm">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-[#008751] mb-1">
                ✓ Dispute Resolved · {resolvedAt ? formatNGT(resolvedAt) : ''}
              </span>
              <p className="text-[12px] text-emerald-900 leading-relaxed">{adminResponse}</p>
            </div>
          </motion.div>
        )}

        {/* Read-only notice when resolved without a resolution note */}
        {!isOpen && !adminResponse && messages.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[9px] text-slate-400 font-mono shrink-0">Resolved · thread closed</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Send error */}
      {sendError && (
        <p className="text-[10px] text-rose-500 font-mono mt-1 px-1">{sendError}</p>
      )}

      {/* Input row — only when open */}
      {isOpen && (
        <div className="flex gap-2 mt-2">
          {/* Self-avatar */}
          <div className="shrink-0 self-end mb-0.5">
            <Avatar role={currentUserRole} email={currentUserEmail} size="xs" />
          </div>
          <div className="flex-1 flex gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-2 shadow-sm focus-within:border-[#008751] focus-within:ring-1 focus-within:ring-[#008751]/20 transition">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message…"
              maxLength={2000}
              disabled={isSending}
              className="flex-1 min-w-0 text-[13px] focus:outline-none bg-transparent disabled:opacity-60 placeholder:text-slate-400"
            />
            <button
              onClick={handleSend}
              disabled={isSending || !input.trim()}
              title="Send (Enter)"
              className="shrink-0 bg-[#008751] hover:bg-[#007043] disabled:opacity-35 text-white w-8 h-8 rounded-xl transition cursor-pointer flex items-center justify-center self-center"
            >
              {isSending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Closed input placeholder */}
      {!isOpen && (
        <div className="flex items-center justify-center gap-2 mt-2 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#008751]" />
          <span className="text-[11px] text-slate-500 font-mono">This dispute is resolved — thread is read-only</span>
        </div>
      )}
    </div>
  );
}
