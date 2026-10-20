import React, { useState } from 'react';
import { Announcement } from '../../types';
import { Megaphone, Plus, Trash2, Eye, EyeOff, Globe, Lock, Users } from 'lucide-react';
import { createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../../lib/dbHelpers';

export interface AnnouncementsTabProps {
  announcements: Announcement[];
  onRefresh?: () => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onToggleActive?: (id: string, isActive: boolean) => void;
  onDelete?: (id: string) => void;
}

export default function AnnouncementsTab({
  announcements,
  onRefresh,
  addToast,
  onToggleActive,
  onDelete,
}: AnnouncementsTabProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [scope, setScope] = useState<Announcement['scope']>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      addToast('Please provide both title and content.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await createAnnouncement({
        title: title.trim(),
        content: content.trim(),
        scope,
        isActive: true,
      });
      addToast('Announcement published successfully!', 'success');
      setTitle('');
      setContent('');
      setIsCreating(false);
      onRefresh?.();
    } catch {
      addToast('Failed to publish announcement.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (ann: Announcement) => {
    try {
      if (onToggleActive) {
        onToggleActive(ann.id, !ann.isActive);
      } else {
        await updateAnnouncement(ann.id, { is_active: !ann.isActive });
      }
      addToast(`Announcement ${ann.isActive ? 'hidden' : 'activated'}.`, 'success');
      onRefresh?.();
    } catch {
      addToast('Failed to update status.', 'error');
    }
  };

  const handleDelete = async (ann: Announcement) => {
    if (!window.confirm?.(`Delete announcement "${ann.title}"?`)) {
      return;
    }
    try {
      if (onDelete) {
        onDelete(ann.id);
      } else {
        await deleteAnnouncement(ann.id);
      }
      addToast('Announcement removed.', 'success');
      onRefresh?.();
    } catch {
      addToast('Failed to remove announcement.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-[#E0E7E0]">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#008751]" />
            <h3 className="text-lg font-bold text-[#1A1A1A]">System Bulletins & Announcements</h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Publish notices to all visitors, traders only, or broadcast system-wide updates.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreating(!isCreating)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#008751] text-white text-xs font-bold rounded-xl hover:bg-[#007043] transition"
        >
          <Plus className="w-4 h-4" />
          {isCreating ? 'Cancel' : 'New Notice'}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="bg-white p-6 rounded-2xl border border-[#008751]/30 shadow-sm space-y-4">
          <h4 className="font-bold text-sm text-[#1A1A1A]">Compose New Announcement</h4>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Scheduled Network Maintenance"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:border-[#008751]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Target Audience</label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as any)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:border-[#008751]"
            >
              <option value="all">System-wide (All Visitors & Traders)</option>
              <option value="public">Public Landing Page Only</option>
              <option value="private">Logged-in Traders Only</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Content</label>
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write the full announcement text here..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:border-[#008751]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-white bg-[#008751] rounded-xl hover:bg-[#007043] disabled:opacity-50"
            >
              {isSubmitting ? 'Publishing...' : 'Publish Announcement'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {announcements.length === 0 ? (
          <div className="py-12 text-center text-gray-500 bg-white rounded-2xl border border-dashed border-gray-300">
            No announcements found.
          </div>
        ) : (
          announcements.map((ann) => (
            <div
              key={ann.id}
              className={`bg-white p-5 rounded-2xl border transition ${
                ann.isActive ? 'border-[#E0E7E0]' : 'border-gray-200 bg-gray-50/70 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                        ann.scope === 'all'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : ann.scope === 'public'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {ann.scope === 'all' && <Users className="w-3 h-3" />}
                      {ann.scope === 'public' && <Globe className="w-3 h-3" />}
                      {ann.scope === 'private' && <Lock className="w-3 h-3" />}
                      {ann.scope.toUpperCase()}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        ann.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {ann.isActive ? 'Active' : 'Archived'}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-[#1A1A1A]">{ann.title}</h4>
                  <p className="text-xs text-gray-600 whitespace-pre-wrap">{ann.content}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(ann)}
                    className="p-1.5 text-gray-500 hover:text-emerald-700 rounded-lg hover:bg-gray-100 transition"
                    title={ann.isActive ? 'Archive announcement' : 'Activate announcement'}
                  >
                    {ann.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(ann)}
                    className="p-1.5 text-gray-500 hover:text-rose-600 rounded-lg hover:bg-gray-100 transition"
                    title="Delete notice"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
