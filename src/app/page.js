"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, Copy, Edit2, Check, X, Image as ImageIcon, Trash2, AlertCircle, Folder, Plus, ChevronRight, FolderOpen, Settings2, MoveRight, Eye, EyeOff, ShieldAlert, ShieldCheck, Download, UploadCloud } from "lucide-react";
import Image from "next/image";

export default function Home() {
  const [items, setItems] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState("all");
  
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editPrompt, setEditPrompt] = useState("");
  const fileInputRef = useRef(null);
  const [copiedId, setCopiedId] = useState(null);

  // NSFW Protection state
  const [isNSFWProtected, setIsNSFWProtected] = useState(true);
  const [revealedItems, setRevealedItems] = useState(new Set());
  const [editRating, setEditRating] = useState("Safe");

  // Modals state
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [newAlbumModal, setNewAlbumModal] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [movingItemId, setMovingItemId] = useState(null);
  const [deleteAlbumModal, setDeleteAlbumModal] = useState(null);

  // Batch Management state
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [batchMoveModal, setBatchMoveModal] = useState(false);
  const [batchDeleteModal, setBatchDeleteModal] = useState(false);
  const [batchRatingModal, setBatchRatingModal] = useState(false);

  // Settings state
  const [settingsModal, setSettingsModal] = useState(false);
  const [defaultUploadRating, setDefaultUploadRating] = useState("Safe");
  const [importConfirmModal, setImportConfirmModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const archiveInputRef = useRef(null);

  useEffect(() => {
    Promise.all([fetchData(), fetchAlbums()]).finally(() => setLoading(false));
    const savedDefaultRating = localStorage.getItem("defaultUploadRating");
    if (savedDefaultRating) setDefaultUploadRating(savedDefaultRating);
  }, []);

  const handleDefaultRatingChange = (rating) => {
    setDefaultUploadRating(rating);
    localStorage.setItem("defaultUploadRating", rating);
  };

  const showToast = (message, type = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAlbums = async () => {
    try {
      const res = await fetch("/api/albums");
      const data = await res.json();
      setAlbums(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch albums:", error);
      showToast("获取画集失败");
    }
  };

  const fetchData = async () => {
    try {
      const res = await fetch("/api/data");
      const data = await res.json();
      setItems(Array.isArray(data) ? data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      showToast("获取数据失败");
    }
  };

  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim()) return;
    try {
      const res = await fetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newAlbumName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to create album");
      const newAlbum = await res.json();
      setAlbums([...albums, newAlbum]);
      setNewAlbumModal(false);
      setNewAlbumName("");
      setSelectedAlbumId(newAlbum.id);
      showToast("画集创建成功", "success");
    } catch (err) {
      showToast("创建画集失败");
    }
  };

  const handleFileUpload = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setUploading(true);
    const targetAlbumId = selectedAlbumId === "all" ? "default" : selectedAlbumId;
    const files = Array.from(e.target.files);
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    try {
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { files: uploadedFiles } = await uploadRes.json();

      const newEntries = [];
      for (const file of uploadedFiles) {
        const itemRes = await fetch("/api/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: file.url,
            filename: file.filename,
            originalName: file.originalName,
            prompt: "",
            rating: defaultUploadRating,
            albumId: targetAlbumId 
          }),
        });
        const newItem = await itemRes.json();
        newEntries.push(newItem);
      }

      setItems((prev) => [...newEntries, ...prev]);
      showToast("上传成功！", "success");
    } catch (error) {
      showToast("上传失败，请重试。");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleExportArchive = () => {
    window.open('/api/archive', '_blank');
  };

  const handleImportArchive = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setImportConfirmModal(true);
  };

  const confirmImportArchive = async () => {
    if (!archiveInputRef.current || !archiveInputRef.current.files || archiveInputRef.current.files.length === 0) return;
    const file = archiveInputRef.current.files[0];
    
    setImporting(true);
    setImportConfirmModal(false);
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await fetch("/api/archive", {
        method: "POST",
        body: formData
      });
      if (!res.ok) throw new Error("Import failed");
      
      showToast("归档恢复成功！页面即将刷新", "success");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      showToast("归档恢复失败，文件可能已损坏");
      setImporting(false);
    } finally {
      if (archiveInputRef.current) archiveInputRef.current.value = "";
    }
  };

  const handleUpdateItem = async (id, updates) => {
    try {
      const res = await fetch("/api/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updatedItem = await res.json();
      setItems((prev) => prev.map((item) => (item.id === id ? updatedItem : item)));
      return true;
    } catch (error) {
      console.error(error);
      showToast("操作失败，请重试。");
      return false;
    }
  };

  const savePrompt = async (id) => {
    const success = await handleUpdateItem(id, { prompt: editPrompt, rating: editRating });
    if (success) {
      setEditingId(null);
      showToast("更新成功", "success");
    }
  };

  const confirmDelete = async () => {
    if (!confirmModal) return;
    const id = confirmModal;
    setConfirmModal(null);
    try {
      const res = await fetch(`/api/data?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setItems((prev) => prev.filter((item) => item.id !== id));
      showToast("删除成功", "success");
    } catch (error) {
      showToast("删除失败，请重试。");
    }
  };

  const copyToClipboard = async (text, id) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      showToast("复制失败");
    }
  };

  const confirmDeleteAlbum = async () => {
    if (!deleteAlbumModal) return;
    const albumId = deleteAlbumModal;
    setDeleteAlbumModal(null);
    
    try {
      // Move all items in this album to default
      const itemsToMove = items.filter(item => item.albumId === albumId);
      if (itemsToMove.length > 0) {
        const updates = itemsToMove.map(item => ({ id: item.id, albumId: "default" }));
        await fetch("/api/data", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        setItems(prev => prev.map(item => item.albumId === albumId ? { ...item, albumId: "default" } : item));
      }

      // Delete the album
      const res = await fetch(`/api/albums?id=${albumId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete album");
      
      setAlbums(prev => prev.filter(a => a.id !== albumId));
      if (selectedAlbumId === albumId) setSelectedAlbumId("all");
      showToast("画集已删除，图片已移至默认画集", "success");
    } catch (error) {
      showToast("删除画集失败，请重试");
    }
  };

  // Batch operations
  const toggleItemSelection = (id) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedItems(newSelection);
  };

  const selectAll = () => {
    if (selectedItems.size === displayedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(displayedItems.map(i => i.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedItems.size === 0) return;
    setBatchDeleteModal(false);
    
    try {
      const idsArray = Array.from(selectedItems);
      const res = await fetch(`/api/data`, { 
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: idsArray })
      });
      if (!res.ok) throw new Error("Batch delete failed");
      
      setItems((prev) => prev.filter((item) => !selectedItems.has(item.id)));
      showToast(`成功删除 ${selectedItems.size} 条记录`, "success");
      
      // Exit batch mode
      setIsBatchMode(false);
      setSelectedItems(new Set());
    } catch (error) {
      showToast("部分记录删除失败，请刷新重试。");
    }
  };

  const handleBatchRating = async (rating) => {
    if (selectedItems.size === 0) return;
    setBatchRatingModal(false);

    try {
      const updates = Array.from(selectedItems).map(id => ({ id, rating }));
      
      const res = await fetch("/api/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Batch rating failed");
      
      setItems((prev) => {
        const next = [...prev];
        updates.forEach(update => {
          const idx = next.findIndex(item => item.id === update.id);
          if (idx !== -1) {
            next[idx] = { ...next[idx], ...update };
          }
        });
        return next;
      });
      
      showToast(`成功更新 ${selectedItems.size} 张图片分级为 ${rating}`, "success");
      setIsBatchMode(false);
      setSelectedItems(new Set());
    } catch (error) {
      showToast("分级更新失败，请重试。");
    }
  };

  const handleBatchMove = async (targetAlbumId) => {
    if (selectedItems.size === 0) return;
    setBatchMoveModal(false);

    try {
      const updates = Array.from(selectedItems).map(id => ({ id, albumId: targetAlbumId }));
      
      const res = await fetch("/api/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Batch move failed");
      
      setItems((prev) => {
        const newItems = [...prev];
        updates.forEach(update => {
          const idx = newItems.findIndex(i => i.id === update.id);
          if (idx !== -1) newItems[idx].albumId = update.albumId;
        });
        return newItems;
      });
      
      showToast(`成功移动 ${selectedItems.size} 张图片`, "success");
      
      // Exit batch mode
      setIsBatchMode(false);
      setSelectedItems(new Set());
    } catch (error) {
      showToast("批量移动失败，请刷新重试。");
    }
  };

  const displayedItems = selectedAlbumId === "all" 
    ? items 
    : items.filter(item => (item.albumId || "default") === selectedAlbumId);

  return (
    <div className="min-h-screen bg-gray-50 flex text-gray-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 px-6 py-3 rounded-full shadow-lg transition-all duration-300 animate-in slide-in-from-top-4 fade-in ${toast.type === "error" ? "bg-red-50 text-red-600 border border-red-100" : "bg-green-50 text-green-600 border border-green-100"}`}>
          {toast.type === "error" ? <AlertCircle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
          <span className="font-semibold text-sm">{toast.message}</span>
        </div>
      )}

      {/* Modals */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-6">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">删除记录</h3>
            <p className="text-gray-500 text-sm mb-8">确定要删除这条记录吗？</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmModal(null)} className="px-5 py-2.5 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-colors">取消</button>
              <button onClick={confirmDelete} className="px-5 py-2.5 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-sm shadow-red-200">确认删除</button>
            </div>
          </div>
        </div>
      )}

      {batchDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-6">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">批量删除记录</h3>
            <p className="text-gray-500 text-sm mb-8">确定要删除选中的 {selectedItems.size} 条记录吗？该操作不可恢复。</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setBatchDeleteModal(false)} className="px-5 py-2.5 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-colors">取消</button>
              <button onClick={handleBatchDelete} className="px-5 py-2.5 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-sm shadow-red-200">确认删除</button>
            </div>
          </div>
        </div>
      )}

      {batchMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">移动 {selectedItems.size} 张图片到...</h3>
            <div className="max-h-64 overflow-y-auto mb-6 scrollbar-hide space-y-2">
              {albums.map(a => (
                <button 
                  key={a.id} 
                  className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 transition-colors font-medium border border-transparent hover:border-indigo-100 flex items-center gap-3"
                  onClick={() => handleBatchMove(a.id)}
                >
                  <Folder className="w-5 h-5 text-indigo-400" />
                  {a.name}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button onClick={() => setBatchMoveModal(false)} className="px-5 py-2.5 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-colors">取消</button>
            </div>
          </div>
        </div>
      )}

      {batchRatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">设置 {selectedItems.size} 张图片的分级</h3>
            <div className="max-h-64 overflow-y-auto mb-6 scrollbar-hide space-y-2">
              {['Safe', 'R', 'X', 'XX', 'XXX'].map(rating => (
                <button 
                  key={rating} 
                  className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-orange-50 hover:text-orange-700 transition-colors font-medium border border-transparent hover:border-orange-100 flex items-center gap-3"
                  onClick={() => handleBatchRating(rating)}
                >
                  <ShieldAlert className={`w-5 h-5 ${rating === 'Safe' ? 'text-green-500' : 'text-orange-400'}`} />
                  {rating === 'Safe' ? 'Safe (全年龄)' : `${rating} (限制级)`}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button onClick={() => setBatchRatingModal(false)} className="px-5 py-2.5 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-colors">取消</button>
            </div>
          </div>
        </div>
      )}

      {deleteAlbumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-6">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">删除画集</h3>
            <p className="text-gray-500 text-sm mb-8">确定要删除这个画集吗？画集内的所有图片将会自动转移到“默认画集”中，不用担心图片丢失。</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteAlbumModal(null)} className="px-5 py-2.5 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-colors">取消</button>
              <button onClick={confirmDeleteAlbum} className="px-5 py-2.5 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-sm shadow-red-200">确认删除</button>
            </div>
          </div>
        </div>
      )}

      {newAlbumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">新建画集</h3>
            <input 
              autoFocus
              type="text" 
              placeholder="输入画集名称 (例如: 机甲风)" 
              className="w-full px-4 py-3 rounded-xl border border-gray-200 mb-6 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={newAlbumName}
              onChange={e => setNewAlbumName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateAlbum()}
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setNewAlbumModal(false)} className="px-5 py-2.5 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-colors">取消</button>
              <button onClick={handleCreateAlbum} disabled={!newAlbumName.trim()} className="px-5 py-2.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 transition-colors">创建</button>
            </div>
          </div>
        </div>
      )}

      {settingsModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2"><Settings2 className="w-6 h-6 text-indigo-600" /> 系统设置</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">图片默认上传分级</label>
                <select 
                  value={defaultUploadRating} 
                  onChange={(e) => handleDefaultRatingChange(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-700 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 font-medium transition-all"
                >
                  <option value="Safe">Safe (全年龄)</option>
                  <option value="R">R (轻微限制)</option>
                  <option value="X">X (成人级)</option>
                  <option value="XX">XX (重度限制)</option>
                  <option value="XXX">XXX (极度限制)</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">新上传的图片将自动应用此分级（开启保护模式时将被隐藏）。</p>
              </div>

              <div className="pt-6 border-t border-gray-100">
                <label className="block text-sm font-semibold text-gray-700 mb-4">备份与恢复 (归档)</label>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleExportArchive}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl px-4 py-3 font-semibold transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    导出完整归档 (.zip)
                  </button>
                  
                  <input type="file" accept=".zip" className="hidden" ref={archiveInputRef} onChange={handleImportArchive} />
                  <button 
                    onClick={() => archiveInputRef.current?.click()}
                    disabled={importing}
                    className="w-full flex items-center justify-center gap-2 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl px-4 py-3 font-semibold transition-colors disabled:opacity-50"
                  >
                    {importing ? <div className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                    {importing ? "正在恢复..." : "导入归档文件 (.zip)"}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <button onClick={() => setSettingsModal(false)} className="px-6 py-2.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">完成</button>
            </div>
          </div>
        </div>
      )}

      {importConfirmModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-6">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">危险操作警告</h3>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              你即将导入归档文件。<b>此操作将彻底覆盖并清空当前所有的画集、图片和配置数据</b>，且无法撤销！
              <br /><br />
              请确认上传的 zip 文件是 Prompt Studio 的有效归档包。确定要继续吗？
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setImportConfirmModal(false); if(archiveInputRef.current) archiveInputRef.current.value = ""; }} className="px-5 py-2.5 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-colors">取消</button>
              <button onClick={confirmImportArchive} className="px-5 py-2.5 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-sm shadow-red-200">确认覆盖并导入</button>
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8 bg-gray-900/90 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setPreviewImage(null)}>
          <button onClick={(e) => { e.stopPropagation(); setPreviewImage(null); }} className="absolute top-4 right-4 sm:top-8 sm:right-8 p-3 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-sm transition-all z-10">
            <X className="w-6 h-6" />
          </button>
          <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img src={previewImage} alt="Preview" className="max-w-full max-h-full object-contain drop-shadow-2xl rounded-lg animate-in zoom-in-95 duration-300" />
          </div>
        </div>
      )}

      {/* Sidebar - Added scrollbar-hide */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 shrink-0">
        <div className="p-6 pb-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
            Prompt Studio
          </h1>
        </div>
        
        <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4 space-y-1">
          <button 
            onClick={() => { setSelectedAlbumId("all"); setIsBatchMode(false); setSelectedItems(new Set()); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${selectedAlbumId === "all" ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-100"}`}
          >
            <ImageIcon className="w-5 h-5" />
            全部图片
          </button>
          
          <button 
            onClick={() => setIsNSFWProtected(!isNSFWProtected)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-colors text-gray-600 hover:bg-gray-100"
            title="开启/关闭限制级图片保护"
          >
            <div className="flex items-center gap-3">
              {isNSFWProtected ? <ShieldCheck className="w-5 h-5 text-green-500" /> : <ShieldAlert className="w-5 h-5 text-orange-400" />}
              保护模式
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${isNSFWProtected ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{isNSFWProtected ? 'ON' : 'OFF'}</span>
          </button>
          
          <button 
            onClick={() => setSettingsModal(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors text-gray-600 hover:bg-gray-100"
            title="应用设置"
          >
            <Settings2 className="w-5 h-5" />
            系统设置
          </button>
          
          <div className="pt-6 pb-2 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider flex justify-between items-center">
            我的画集
            <button onClick={() => setNewAlbumModal(true)} className="hover:text-indigo-600 transition-colors" title="新建画集">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {albums.map((album) => (
            <div key={album.id} className="relative group">
              <button 
                onClick={() => { setSelectedAlbumId(album.id); setIsBatchMode(false); setSelectedItems(new Set()); }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-all ${selectedAlbumId === album.id ? "bg-indigo-50 text-indigo-700 pr-10" : "text-gray-600 hover:bg-gray-100 pr-10"}`}
              >
                <div className="flex items-center gap-3 truncate">
                  {selectedAlbumId === album.id ? <FolderOpen className="w-5 h-5 shrink-0" /> : <Folder className="w-5 h-5 shrink-0 text-gray-400 group-hover:text-gray-500" />}
                  <span className="truncate">{album.name}</span>
                </div>
              </button>
              {album.id !== "default" && (
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteAlbumModal(album.id); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  title="删除画集"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              {selectedAlbumId === album.id && album.id === "default" && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 sm:p-12 overflow-y-auto h-screen scrollbar-hide">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Header */}
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-gray-200">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                {selectedAlbumId === "all" ? "全部图片" : albums.find(a => a.id === selectedAlbumId)?.name || "画集"}
                {isBatchMode && <span className="text-sm font-medium px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full">已选择 {selectedItems.size} 项</span>}
              </h2>
              <p className="mt-2 text-gray-500">
                共 {displayedItems.length} 张图片
              </p>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              {displayedItems.length > 0 && !isBatchMode && (
                <button
                  onClick={() => setIsBatchMode(true)}
                  className="flex items-center gap-2 rounded-full bg-white border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-all shadow-sm"
                >
                  <Settings2 className="w-4 h-4" />
                  批量管理
                </button>
              )}

              {isBatchMode && (
                <>
                  <button onClick={selectAll} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 px-3">
                    {selectedItems.size === displayedItems.length ? "取消全选" : "全选"}
                  </button>
                  <button
                    onClick={() => setBatchMoveModal(true)}
                    disabled={selectedItems.size === 0}
                    className="flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-100 px-5 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <MoveRight className="w-4 h-4" />
                    移动到...
                  </button>
                  <button
                    onClick={() => setBatchRatingModal(true)}
                    disabled={selectedItems.size === 0}
                    className="flex items-center gap-2 rounded-full bg-orange-50 border border-orange-100 px-5 py-2.5 text-sm font-semibold text-orange-700 hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    设置分级
                  </button>
                  <button
                    onClick={() => setBatchDeleteModal(true)}
                    disabled={selectedItems.size === 0}
                    className="flex items-center gap-2 rounded-full bg-red-50 border border-red-100 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </button>
                  <button
                    onClick={() => { setIsBatchMode(false); setSelectedItems(new Set()); }}
                    className="flex items-center gap-2 rounded-full bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-all ml-2"
                  >
                    完成
                  </button>
                </>
              )}

              {!isBatchMode && (
                <>
                  <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="group relative inline-flex items-center justify-center gap-2 rounded-full bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-gray-800 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden shadow-md"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-0 transition-opacity duration-500 group-hover:opacity-20" />
                    {uploading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4 transition-transform group-hover:-translate-y-1" />}
                    {selectedAlbumId === "all" ? "上传图片" : "上传到此画集"}
                  </button>
                </>
              )}
            </div>
          </header>

          {/* Gallery */}
          {loading ? (
            <div className="flex justify-center py-24">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center rounded-3xl border-2 border-dashed border-gray-200 bg-white/50 backdrop-blur-sm">
              <div className="p-4 rounded-full bg-indigo-50 mb-4 text-indigo-500">
                {selectedAlbumId === "all" ? <ImageIcon className="w-10 h-10" /> : <FolderOpen className="w-10 h-10" />}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">这里空空如也</h3>
              <p className="text-gray-500 max-w-sm mb-6">
                {selectedAlbumId === "all" ? "你还没有上传过任何图片。" : "这个画集还没有添加任何参考图。"}
              </p>
              <button onClick={() => fileInputRef.current?.click()} className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors">
                立即上传 &rarr;
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayedItems.map((item) => {
                const isSelected = selectedItems.has(item.id);

                return (
                <div 
                  key={item.id} 
                  className={`group flex flex-col bg-white rounded-3xl overflow-hidden shadow-sm transition-all duration-300 ring-1 ${
                    isBatchMode 
                      ? isSelected 
                        ? "ring-2 ring-indigo-500 shadow-md scale-[0.98]" 
                        : "ring-gray-200 cursor-pointer hover:ring-2 hover:ring-indigo-300" 
                      : "ring-gray-100 hover:shadow-xl hover:ring-indigo-100"
                  }`}
                  onClick={() => {
                    if (isBatchMode) {
                      toggleItemSelection(item.id);
                    }
                  }}
                >
                  {/* Image Section */}
                  <div className="relative aspect-square overflow-hidden bg-gray-100 cursor-pointer" onClick={(e) => {
                    if (isBatchMode) return;
                    if (isNSFWProtected && item.rating && item.rating !== "Safe" && !revealedItems.has(item.id)) {
                      e.stopPropagation();
                      const newSet = new Set(revealedItems);
                      newSet.add(item.id);
                      setRevealedItems(newSet);
                      return;
                    }
                    setPreviewImage(item.url);
                  }}>
                    <Image src={item.url} alt={item.originalName} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className={`object-cover transition-transform duration-700 ${!isBatchMode && "group-hover:scale-105"} ${isBatchMode && isSelected ? "opacity-90" : ""}`} />
                    
                    {/* NSFW Mask */}
                    {isNSFWProtected && item.rating && item.rating !== "Safe" && !revealedItems.has(item.id) && (
                      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-xl flex flex-col items-center justify-center text-white p-4 text-center z-20">
                        <ShieldAlert className="w-8 h-8 mb-3 opacity-80 text-orange-400" />
                        <span className="text-xs font-bold px-2 py-1 bg-black/40 rounded border border-white/10 mb-2">
                          [ {item.rating} ] 限制级内容
                        </span>
                        <span className="text-sm font-medium opacity-80 flex items-center gap-1.5"><Eye className="w-4 h-4" /> 点击临时查看</span>
                      </div>
                    )}
                    
                    {/* Hide Again Button */}
                    {isNSFWProtected && item.rating && item.rating !== "Safe" && revealedItems.has(item.id) && !isBatchMode && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const newSet = new Set(revealedItems);
                          newSet.delete(item.id);
                          setRevealedItems(newSet);
                        }}
                        className="absolute top-3 left-3 z-20 p-2 bg-black/40 hover:bg-black/60 text-white/90 hover:text-white rounded-full backdrop-blur-sm transition-all"
                        title="重新隐藏"
                      >
                        <EyeOff className="w-4 h-4" />
                      </button>
                    )}
                    
                    {/* Batch Selection Overlay */}
                    {isBatchMode && (
                      <div className="absolute top-3 left-3 z-10">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? "bg-indigo-500 border-indigo-500" : "bg-white/80 border-gray-300 backdrop-blur-sm"}`}>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                      </div>
                    )}

                    {/* Overlay Buttons (Only when NOT in batch mode) */}
                    {!isBatchMode && (
                      <div className={`absolute top-3 right-3 transition-opacity flex gap-2 ${movingItemId === item.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <div className="relative">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setMovingItemId(movingItemId === item.id ? null : item.id); }}
                            className="p-2 bg-white/90 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-full backdrop-blur-sm shadow-sm transition-colors"
                            title="移动画集"
                          >
                            <Folder className="w-4 h-4" />
                          </button>
                          
                          {/* Move Album Dropdown */}
                          {movingItemId === item.id && (
                            <>
                              <div className="fixed inset-0 z-10 cursor-default" onClick={(e) => { e.stopPropagation(); setMovingItemId(null); }} />
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-20 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                <div className="px-4 py-2 text-xs font-semibold text-gray-400 border-b border-gray-100 mb-1 bg-gray-50">移动到...</div>
                                <div className="max-h-48 overflow-y-auto scrollbar-hide relative z-30">
                                  {albums.map(a => (
                                    <button 
                                      key={a.id} 
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-700"
                                      disabled={(item.albumId || 'default') === a.id}
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        const success = await handleUpdateItem(item.id, { albumId: a.id });
                                        if (success) {
                                          showToast(`已移动到 ${a.name}`, "success");
                                          setMovingItemId(null);
                                        }
                                      }}
                                    >
                                      {a.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        <button onClick={(e) => { e.stopPropagation(); setConfirmModal(item.id); }} className="p-2 bg-white/90 hover:bg-red-50 text-gray-600 hover:text-red-500 rounded-full backdrop-blur-sm shadow-sm transition-colors" title="删除记录">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Content Section */}
                  <div className="p-5 flex-1 flex flex-col gap-4">
                    {editingId === item.id ? (
                      <div className="flex-1 flex flex-col gap-3">
                        <textarea autoFocus className="w-full flex-1 min-h-[100px] p-3 rounded-xl border border-indigo-200 bg-indigo-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none scrollbar-hide" placeholder="输入画师提示词或备注..." value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} />
                        <div className="flex justify-between items-center">
                          <select 
                            value={editRating} 
                            onChange={(e) => setEditRating(e.target.value)}
                            className="text-xs bg-white border border-gray-200 text-gray-600 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-500 font-medium"
                          >
                            <option value="Safe">Safe (全年龄)</option>
                            <option value="R">R (轻微限制)</option>
                            <option value="X">X (成人级)</option>
                            <option value="XX">XX (重度限制)</option>
                            <option value="XXX">XXX (极度限制)</option>
                          </select>
                          <div className="flex justify-end gap-2">
                            <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
                            <button onClick={(e) => { e.stopPropagation(); savePrompt(item.id); }} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg flex items-center gap-1.5"><Check className="w-4 h-4" /> 保存</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-2 group/prompt">
                          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">提示词 / 备注</h4>
                          {!isBatchMode && (
                            <button onClick={(e) => { e.stopPropagation(); setEditingId(item.id); setEditPrompt(item.prompt || ""); setEditRating(item.rating || "Safe"); }} className="opacity-0 group-hover/prompt:opacity-100 p-1 text-gray-400 hover:text-indigo-600 transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                          )}
                        </div>
                        {item.prompt ? (
                          <p className="text-sm text-gray-700 font-medium leading-relaxed line-clamp-4 flex-1">{item.prompt}</p>
                        ) : (
                          <p className="text-sm text-gray-400 italic flex-1 flex items-center">暂无提示词{isBatchMode ? "" : "，点击右上角编辑"}</p>
                        )}
                      </div>
                    )}

                    {!editingId && item.prompt && !isBatchMode && (
                      <button onClick={(e) => { e.stopPropagation(); copyToClipboard(item.prompt, item.id); }} className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${copiedId === item.id ? 'bg-green-50 text-green-600 ring-1 ring-green-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 group-hover:bg-indigo-50 group-hover:text-indigo-700'}`}>
                        {copiedId === item.id ? <><Check className="w-4 h-4" /> 已复制!</> : <><Copy className="w-4 h-4" /> 一键复制</>}
                      </button>
                    )}
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
