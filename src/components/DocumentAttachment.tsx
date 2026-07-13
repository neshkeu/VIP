import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, Trash2, Loader2, FileText, Image as ImageIcon, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useDocuments, publicUrl, type DocumentRow } from "@/hooks/useDocuments";

interface Props {
  entityType: "vehicle" | "driver";
  entityId: string;
  docType: string;
  label?: string;
}

function iconFor(doc: DocumentRow) {
  if (doc.mime_type?.startsWith("image/")) return ImageIcon;
  return FileText;
}

export function DocumentAttachment({ entityType, entityId, docType, label }: Props) {
  const { byType, upload, remove, loading } = useDocuments(entityType, entityId);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const items = byType(docType);

  const onPick = () => fileRef.current?.click();
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Fajl je prevelik (max 20MB)");
      return;
    }
    setUploading(true);
    try {
      await upload(docType, file);
      toast.success("Dokument dodat");
    } catch (err) {
      toast.error("Greška: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onDelete = async (doc: DocumentRow) => {
    if (!confirm(`Obrisati "${doc.file_name}"?`)) return;
    try {
      await remove(doc);
      toast.success("Obrisano");
    } catch (err) {
      toast.error("Greška: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs"
            onClick={onPick}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
            <span className="ml-1">Dodaj</span>
          </Button>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={onFile}
        className="hidden"
      />
      {loading ? (
        <div className="text-xs text-muted-foreground italic">Učitavam...</div>
      ) : items.length === 0 ? (
        <div className="text-xs text-muted-foreground italic">Nema priloga</div>
      ) : (
        <div className="space-y-1">
          {items.map(doc => {
            const Icon = iconFor(doc);
            return (
              <div key={doc.id} className="flex items-center gap-2 rounded-md border bg-muted/20 px-2 py-1.5">
                <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <a
                  href={publicUrl(doc.file_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline truncate flex-1"
                  title={doc.file_name}
                >
                  {doc.file_name}
                </a>
                <a
                  href={publicUrl(doc.file_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                  title="Otvori"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
                <button
                  onClick={() => onDelete(doc)}
                  className="text-muted-foreground hover:text-destructive"
                  title="Obriši"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
