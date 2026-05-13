"use client";

import { useState } from "react";
import { ViewDocumentButton } from "./view-document-button";
import { DocumentReviewForm } from "./document-review-form";

const DOC_STATUS_MAP: Record<string, { label: string; className: string }> = {
  MISSING: { label: "Mancante", className: "bg-red-100 text-red-700" },
  UPLOADED: { label: "Caricato", className: "bg-blue-100 text-blue-700" },
  IN_REVIEW: { label: "In revisione", className: "bg-yellow-100 text-yellow-700" },
  APPROVED: { label: "Approvato", className: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rifiutato", className: "bg-red-100 text-red-700" },
};

interface PracticeDoc {
  id: string; status: string; rejectionReason: string | null; fileName: string | null;
  filePath: string | null; expiresAt: Date | null; version: number;
  documentType: { name: string; slug: string; category: string };
}

export function DocumentChecklist({
  documents,
  isConsultant = false,
}: {
  documents: PracticeDoc[];
  isConsultant?: boolean;
}) {
  const approved = documents.filter((d) => d.status === "APPROVED").length;
  const total = documents.length;
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-2 flex-1 rounded-full bg-gray-200 overflow-hidden">
          <div className="h-full bg-green-500 transition-all" style={{ width: `${total > 0 ? (approved / total) * 100 : 0}%` }} />
        </div>
        <span className="text-sm text-gray-500">{approved}/{total}</span>
      </div>
      <div className="space-y-2">
        {documents.map((doc) => (
          <ChecklistItem key={`${doc.id}-${doc.status}`} doc={doc} isConsultant={isConsultant} />
        ))}
      </div>
    </div>
  );
}

function ChecklistItem({ doc, isConsultant }: { doc: PracticeDoc; isConsultant: boolean }) {
  const config = DOC_STATUS_MAP[doc.status] || DOC_STATUS_MAP.MISSING;
  const isExpiringSoon = doc.expiresAt && new Date(doc.expiresAt).getTime() - Date.now() < 30 * 86400000;
  const canFlip = isConsultant && doc.filePath && (doc.status === "APPROVED" || doc.status === "REJECTED");
  const [showFlip, setShowFlip] = useState(false);

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">{doc.documentType.name}</p>
          {doc.fileName && <p className="text-xs text-gray-500">{doc.fileName} (v{doc.version})</p>}
          {doc.rejectionReason && <p className="text-xs text-red-600 mt-1">Motivo: {doc.rejectionReason}</p>}
          {isExpiringSoon && doc.expiresAt && <p className="text-xs text-amber-600 mt-1">Scade il {new Date(doc.expiresAt).toLocaleDateString("it-IT")}</p>}
        </div>
        <div className="flex items-center gap-3">
          {doc.filePath && <ViewDocumentButton docId={doc.id} />}
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${config.className}`}>{config.label}</span>
          {canFlip && (
            <button
              type="button"
              onClick={() => setShowFlip((v) => !v)}
              className="text-xs text-blue-600 hover:underline"
            >
              {showFlip ? "Annulla" : "Cambia decisione"}
            </button>
          )}
        </div>
      </div>
      {canFlip && showFlip && (
        <div className="mt-3 border-t pt-3">
          <DocumentReviewForm docId={doc.id} />
        </div>
      )}
    </div>
  );
}
