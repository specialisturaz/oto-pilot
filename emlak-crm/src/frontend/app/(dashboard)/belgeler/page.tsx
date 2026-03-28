"use client";

import { useState } from "react";
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
  ChevronRight,
  CheckSquare,
  Square,
  Filter,
  FolderIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

interface Document {
  id: string;
  name: string;
  type: string;
  folder: string;
  related_to: string;
  upload_date: string;
  size: string;
  uploaded_by: string;
}

const folders = [
  { id: "tapu", label: "Tapu Belgeleri", count: 12, icon: FileText },
  { id: "iskan", label: "Iskan Belgeleri", count: 8, icon: FileText },
  { id: "dask", label: "DASK Policeleri", count: 15, icon: FileText },
  { id: "sozlesme", label: "Sozlesmeler", count: 22, icon: FileText },
  { id: "kimlik", label: "Kimlik Belgeleri", count: 18, icon: FileText },
  { id: "diger", label: "Diger", count: 6, icon: File },
];

const mockDocuments: Document[] = [
  {
    id: "1",
    name: "Kadikoy_3+1_Tapu_Senedi.pdf",
    type: "PDF",
    folder: "tapu",
    related_to: "Kadikoy 3+1 Daire",
    upload_date: "25 Mart 2026",
    size: "2.4 MB",
    uploaded_by: "Mehmet Danisman",
  },
  {
    id: "2",
    name: "Besiktas_Villa_Iskan.pdf",
    type: "PDF",
    folder: "iskan",
    related_to: "Besiktas Villa",
    upload_date: "22 Mart 2026",
    size: "1.8 MB",
    uploaded_by: "Ayse Danisman",
  },
  {
    id: "3",
    name: "DASK_Atasehir_Residence.pdf",
    type: "PDF",
    folder: "dask",
    related_to: "Atasehir Residence 2+1",
    upload_date: "20 Mart 2026",
    size: "0.9 MB",
    uploaded_by: "Mehmet Danisman",
  },
  {
    id: "4",
    name: "Satis_Sozlesmesi_AhmetYilmaz.pdf",
    type: "PDF",
    folder: "sozlesme",
    related_to: "Ahmet Yilmaz - Kadikoy Daire",
    upload_date: "18 Mart 2026",
    size: "3.2 MB",
    uploaded_by: "Ayse Danisman",
  },
  {
    id: "5",
    name: "Kimlik_ZeynepArslan.jpg",
    type: "JPG",
    folder: "kimlik",
    related_to: "Zeynep Arslan",
    upload_date: "15 Mart 2026",
    size: "1.1 MB",
    uploaded_by: "Mehmet Danisman",
  },
  {
    id: "6",
    name: "Kira_Sozlesmesi_FatmaDemir.pdf",
    type: "PDF",
    folder: "sozlesme",
    related_to: "Fatma Demir - Atasehir 2+1",
    upload_date: "14 Mart 2026",
    size: "2.1 MB",
    uploaded_by: "Ayse Danisman",
  },
  {
    id: "7",
    name: "Bakirkoy_Dublex_Tapu.pdf",
    type: "PDF",
    folder: "tapu",
    related_to: "Bakirkoy 4+1 Dublex",
    upload_date: "12 Mart 2026",
    size: "2.7 MB",
    uploaded_by: "Mehmet Danisman",
  },
  {
    id: "8",
    name: "DASK_Bakirkoy_Dublex.pdf",
    type: "PDF",
    folder: "dask",
    related_to: "Bakirkoy 4+1 Dublex",
    upload_date: "12 Mart 2026",
    size: "0.8 MB",
    uploaded_by: "Mehmet Danisman",
  },
  {
    id: "9",
    name: "Vekaletname_MustafaKaya.pdf",
    type: "PDF",
    folder: "diger",
    related_to: "Mustafa Kaya",
    upload_date: "10 Mart 2026",
    size: "1.5 MB",
    uploaded_by: "Ayse Danisman",
  },
  {
    id: "10",
    name: "Kimlik_AhmetYilmaz.jpg",
    type: "JPG",
    folder: "kimlik",
    related_to: "Ahmet Yilmaz",
    upload_date: "08 Mart 2026",
    size: "0.9 MB",
    uploaded_by: "Mehmet Danisman",
  },
];

export default function BelgelerPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [showUpload, setShowUpload] = useState(false);

  const filteredDocuments = mockDocuments.filter((doc) => {
    const matchesSearch =
      doc.name.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR')) ||
      doc.related_to.toLocaleLowerCase('tr-TR').includes(searchQuery.toLocaleLowerCase('tr-TR'));
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Belgeler</h1>
          <p className="text-muted-foreground">
            Toplam {mockDocuments.length} belge kaydi
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
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 py-12 transition-colors hover:border-muted-foreground/50">
              <Upload className="h-10 w-10 text-muted-foreground/50" />
              <h3 className="mt-4 text-sm font-semibold">
                Dosyalari surukleyip birakin
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                veya dosya secmek icin tiklayin
              </p>
              <Button variant="outline" size="sm" className="mt-4">
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
                  {mockDocuments.length}
                </Badge>
              </button>
              {folders.map((folder) => {
                const Icon = folder.icon;
                return (
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
                );
              })}
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
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-3.5 w-3.5" />
                      Indir ({selectedDocs.length})
                    </Button>
                    <Button variant="destructive" size="sm">
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
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Indir"
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
                                  <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent">
                                    Yeniden Adlandir
                                  </DropdownMenu.Item>
                                  <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent">
                                    Klasor Degistir
                                  </DropdownMenu.Item>
                                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                                  <DropdownMenu.Item className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm text-destructive outline-none hover:bg-destructive/10">
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

              {filteredDocuments.length === 0 && (
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
