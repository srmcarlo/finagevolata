"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadDocument } from "@/lib/actions/documents";

interface DocToUpload {
  id: string;
  status: string;
  rejectionReason: string | null;
  documentType: {
    name: string;
    slug: string;
    acceptedFormats: string[];
    maxSizeMb: number;
  };
}

export function DocumentUploadSection({ documents, practiceId }: { documents: DocToUpload[]; practiceId: string }) {
  const router = useRouter();
  const [uploading, setUploading] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successes, setSuccesses] = useState<Record<string, boolean>>({});

  async function handleUpload(docId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(docId);
    setErrors((prev) => ({ ...prev, [docId]: "" }));

    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadDocument(docId, formData);

    setUploading(null);

    if (result.error) {
      setErrors((prev) => ({ ...prev, [docId]: result.error! }));
    } else {
      setSuccesses((prev) => ({ ...prev, [docId]: true }));
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => {
        const accept = doc.documentType.acceptedFormats.map((f) => `.${f}`).join(",");
        return (
          <div key={doc.id} className="rounded-lg border border-amber-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{doc.documentType.name}</p>
                {doc.status === "REJECTED" && doc.rejectionReason && (
                  <p className="text-xs text-red-600 mt-1">Motivo rifiuto: {doc.rejectionReason}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Formati: {doc.documentType.acceptedFormats.join(", ")} — Max: {doc.documentType.maxSizeMb}MB
                </p>
              </div>
              <div className="ml-4">
                {successes[doc.id] ? (
                  <span className="text-sm text-green-600 font-medium">Caricato!</span>
                ) : (
                  <label className="flex cursor-pointer items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition">
                    {uploading === doc.id ? "Caricamento..." : "Carica"}
                    <input
                      type="file"
                      className="hidden"
                      accept={accept}
                      onChange={(e) => handleUpload(doc.id, e)}
                      disabled={uploading === doc.id}
                    />
                  </label>
                )}
              </div>
            </div>
            {errors[doc.id] && <p className="text-xs text-red-600 mt-2">{errors[doc.id]}</p>}
          </div>
        );
      })}
    </div>
  );
}
