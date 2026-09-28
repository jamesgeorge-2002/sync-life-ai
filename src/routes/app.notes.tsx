import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StickyNote, Plus, Search, Sparkles, Save, Trash } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { getNotes, addNote, updateNote, deleteNote, Note } from "@/lib/db";

export const Route = createFileRoute("/app/notes")({ component: NotesPage });

function NotesPage() {
  const { user: authUser } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Edit fields
  const [editTitle, setEditTitle] = useState("");
  const [editTag, setEditTag] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isModified, setIsModified] = useState(false);

  const fetchNotes = async (selectId?: string) => {
    if (!authUser) return;
    try {
      const list = await getNotes(authUser.uid);
      setNotes(list);

      if (list.length > 0) {
        let active = list[0];
        if (selectId) {
          active = list.find((n) => n.id === selectId) || list[0];
        }
        setSelectedNote(active);
        setEditTitle(active.title);
        setEditTag(active.tag);
        setEditContent(active.content || "");
        setIsModified(false);
      } else {
        setSelectedNote(null);
      }
    } catch (err) {
      console.error("Error loading notes", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [authUser]);

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setEditTitle(note.title);
    setEditTag(note.tag);
    setEditContent(note.content || "");
    setIsModified(false);
  };

  const handleCreateNote = async () => {
    if (!authUser) return;
    try {
      const newId = await addNote(authUser.uid, {
        title: "Untitled Note",
        tag: "General",
        content: "",
        updated: "Just now",
      });
      fetchNotes(newId);
    } catch (err) {
      console.error("Failed to create note", err);
    }
  };

  const handleSaveNote = async () => {
    if (!authUser || !selectedNote) return;
    try {
      await updateNote(authUser.uid, selectedNote.id, {
        title: editTitle,
        tag: editTag,
        content: editContent,
        updated: "Just now",
      });
      setIsModified(false);
      fetchNotes(selectedNote.id);
    } catch (err) {
      console.error("Failed to save note", err);
    }
  };

  const handleDeleteNote = async () => {
    if (!authUser || !selectedNote) return;
    if (!confirm("Are you sure you want to delete this note?")) return;
    try {
      await deleteNote(authUser.uid, selectedNote.id);
      fetchNotes();
    } catch (err) {
      console.error("Failed to delete note", err);
    }
  };

  const handleValueChange = (field: "title" | "tag" | "content", value: string) => {
    if (field === "title") setEditTitle(value);
    if (field === "tag") setEditTag(value);
    if (field === "content") setEditContent(value);
    setIsModified(true);
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.content && n.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
      n.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Retrieving your notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Notes"
        description="A second brain, powered by RAG search."
        icon={<StickyNote className="h-5 w-5" />}
        actions={
          <Button className="rounded-full bg-gradient-primary cursor-pointer" onClick={handleCreateNote}>
            <Plus className="mr-1 h-4 w-4" />New note
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="glass rounded-2xl p-4 flex flex-col h-[calc(100vh-16rem)] overflow-hidden">
          <div className="relative mb-3 shrink-0">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 h-9 rounded-full bg-muted/50 border-0"
              placeholder="Search notes"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <ul className="space-y-1 overflow-y-auto flex-1 pr-1">
            {filteredNotes.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No notes found.</p>
            ) : (
              filteredNotes.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleSelectNote(n)}
                    className={`w-full rounded-lg p-2 text-left transition-colors cursor-pointer ${
                      selectedNote?.id === n.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                  >
                    <p className="truncate text-sm font-medium">{n.title}</p>
                    <p className={`text-[10px] ${selectedNote?.id === n.id ? "text-primary-foreground/85" : "text-muted-foreground"}`}>
                      {n.tag}
                    </p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>

        <article className="glass rounded-2xl p-6 flex flex-col h-[calc(100vh-16rem)] overflow-hidden">
          {selectedNote ? (
            <div className="flex flex-col h-full space-y-4">
              <div className="flex items-center justify-between shrink-0">
                <div className="flex-1 mr-4">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => handleValueChange("title", e.target.value)}
                    placeholder="Note Title"
                    className="w-full text-2xl font-bold bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none py-1 transition-colors"
                  />
                  <input
                    type="text"
                    value={editTag}
                    onChange={(e) => handleValueChange("tag", e.target.value)}
                    placeholder="Tag (e.g. Work, Ideas)"
                    className="w-full text-xs text-muted-foreground bg-transparent border-0 outline-none mt-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full cursor-pointer text-red-500 hover:text-red-600 hover:bg-red-50/10"
                    onClick={handleDeleteNote}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    disabled={!isModified}
                    onClick={handleSaveNote}
                    className="rounded-full cursor-pointer bg-gradient-primary disabled:opacity-50"
                  >
                    <Save className="mr-1 h-4 w-4" />Save
                  </Button>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <textarea
                  value={editContent}
                  onChange={(e) => handleValueChange("content", e.target.value)}
                  placeholder="Start writing..."
                  className="w-full h-full bg-transparent resize-none border-0 outline-none text-sm leading-relaxed text-muted-foreground focus:text-foreground placeholder:text-muted-foreground/50 font-sans"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <StickyNote className="h-12 w-12 mb-3 text-muted-foreground/60" />
              <p className="text-sm font-medium">Select a note to view or edit</p>
              <Button variant="link" size="sm" onClick={handleCreateNote}>
                Create a note now
              </Button>
            </div>
          )}
        </article>
      </div>
    </div>
  );
}