import { useState, useRef, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Upload,
  Filter,
  Grid,
  List,
  Tag,
  History,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Folder,
  FolderOpen,
  FolderPlus,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useMediaItems,
  useUploadMedia,
  useDeleteMediaItem,
  useMediaFolders,
  useCreateMediaFolder,
  useRenameMediaFolder,
  useDeleteMediaFolder,
  useMoveMediaItem,
  useBulkMoveMediaItems,
} from "@/lib/hooks";
import type { MediaFolder } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

// ─── FolderChip ───────────────────────────────────────────────────────────────
function FolderChip({
  folder,
  isActive,
  onClick,
  onRename,
  onDeleteRequest,
}: {
  folder: MediaFolder;
  isActive: boolean;
  onClick: () => void;
  onRename: (id: number, currentName: string) => void;
  onDeleteRequest: (folder: MediaFolder) => void;
}) {
  return (
    <div className="flex-shrink-0 flex items-center gap-0.5 group/chip">
      <button
        onClick={onClick}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
          isActive
            ? "bg-primary text-white shadow-lg shadow-primary/20"
            : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
        }`}
      >
        <Folder className="w-3.5 h-3.5" />
        {folder.name}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover/chip:opacity-100 transition-opacity rounded-full"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="glass-panel border-border/50">
          <DropdownMenuItem onClick={() => onRename(folder.id, folder.name)}>
            <Pencil className="w-3.5 h-3.5 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDeleteRequest(folder)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5 mr-2" />
            Delete Folder
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MediaVault() {
  const [, navigate] = useLocation();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadMood, setUploadMood] = useState("Playful");
  const [uploadOutfit, setUploadOutfit] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [removeMetadata, setRemoveMetadata] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Folder state
  const [activeFolderId, setActiveFolderId] = useState<number | null | "all">("all");
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingFolderId, setRenamingFolderId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [folderToDelete, setFolderToDelete] = useState<MediaFolder | null>(null);

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Data hooks
  const { data: mediaItems, isLoading } = useMediaItems();
  const uploadMutation = useUploadMedia();
  const deleteMutation = useDeleteMediaItem();
  const { data: folders } = useMediaFolders();
  const createFolder = useCreateMediaFolder();
  const renameFolder = useRenameMediaFolder();
  const deleteFolder = useDeleteMediaFolder();
  const moveItem = useMoveMediaItem();
  const bulkMove = useBulkMoveMediaItems();

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  // Filtered items based on active folder
  const displayedItems = useMemo(() => {
    if (!mediaItems) return [];
    if (activeFolderId === "all") return mediaItems;
    if (activeFolderId === null) return mediaItems.filter((i) => i.folderId == null);
    return mediaItems.filter((i) => i.folderId === activeFolderId);
  }, [mediaItems, activeFolderId]);

  const allSelected = displayedItems.length > 0 && displayedItems.every((i) => selectedIds.has(i.id));

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedItems.map((i) => i.id)));
    }
  };

  const handleBulkMove = (folderId: number | null) => {
    bulkMove.mutate({ itemIds: Array.from(selectedIds), folderId }, {
      onSuccess: () => {
        toast({ title: `Moved ${selectedIds.size} photo${selectedIds.size !== 1 ? "s" : ""}` });
        exitSelectMode();
      },
    });
  };

  const compressImage = useCallback((file: File, maxWidth = 1600, quality = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      if (file.size < 500 * 1024) {
        resolve(file);
        return;
      }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }));
            } else {
              resolve(file);
            }
          },
          "image/webp",
          quality
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    });
  }, []);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast({ title: "Invalid files", description: "Only image files are allowed.", variant: "destructive" });
      return;
    }
    const total = imageFiles.length;
    let done = 0;
    let failed = 0;
    setUploadProgress({ done: 0, total });

    for (const file of imageFiles) {
      try {
        const compressed = await compressImage(file);
        const formData = new FormData();
        formData.append("file", compressed);
        formData.append("mood", uploadMood);
        formData.append("outfit", uploadOutfit || "Untagged");
        formData.append("removeMetadata", removeMetadata ? "true" : "false");
        await uploadMutation.mutateAsync(formData);
        done++;
        setUploadProgress({ done, total });
      } catch {
        failed++;
        done++;
        setUploadProgress({ done, total });
      }
    }

    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (failed === 0) {
      toast({ title: "Uploaded", description: `${total} image${total > 1 ? "s" : ""} added to vault.` });
      setShowUploadForm(false);
      setUploadOutfit("");
    } else {
      toast({ title: "Partial upload", description: `${total - failed} of ${total} uploaded. ${failed} failed.`, variant: "destructive" });
    }
  }, [uploadMood, uploadOutfit, uploadMutation, toast, compressImage, removeMetadata]);

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast({ title: "Deleted", description: "Media removed from vault." }),
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    createFolder.mutate(name, {
      onSuccess: () => {
        setNewFolderName("");
        setShowNewFolderInput(false);
        toast({ title: "Folder created", description: `"${name}" folder is ready.` });
      },
    });
  };

  const handleStartRename = (id: number, currentName: string) => {
    setRenamingFolderId(id);
    setRenameValue(currentName);
  };

  const handleConfirmRename = () => {
    if (!renamingFolderId || !renameValue.trim()) {
      setRenamingFolderId(null);
      return;
    }
    renameFolder.mutate({ id: renamingFolderId, name: renameValue.trim() }, {
      onSuccess: () => {
        setRenamingFolderId(null);
        toast({ title: "Folder renamed" });
      },
    });
  };

  const handleConfirmDelete = () => {
    if (!folderToDelete) return;
    const name = folderToDelete.name;
    deleteFolder.mutate(folderToDelete.id, {
      onSuccess: () => {
        if (activeFolderId === folderToDelete.id) setActiveFolderId("all");
        setFolderToDelete(null);
        toast({ title: "Folder deleted", description: `"${name}" removed. Photos are now uncategorized.` });
      },
    });
  };

  const MOODS = ["Playful", "Confident", "Seductive", "Casual", "Mysterious", "Neutral"];

  const activeFolderLabel =
    activeFolderId === "all"
      ? null
      : activeFolderId === null
      ? "Uncategorized"
      : folders?.find((f) => f.id === activeFolderId)?.name ?? null;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight" data-testid="text-vault-title">Media Vault</h1>
          <p className="text-muted-foreground mt-1">Securely manage and categorize your content library.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="border-border/50" data-testid="button-history">
            <History className="w-4 h-4 mr-2" />
            History
          </Button>
          <Button
            className="bg-primary text-white hover:bg-primary/90"
            onClick={() => setShowUploadForm(!showUploadForm)}
            data-testid="button-upload"
          >
            <Plus className="w-4 h-4 mr-2" />
            Upload Media
          </Button>
        </div>
      </div>

      {/* Upload Form */}
      <AnimatePresence>
        {showUploadForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card className="p-6 glass-panel border-primary/30 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-display font-semibold">Upload New Media</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowUploadForm(false)} data-testid="button-close-upload">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Mood / Vibe</label>
                  <div className="flex flex-wrap gap-2">
                    {MOODS.map((m) => (
                      <Badge
                        key={m}
                        variant={uploadMood === m ? "default" : "outline"}
                        className={`cursor-pointer transition-all ${uploadMood === m ? "bg-primary text-white" : "hover:border-primary/50"}`}
                        onClick={() => setUploadMood(m)}
                        data-testid={`badge-mood-${m.toLowerCase()}`}
                      >
                        {m}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Outfit / Tag</label>
                  <Input
                    placeholder="e.g. Summer Dress, Streetwear..."
                    value={uploadOutfit}
                    onChange={(e) => setUploadOutfit(e.target.value)}
                    className="bg-background/50"
                    data-testid="input-outfit-tag"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-3 cursor-pointer select-none" data-testid="toggle-remove-metadata">
                  <div
                    className={`relative w-10 h-5 rounded-full transition-colors ${removeMetadata ? 'bg-primary' : 'bg-muted'}`}
                    onClick={() => setRemoveMetadata(!removeMetadata)}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${removeMetadata ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                  <div>
                    <span className="text-sm font-medium">Remove Metadata</span>
                    <span className="text-xs text-green-400 ml-1.5">(Recommended)</span>
                    <p className="text-xs text-muted-foreground mt-0.5">Strips camera, GPS, and software data without affecting image quality</p>
                  </div>
                </label>
              </div>
              <div className="flex gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                  data-testid="input-file-upload"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!!uploadProgress}
                  className="bg-gradient-to-r from-primary to-accent text-white border-0"
                  data-testid="button-browse-files"
                >
                  {uploadProgress ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {uploadProgress ? `Uploading ${uploadProgress.done}/${uploadProgress.total}...` : "Browse Files"}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Bar */}
      <Card className="p-4 glass-panel border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Input placeholder="Filter by tag or theme..." className="pl-9 bg-background/50" data-testid="input-filter" />
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex items-center border border-border/50 rounded-lg p-1 bg-background/30">
            <Button
              variant="ghost"
              size="sm"
              className={view === 'grid' ? 'bg-secondary text-primary' : 'text-muted-foreground'}
              onClick={() => setView('grid')}
              data-testid="button-view-grid"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={view === 'list' ? 'bg-secondary text-primary' : 'text-muted-foreground'}
              onClick={() => setView('list')}
              data-testid="button-view-list"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          <Button
            variant={selectMode ? "default" : "outline"}
            size="sm"
            onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
            className={selectMode ? "bg-primary text-white" : ""}
            data-testid="button-toggle-select"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            {selectMode ? "Cancel" : "Select"}
          </Button>
          {selectMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="border-border/50"
              data-testid="button-select-all"
            >
              {allSelected ? "Deselect All" : `Select All (${displayedItems.length})`}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary transition-colors" data-testid="badge-filter-safe">Safe</Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary transition-colors" data-testid="badge-filter-spicy">Spicy</Badge>
          <Badge variant="outline" className="cursor-pointer hover:bg-secondary transition-colors" data-testid="badge-filter-unused">Unused</Badge>
        </div>
      </Card>

      {/* Folder Rail */}
      <Card className="p-4 glass-panel border-border/50">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {/* All Photos chip */}
          <button
            onClick={() => setActiveFolderId("all")}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeFolderId === "all"
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
            data-testid="folder-chip-all"
          >
            All Photos
          </button>

          {/* Uncategorized chip */}
          <button
            onClick={() => setActiveFolderId(null)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeFolderId === null
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
            data-testid="folder-chip-uncategorized"
          >
            Uncategorized
          </button>

          {/* User folders */}
          {folders?.map((folder) =>
            renamingFolderId === folder.id ? (
              <div key={folder.id} className="flex-shrink-0 flex items-center gap-1">
                <Input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConfirmRename();
                    if (e.key === "Escape") setRenamingFolderId(null);
                  }}
                  autoFocus
                  className="h-8 w-36 text-sm bg-background/50"
                />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleConfirmRename}>
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setRenamingFolderId(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <FolderChip
                key={folder.id}
                folder={folder}
                isActive={activeFolderId === folder.id}
                onClick={() => setActiveFolderId(folder.id)}
                onRename={handleStartRename}
                onDeleteRequest={setFolderToDelete}
              />
            )
          )}

          {/* New Folder button / inline input */}
          {showNewFolderInput ? (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateFolder();
                  if (e.key === "Escape") { setShowNewFolderInput(false); setNewFolderName(""); }
                }}
                placeholder="Folder name..."
                autoFocus
                className="h-8 w-36 text-sm bg-background/50"
                data-testid="input-new-folder-name"
              />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCreateFolder} data-testid="button-confirm-new-folder">
                <CheckCircle2 className="w-4 h-4 text-primary" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setShowNewFolderInput(false); setNewFolderName(""); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewFolderInput(true)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm border border-dashed border-border/50 text-muted-foreground hover:border-primary/50 hover:text-primary transition-all"
              data-testid="button-new-folder"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              New Folder
            </button>
          )}
        </div>

        {/* Active folder label + count */}
        {activeFolderLabel && (
          <p className="text-xs text-muted-foreground mt-2 pl-1">
            {activeFolderLabel} · {displayedItems.length} photo{displayedItems.length !== 1 ? "s" : ""}
          </p>
        )}
      </Card>

      {/* Media Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => { if (!showUploadForm) setShowUploadForm(true); }}
          className={`aspect-[3/4] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group ${
            dragOver ? 'border-primary bg-primary/10' : 'border-border/50 hover:border-primary/50 hover:bg-primary/5'
          }`}
          data-testid="upload-placeholder"
        >
          {uploadProgress ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-primary">{uploadProgress.done}/{uploadProgress.total}</p>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-muted-foreground group-hover:text-primary">Drag & Drop</p>
            </>
          )}
        </motion.div>

        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <Card key={i} className="overflow-hidden glass-panel border-border/50 h-full">
              <Skeleton className="aspect-[3/4] w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            </Card>
          ))
        ) : (
          displayedItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.15) }}
              className="group relative"
              data-testid={`card-media-${item.id}`}
              onClick={() => selectMode && toggleSelect(item.id)}
            >
              <Card className={`overflow-hidden glass-panel border-2 transition-all duration-300 h-full cursor-pointer ${
                selectMode && selectedIds.has(item.id)
                  ? "border-primary shadow-lg shadow-primary/20"
                  : "border-border/50 hover:border-primary/30"
              }`}>
                <div className="aspect-[3/4] relative overflow-hidden">
                  <img
                    src={item.url}
                    alt="Vault content"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {selectMode && (
                    <div className={`absolute top-3 left-3 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedIds.has(item.id)
                        ? "bg-primary border-primary"
                        : "bg-black/40 border-white/50 backdrop-blur-sm"
                    }`}>
                      {selectedIds.has(item.id) && <CheckCircle2 className="w-5 h-5 text-white" />}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="absolute top-2 right-2 flex gap-1">
                    {/* Move to Folder dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border-white/10 hover:bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`button-move-media-${item.id}`}
                        >
                          <FolderOpen className="w-4 h-4 text-white" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass-panel border-border/50 min-w-[180px]">
                        <DropdownMenuLabel className="text-xs text-muted-foreground">Move to folder</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {item.folderId != null && (
                          <DropdownMenuItem
                            onClick={() => moveItem.mutate({ id: item.id, folderId: null })}
                            className="text-muted-foreground"
                          >
                            <X className="w-3.5 h-3.5 mr-2" />
                            Remove from folder
                          </DropdownMenuItem>
                        )}
                        {(!folders || folders.length === 0) && (
                          <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                            No folders yet
                          </DropdownMenuItem>
                        )}
                        {folders?.map((folder) => (
                          <DropdownMenuItem
                            key={folder.id}
                            onClick={() => moveItem.mutate({ id: item.id, folderId: folder.id })}
                            disabled={item.folderId === folder.id}
                            className={item.folderId === folder.id ? "text-primary font-medium" : ""}
                          >
                            <Folder className="w-3.5 h-3.5 mr-2" />
                            {folder.name}
                            {item.folderId === folder.id && <CheckCircle2 className="w-3 h-3 ml-auto text-primary" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Delete button */}
                    <Button
                      variant="secondary"
                      size="icon"
                      className="w-8 h-8 rounded-full bg-red-500/60 backdrop-blur-md border-white/10 hover:bg-red-600/80 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(item.id)}
                      data-testid={`button-delete-media-${item.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </Button>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    <Button
                      className="w-full bg-primary text-white shadow-lg shadow-primary/20"
                      onClick={() => {
                        const params = new URLSearchParams({
                          imageUrl: item.url,
                          mood: item.mood,
                          outfit: item.outfit,
                        });
                        navigate(`/content?${params.toString()}`);
                      }}
                      data-testid={`button-media-use-${item.id}`}
                    >
                      Use in Post
                    </Button>
                  </div>

                  {item.usageCount > 3 && (
                    <Badge className="absolute top-2 left-2 bg-yellow-500/90 text-black border-0" data-testid={`badge-usage-high-${item.id}`}>
                      High Usage
                    </Badge>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider" data-testid={`text-mood-${item.id}`}>{item.mood}</Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1" data-testid={`text-last-used-${item.id}`}>
                      <History className="w-3 h-3" /> {item.lastUsed}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag className="w-3 h-3 text-primary" />
                    <span className="text-xs text-muted-foreground truncate" data-testid={`text-outfit-${item.id}`}>{item.outfit}</span>
                  </div>
                  {item.folderId != null && folders && (
                    <div className="flex items-center gap-1.5">
                      <Folder className="w-3 h-3 text-primary/60" />
                      <span className="text-xs text-muted-foreground truncate">
                        {folders.find((f) => f.id === item.folderId)?.name ?? "Folder"}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Frequency Warning */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-4"
        >
          <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-yellow-500">Frequency Warning</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              One of your selected images was posted <strong className="text-foreground">12 hours ago</strong>. To avoid bot-like patterns, we recommend waiting at least 48 hours before reposting similar content.
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Multi-select floating action bar */}
      <AnimatePresence>
        {selectMode && selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
            data-testid="bulk-action-bar"
          >
            <Card className="glass-panel border-primary/30 shadow-2xl shadow-primary/10 px-5 py-3 flex items-center gap-4">
              <span className="text-sm font-medium text-primary whitespace-nowrap">
                {selectedIds.size} selected
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="bg-primary text-white" data-testid="button-bulk-move">
                    <FolderOpen className="w-4 h-4 mr-1.5" />
                    Move to Folder
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="glass-panel border-border/50 min-w-[180px]">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Move to folder</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleBulkMove(null)} className="text-muted-foreground">
                    <X className="w-3.5 h-3.5 mr-2" />
                    Remove from folder
                  </DropdownMenuItem>
                  {(!folders || folders.length === 0) && (
                    <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                      No folders yet
                    </DropdownMenuItem>
                  )}
                  {folders?.map((folder) => (
                    <DropdownMenuItem key={folder.id} onClick={() => handleBulkMove(folder.id)}>
                      <Folder className="w-3.5 h-3.5 mr-2" />
                      {folder.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" variant="ghost" onClick={exitSelectMode} className="text-muted-foreground" data-testid="button-cancel-select">
                Cancel
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Folder Confirmation Dialog */}
      <AlertDialog open={!!folderToDelete} onOpenChange={(open) => !open && setFolderToDelete(null)}>
        <AlertDialogContent className="glass-panel border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{folderToDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Deleting this folder will not delete its photos — they'll become uncategorized. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
