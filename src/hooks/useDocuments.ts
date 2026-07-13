import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface DocumentRow {
  id: string;
  entity_type: "vehicle" | "driver";
  entity_id: string;
  doc_type: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_at: string;
}

const BUCKET = "documents";

export function publicUrl(filePath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

export function useDocuments(entityType: "vehicle" | "driver", entityId: string | null) {
  const [docs, setDocs]       = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!entityId) { setDocs([]); return; }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("documents")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("uploaded_at", { ascending: false });
    if (err) setError(err.message);
    setDocs(data ?? []);
    setLoading(false);
  }, [entityType, entityId]);

  useEffect(() => { refetch(); }, [refetch]);

  async function upload(docType: string, file: File): Promise<DocumentRow> {
    if (!entityId) throw new Error("Nema entiteta");
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const path = `${entityType}/${entityId}/${docType}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (upErr) throw upErr;

    const { data, error: insErr } = await supabase
      .from("documents")
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        doc_type: docType,
        file_path: path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      })
      .select()
      .single();
    if (insErr) {
      await supabase.storage.from(BUCKET).remove([path]);
      throw insErr;
    }

    setDocs(prev => [data, ...prev]);
    return data;
  }

  async function remove(doc: DocumentRow) {
    await supabase.storage.from(BUCKET).remove([doc.file_path]);
    const { error: delErr } = await supabase.from("documents").delete().eq("id", doc.id);
    if (delErr) throw delErr;
    setDocs(prev => prev.filter(d => d.id !== doc.id));
  }

  const byType = (docType: string) => docs.filter(d => d.doc_type === docType);

  return { docs, loading, error, upload, remove, refetch, byType };
}
