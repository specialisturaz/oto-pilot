"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Upload,
  FolderOpen,
  FileText,
  File,
  Download,
  Eye,
  Trash2,
  MoreHorizontal,
  CheckSquare,
  Square,
  FolderIcon,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

interface Document {
  id: string;
  name?: string;
  fileName?: string;
  type?: string;
  fileType?: string;
  folder?: string;
  category?: string;
  related_to?: string;
  relatedTo?: string;
  upload_date?: string;
  createdAt?: string;
  size?: string;
  fileSize?: number;
  uploaded_by?: string;
  uploadedBy?: string;
  fileUrl?: string;
  url?: string;
}

interface FolderDef {
  id: string;
  label: string;
  count: number;
  icon: typeof FileText;
}

// Fallback mock data
const fallbackDocuments: Document[] = [
  { id: "1", name: "Kadikoy_3+1_Tapu_Senedi.pdf", type: "PDF", folder: "tapu", related_to: "Kadikoy 3+1 Daire", upload_date: "25 Mart 2026", size: "2.4 MB", uploaded_by: "Mehmet Danisman" },
  { id: "2", name: "Besiktas_Villa_Iskan.pdf", type: "PDF", folder: "iskan", related_to: "Besiktas Villa", upload_date: "22 Mart 2026", size: "1.8 MB", uploaded_by: "Ayse Danisman" },
  { id: "3", name: "DASK_Atasehir_Residence.pdf", type: "PDF", folder: "dask", related_to: "Atasehir Residence 2+1", upload_date: "20 Mart 2026", size: "0.9 MB", uploaded_by: "Mehmet Danisman" },
  { id: "4", name: "Satis_Sozlesmesi_AhmetYilmaz.pdf", type: "PDF", folder: "sozlesme", related_to: "Ahmet Yilmaz - Kadikoy Daire", upload_date: "18 Mart 2026", size: "3.2 MB", uploaded_by: "Ayse Danisman" },
  { id: "5", name: "Kimlik_ZeynepArslan.jpg", type: "JPG", folder: "kimlik", related_to: "Zeynep Arslan", upload_date: "15 Mart 2026", size: "1.1 MB", uploaded_by: "Mehmet Danisman" },
  { id: "6", name: "Kira_Sozlesmesi_FatmaDemir.pdf", type: "PDF", folder: "sozlesme", related_to: "Fatma Demir - Atasehir 2+1", upload_date: "14 Mart 2026", size: "2.1 MB", uploaded_by: "Ayse Danisman" },
  { id: "7", name: "Bakirkoy_Dublex_Tapu.pdf", type: "PDF", folder: "tapu", related_to: "Bakirkoy 4+1 Dublex", upload_date: "12 Mart 2026", size: "2.7 MB", uploaded_by: "Mehmet Danisman" },
  { id: "8", name: "DASK_Bakirkoy_Dublex.pdf", type: "PDF", folder: "dask", related_to: "Bakirkoy 4+1 Dublex", upload_date: "12 Mart 2026", size: "0.8 MB", uploaded_by: "Mehmet Danisman" },
  { id: "9", name: "Vekaletname_MustafaKaya.pdf", type: "PDF", folder: "diger", related_to: "Mustafa Kaya", upload_date: "10 Mart 2026", size: "1.5 MB", uploaded_by: "Ayse Danisman" },
  { id: "10", name: "Kimlik_AhmetYilmaz.jpg", type: "JPG", folder: "kimlik", related_to: "Ahmet Yilmaz", upload_date: "08 Mart 2026", size: "0.9 MB", uploaded_by: "Mehmet Danisman" },
];

