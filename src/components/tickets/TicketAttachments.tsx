"use client";

import { useEffect, useState } from "react";
import { Download, Paperclip } from "lucide-react";
import api from "@/lib/api";

interface TicketAttachmentsProps {
  ticketId: number;
}

export default function TicketAttachments({
  ticketId,
}: Readonly<TicketAttachmentsProps>) {
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);

    api
      .get("/attachments", {
        params: { ticketId },
      })
      .then((res) => {
        setAttachments(res.data || []);
        setError(null);
      })
      .catch(() => {
        setAttachments([]);
        setError("Attachments unavailable");
      })
      .finally(() => setLoading(false));
  }, [ticketId]);

  const downloadAttachment = async (attachment: any) => {
    setDownloadingId(attachment.id);
    setError(null);

    try {
      const res = await api.get(`/attachments/${attachment.id}`, {
        responseType: "blob",
      });

      const blob =
        res.data instanceof Blob ? res.data : new Blob([res.data]);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = attachment.fileName || "attachment";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch {
      setError("Unable to download attachment");
    } finally {
      setDownloadingId(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="card overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <Paperclip size={18} className="text-gray-500" />

        <h3 className="text-base font-semibold text-gray-900">
          Attachments
        </h3>

        <span className="text-xs text-gray-400 ml-auto">
          {attachments.length}
        </span>
      </div>

      <div className="p-6">
        {loading && (
          <p className="text-sm text-gray-400">
            Loading attachments...
          </p>
        )}

        {error && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && attachments.length === 0 && (
          <p className="text-sm text-gray-400">
            No attachments for this ticket.
          </p>
        )}

        {!loading && attachments.length > 0 && (
          <div className="space-y-3">
            {attachments.map((attachment: any) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between gap-4 border border-gray-100 rounded-lg p-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Paperclip
                    size={17}
                    className="text-indigo-600 flex-shrink-0"
                  />

                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {attachment.fileName}
                    </p>

                    <p className="text-xs text-gray-400">
                      {formatBytes(attachment.size || 0)}
                      {" • "}
                      {attachment.contentType ||
                        "application/octet-stream"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-secondary text-sm flex-shrink-0"
                  disabled={downloadingId === attachment.id}
                  onClick={() => downloadAttachment(attachment)}
                >
                  <Download size={15} />

                  {downloadingId === attachment.id
                    ? "Downloading..."
                    : "Download"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
