import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle2, Clock, XCircle, Trash2 } from "lucide-react";

export const Route = createFileRoute("/portal/investor/kyc")({
  head: () => ({
    meta: [
      { title: "KYC Verification — Hudson Crest Capital" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: KycPage,
});

const DOC_TYPES = [
  { value: "passport", label: "Passport" },
  { value: "drivers_license", label: "Driver's License" },
  { value: "national_id", label: "National ID" },
  { value: "proof_of_address", label: "Proof of Address" },
  { value: "tax_form", label: "Tax Form (W-8/W-9)" },
  { value: "selfie", label: "Selfie / Liveness" },
  { value: "other", label: "Other" },
] as const;

const ACCEPTED = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
const MAX_BYTES = 10 * 1024 * 1024;

const fileSchema = z.object({
  docType: z.enum([
    "passport",
    "drivers_license",
    "national_id",
    "proof_of_address",
    "tax_form",
    "selfie",
    "other",
  ]),
  file: z
    .instanceof(File)
    .refine((f) => f.size > 0, "File is empty")
    .refine((f) => f.size <= MAX_BYTES, "File must be under 10 MB")
    .refine((f) => ACCEPTED.includes(f.type), "Unsupported file type"),
});

type DocRow = {
  id: string;
  doc_type: string;
  status: string;
  storage_path: string;
  submitted_at: string;
  review_notes: string | null;
};

function statusBadge(status: string) {
  const map: Record<string, { tone: string; icon: React.ReactNode; label: string }> = {
    pending: {
      tone: "bg-amber-500/15 text-amber-600 border-amber-500/30",
      icon: <Clock className="h-3 w-3" />,
      label: "Pending review",
    },
    approved: {
      tone: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
      icon: <CheckCircle2 className="h-3 w-3" />,
      label: "Approved",
    },
    rejected: {
      tone: "bg-destructive/15 text-destructive border-destructive/30",
      icon: <XCircle className="h-3 w-3" />,
      label: "Rejected",
    },
    expired: {
      tone: "bg-muted text-muted-foreground border-border",
      icon: <XCircle className="h-3 w-3" />,
      label: "Expired",
    },
  };
  const s = map[status] ?? map.pending;
  return (
    <Badge variant="outline" className={`gap-1 ${s.tone}`}>
      {s.icon}
      {s.label}
    </Badge>
  );
}

function KycPage() {
  const [docType, setDocType] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const isPdf = file?.type === "application/pdf";
  const docLabel = useMemo(
    () => DOC_TYPES.find((d) => d.value === docType)?.label ?? "",
    [docType],
  );

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function loadDocs() {
    setLoading(true);
    const { data, error } = await supabase
      .from("kyc_documents")
      .select("id, doc_type, status, storage_path, submitted_at, review_notes")
      .order("submitted_at", { ascending: false });
    if (error) toast.error("Failed to load documents");
    setDocs((data as DocRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadDocs();
  }, []);

  function pickFile(f: File | null) {
    if (!f) {
      setFile(null);
      return;
    }
    if (!ACCEPTED.includes(f.type)) {
      toast.error("Unsupported file type. Use PDF, JPEG, PNG, WebP, or HEIC.");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("File must be under 10 MB.");
      return;
    }
    setFile(f);
  }

  async function handleUpload() {
    const parsed = fileSchema.safeParse({ docType, file });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes.user) {
      toast.error("You must be signed in.");
      return;
    }
    const user = userRes.user;
    const ext = parsed.data.file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const path = `${user.id}/${parsed.data.docType}-${Date.now()}.${ext}`;

    setUploading(true);
    setProgress(15);
    const { error: upErr } = await supabase.storage
      .from("kyc-documents")
      .upload(path, parsed.data.file, {
        cacheControl: "3600",
        upsert: false,
        contentType: parsed.data.file.type,
      });
    if (upErr) {
      setUploading(false);
      setProgress(0);
      toast.error(`Upload failed: ${upErr.message}`);
      return;
    }
    setProgress(75);

    const { error: insErr } = await supabase.from("kyc_documents").insert({
      user_id: user.id,
      doc_type: parsed.data.docType as never,
      storage_path: path,
      status: "pending" as never,
    });
    if (insErr) {
      // best-effort cleanup
      await supabase.storage.from("kyc-documents").remove([path]);
      setUploading(false);
      setProgress(0);
      toast.error(`Could not record document: ${insErr.message}`);
      return;
    }

    setProgress(100);
    toast.success("Document uploaded for review");
    setFile(null);
    setDocType("");
    if (inputRef.current) inputRef.current.value = "";
    setTimeout(() => setProgress(0), 600);
    setUploading(false);
    loadDocs();
  }

  async function handleDelete(doc: DocRow) {
    if (doc.status === "approved") {
      toast.error("Approved documents cannot be removed.");
      return;
    }
    const { error: storageErr } = await supabase.storage
      .from("kyc-documents")
      .remove([doc.storage_path]);
    if (storageErr) toast.error(storageErr.message);
    // RLS prevents user delete on kyc_documents — leave row, admins can prune.
    toast.message("File removed from storage. Record kept for audit.");
    loadDocs();
  }

  async function viewDoc(doc: DocRow) {
    const { data, error } = await supabase.storage
      .from("kyc-documents")
      .createSignedUrl(doc.storage_path, 60);
    if (error || !data) {
      toast.error("Could not open file");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Identity Verification</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Upload required documents to verify your identity. Files are encrypted and only visible to
          you and our compliance team.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Upload a document</CardTitle>
          <CardDescription>PDF, JPEG, PNG, WebP, or HEIC — up to 10 MB.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="doc-type">Document type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger id="doc-type">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-file">File</Label>
              <input
                ref={inputRef}
                id="doc-file"
                type="file"
                accept={ACCEPTED.join(",")}
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>
          </div>

          {file && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                >
                  Remove
                </Button>
              </div>
              {previewUrl && (
                <div className="mt-3 overflow-hidden rounded-md border bg-background">
                  {isPdf ? (
                    <iframe src={previewUrl} title="PDF preview" className="h-72 w-full" />
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Document preview"
                      className="max-h-72 w-full object-contain"
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {progress > 0 && (
            <div className="space-y-1">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">
                {progress < 100 ? "Uploading…" : "Done"}
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button onClick={handleUpload} disabled={uploading || !file || !docType}>
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Uploading…" : `Submit ${docLabel || "document"}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submitted documents</CardTitle>
          <CardDescription>
            Track the review status of each document you’ve uploaded.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents submitted yet.</p>
          ) : (
            <ul className="divide-y">
              {docs.map((d) => {
                const label = DOC_TYPES.find((t) => t.value === d.doc_type)?.label ?? d.doc_type;
                return (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{label}</span>
                        {statusBadge(d.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Submitted {new Date(d.submitted_at).toLocaleString()}
                      </p>
                      {d.review_notes && (
                        <p className="text-xs text-destructive mt-1">Notes: {d.review_notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => viewDoc(d)}>
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(d)}
                        disabled={d.status === "approved"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