function normalizeDoc(d: Document): Document {
  const name = d.name || d.fileName || "Belge";
  const ext = name.split(".").pop()?.toLocaleUpperCase("tr-TR") || "FILE";
  return {
    ...d,
    name,
    type: d.type || d.fileType || ext,
    folder: d.folder || d.category || "diger",
    related_to: d.related_to || d.relatedTo || "-",
    upload_date: d.upload_date || (d.createdAt ? new Date(d.createdAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" }) : "-"),
    size: d.size || (d.fileSize ? `${(d.fileSize / (1024 * 1024)).toFixed(1)} MB` : "-"),
    uploaded_by: d.uploaded_by || d.uploadedBy || "-",
    fileUrl: d.fileUrl || d.url,
  };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BelgelerPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [docToRename, setDocToRename] = useState<Document | null>(null);
  const [newName, setNewName] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAreaFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch documents
  const { data: docData, isLoading, isError } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const res = await api.get("/api/v1/documents");
      return res.data?.data || res.data;
    },
    retry: 1,
  });

  const documents: Document[] = (
    isError
      ? fallbackDocuments
      : Array.isArray(docData) ? docData : docData?.items || docData?.documents || fallbackDocuments
  ).map(normalizeDoc);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });
      if (selectedFolder) formData.append("category", selectedFolder);
      const res = await api.post("/api/v1/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setShowUpload(false);
    },
    onError: () => {
      setError("Dosya yuklenemedi. Lutfen tekrar deneyin.");
      setTimeout(() => setError(null), 4000);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setSelectedDocs((prev) => prev.filter((d) => d !== docToDelete));
    },
    onError: () => {
      setError("Belge silinemedi.");
      setTimeout(() => setError(null), 4000);
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => api.delete(`/api/v1/documents/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setSelectedDocs([]);
    },
    onError: () => {
      setError("Toplu silme islemi basarisiz.");
      setTimeout(() => setError(null), 4000);
    },
  });

  // Rename mutation
  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      await api.put(`/api/v1/documents/${id}`, { name, fileName: name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setRenameDialogOpen(false);
    },
    onError: () => {
      setError("Yeniden adlandirma basarisiz.");
      setTimeout(() => setError(null), 4000);
    },
  });

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (files && files.length > 0) {
      uploadMutation.mutate(files);
    }
  }, [uploadMutation]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      uploadMutation.mutate(e.dataTransfer.files);
    }
  }, [uploadMutation]);

  const handlePreview = useCallback((doc: Document) => {
    if (doc.fileUrl) {
      window.open(doc.fileUrl, "_blank");
    } else {
      setError("Bu belge icin onizleme mevcut degil.");
      setTimeout(() => setError(null), 3000);
    }
  }, []);

  const handleDownload = useCallback((doc: Document) => {
    if (doc.fileUrl) {
      const a = document.createElement("a");
      a.href = doc.fileUrl;
      a.download = doc.name || "belge";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      setError("Bu belge icin indirme linki mevcut degil.");
      setTimeout(() => setError(null), 3000);
    }
  }, []);

  const handleBulkDownload = useCallback(() => {
    const docsToDownload = documents.filter((d) => selectedDocs.includes(d.id));
    docsToDownload.forEach((doc) => {
      if (doc.fileUrl) {
        const a = document.createElement("a");
        a.href = doc.fileUrl;
        a.download = doc.name || "belge";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    });
  }, [documents, selectedDocs]);

  const handleDeleteConfirm = useCallback(() => {
    if (docToDelete) {
      deleteMutation.mutate(docToDelete);
    }
    setDeleteDialogOpen(false);
    setDocToDelete(null);
  }, [docToDelete, deleteMutation]);

  const handleBulkDeleteConfirm = useCallback(() => {
    bulkDeleteMutation.mutate(selectedDocs);
    setBulkDeleteDialogOpen(false);
  }, [selectedDocs, bulkDeleteMutation]);

  const handleRenameConfirm = useCallback(() => {
    if (docToRename && newName.trim()) {
      renameMutation.mutate({ id: docToRename.id, name: newName.trim() });
    }
  }, [docToRename, newName, renameMutation]);

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      (doc.name || "").toLocaleLowerCase("tr-TR").includes(searchQuery.toLocaleLowerCase("tr-TR")) ||
      (doc.related_to || "").toLocaleLowerCase("tr-TR").includes(searchQuery.toLocaleLowerCase("tr-TR"));
    const matchesFolder =
      !selectedFolder || doc.folder === selectedFolder;
    return matchesSearch && matchesFolder;
  });

  const toggleDocSelection = (docId: string) => {
    setSelectedDocs((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedDocs.length === filteredDocuments.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(filteredDocuments.map((d) => d.id));
    }
  };

  // Calculate folder counts from actual data
  const folderDefs: FolderDef[] = [
    { id: "tapu", label: "Tapu Belgeleri", count: documents.filter((d) => d.folder === "tapu").length, icon: FileText },
    { id: "iskan", label: "Iskan Belgeleri", count: documents.filter((d) => d.folder === "iskan").length, icon: FileText },
    { id: "dask", label: "DASK Policeleri", count: documents.filter((d) => d.folder === "dask").length, icon: FileText },
    { id: "sozlesme", label: "Sozlesmeler", count: documents.filter((d) => d.folder === "sozlesme").length, icon: FileText },
    { id: "kimlik", label: "Kimlik Belgeleri", count: documents.filter((d) => d.folder === "kimlik").length, icon: FileText },
    { id: "diger", label: "Diger", count: documents.filter((d) => d.folder === "diger").length, icon: File },
  ];

  return (
    <div className="space-y-6">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.docx,.doc"
        onChange={(e) => handleFileSelect(e.target.files)}
      />
      <input
        type="file"
        ref={uploadAreaFileInputRef}
        className="hidden"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.docx,.doc"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Belgeyi Sil</DialogTitle>
            <DialogDescription>
              Bu belgeyi silmek istediginizden emin misiniz? Bu islem geri alinamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Iptal</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Toplu Silme</DialogTitle>
            <DialogDescription>
              {selectedDocs.length} belgeyi silmek istediginizden emin misiniz? Bu islem geri alinamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>Iptal</Button>
            <Button variant="destructive" onClick={handleBulkDeleteConfirm} disabled={bulkDeleteMutation.isPending}>
              {bulkDeleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Tumunu Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeniden Adlandir</DialogTitle>
            <DialogDescription>
              Yeni dosya adini girin
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Yeni dosya adi"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameConfirm();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>Iptal</Button>
            <Button onClick={handleRenameConfirm} disabled={renameMutation.isPending || !newName.trim()}>
              {renameMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Belgeler</h1>
          <p className="text-muted-foreground">
            Toplam {documents.length} belge kaydi
          </p>
        </div>
        <Button onClick={() => setShowUpload(!showUpload)}>
          <Upload className="mr-2 h-4 w-4" />
          Belge Yukle
        </Button>
      </div>

      {/* Upload Area */}
      {showUpload && (
        <Card>
          <CardContent className="p-6">
            <div
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-12 transition-colors",
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {uploadMutation.isPending ? (
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              ) : (
                <Upload className="h-10 w-10 text-muted-foreground/50" />
              )}
              <h3 className="mt-4 text-sm font-semibold">
                {uploadMutation.isPending ? "Yukleniyor..." : "Dosyalari surukleyip birakin"}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                veya dosya secmek icin tiklayin
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                disabled={uploadMutation.isPending}
                onClick={() => uploadAreaFileInputRef.current?.click()}
              >
                Dosya Sec
              </Button>
              <p className="mt-2 text-[10px] text-muted-foreground">
                PDF, JPG, PNG, DOCX (maks. 25 MB)
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Folder Navigation */}
        <div className="space-y-2">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-sm">Klasorler</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <button
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
                  !selectedFolder && "bg-accent font-medium"
                )}
                onClick={() => setSelectedFolder(null)}
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <span>Tum Belgeler</span>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {documents.length}
                </Badge>
              </button>
              {folderDefs.map((folder) => (
                <button
                  key={folder.id}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
                    selectedFolder === folder.id && "bg-accent font-medium"
                  )}
                  onClick={() => setSelectedFolder(folder.id)}
                >
                  <div className="flex items-center gap-2">
                    <FolderIcon className="h-4 w-4 text-amber-500" />
                    <span>{folder.label}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {folder.count}
                  </Badge>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Document List */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search and Bulk Actions */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Belge ara (dosya adi, iliskili kayit)..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {selectedDocs.length > 0 && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleBulkDownload}>
                      <Download className="mr-2 h-3.5 w-3.5" />
                      Indir ({selectedDocs.length})
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setBulkDeleteDialogOpen(true)}>
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Sil ({selectedDocs.length})
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Documents Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-2 p-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-4 py-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-8 w-8 rounded" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left">
                          <button
                            onClick={toggleSelectAll}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {selectedDocs.length ===
                            filteredDocuments.length &&
                            filteredDocuments.length > 0 ? (
                              <CheckSquare className="h-4 w-4" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Dosya Adi
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                          Iliskili Kayit
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                          Yukleme Tarihi
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                          Boyut
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden xl:table-cell">
                          Yukleyen
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Islemler
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredDocuments.map((doc) => (
                        <tr
                          key={doc.id}
                          className={cn(
                            "hover:bg-muted/30 transition-colors",
                            selectedDocs.includes(doc.id) && "bg-accent/50"
                          )}
                        >
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleDocSelection(doc.id)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {selectedDocs.includes(doc.id) ? (
                                <CheckSquare className="h-4 w-4 text-primary" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="text-sm font-medium truncate max-w-[200px]">
                                  {doc.name}
                                </p>
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] mt-0.5"
                                >
                                  {doc.type}
                                </Badge>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-sm text-muted-foreground">
                              {doc.related_to}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className="text-sm text-muted-foreground">
                              {doc.upload_date}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className="text-sm text-muted-foreground">
                              {doc.size}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden xl:table-cell">
                            <span className="text-sm">
                              {doc.uploaded_by}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Onizle"
                                onClick={() => handlePreview(doc)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Indir"
                                onClick={() => handleDownload(doc)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <DropdownMenu.Root>
                                <DropdownMenu.Trigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Portal>
                                  <DropdownMenu.Content
                                    className="z-50 min-w-[160px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                                    align="end"
                                  >
                                    <DropdownMenu.Item
                                      className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent"
                                      onSelect={() => {
                                        setDocToRename(doc);
                                        setNewName(doc.name || "");
                                        setRenameDialogOpen(true);
                                      }}
                                    >
                                      Yeniden Adlandir
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent">
                                      Klasor Degistir
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Separator className="my-1 h-px bg-border" />
                                    <DropdownMenu.Item
                                      className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm text-destructive outline-none hover:bg-destructive/10"
                                      onSelect={() => {
                                        setDocToDelete(doc.id);
                                        setDeleteDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Sil
                                    </DropdownMenu.Item>
                                  </DropdownMenu.Content>
                                </DropdownMenu.Portal>
                              </DropdownMenu.Root>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!isLoading && filteredDocuments.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground/30" />
                  <h3 className="mt-4 text-lg font-semibold">
                    Belge Bulunamadi
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Arama kriterlerinize uygun belge bulunamadi.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
