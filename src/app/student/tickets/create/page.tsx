"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Send, X, AlertCircle, Paperclip } from "lucide-react";

export default function CreateTicketPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (attachment && attachment.size > 10 * 1024 * 1024) {
      setError("Attachment must be 10 MB or smaller");
      return;
    }

    setLoading(true);

    try {
      const ticketResponse = await api.post("/tickets", {
        title,
        description,
        priority,
      });

      const ticketId = ticketResponse.data?.id;

      if (!ticketId) {
        throw new Error("Ticket was created but no ticket ID was returned");
      }

      if (attachment) {
        const formData = new FormData();
        formData.append("ticketId", String(ticketId));
        formData.append("file", attachment);

        await api.post("/attachments", formData);
      }

      router.push("/student/dashboard?created=true");
    } catch (err: any) {
      setError(err.response?.data?.message || "Unable to create ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      pageTitle="Create Ticket"
      subtitle="Submit a new support request"
    >
      <div className="max-w-2xl mx-auto">
        <div className="card p-6 lg:p-8">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-6">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label className="input-label">Title</label>
              <input
                className="input"
                placeholder="Brief summary of the issue"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="input-label">Description</label>
              <textarea
                className="input min-h-[140px] resize-none"
                placeholder="Describe the problem in detail..."
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {/* Priority */}
            <div>
              <label className="input-label">Priority</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "LOW", label: "Low", color: "emerald" },
                  { value: "MEDIUM", label: "Medium", color: "amber" },
                  { value: "HIGH", label: "High", color: "red" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPriority(opt.value)}
                    className={`
                      px-4 py-2.5 rounded-lg border text-sm font-medium transition-all
                      ${priority === opt.value
                        ? opt.color === "emerald"
                          ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                          : opt.color === "amber"
                            ? "bg-amber-50 border-amber-300 text-amber-700"
                            : "bg-red-50 border-red-300 text-red-700"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      }
                    `}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="input-label">Category</label>
              <select className="input">
                <option value="">Select a category (optional)</option>
                <option value="technical">Technical Issue</option>
                <option value="access">Access / Login Issue</option>
                <option value="course">Course Content</option>
                <option value="billing">Billing / Payment</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Attachment */}
            <div>
              <p className="input-label">Attachment (optional)</p>

              <label className="flex items-center gap-3 border border-dashed border-gray-300 rounded-lg px-4 py-4 cursor-pointer hover:bg-gray-50">
                <Paperclip size={18} className="text-gray-500" />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700">
                    {attachment ? attachment.name : "Choose a file"}
                  </p>
                  <p className="text-xs text-gray-400">
                    Maximum file size: 10 MB
                  </p>
                </div>

                <input
                  type="file"
                  className="hidden"
                  onChange={(e) =>
                    setAttachment(e.target.files?.[0] || null)
                  }
                />
              </label>

              {attachment && (
                <button
                  type="button"
                  className="text-xs text-red-500 mt-2"
                  onClick={() => setAttachment(null)}
                >
                  Remove attachment
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Create Ticket
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => router.push("/student/dashboard")}
                disabled={loading}
              >
                <X size={16} />
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
