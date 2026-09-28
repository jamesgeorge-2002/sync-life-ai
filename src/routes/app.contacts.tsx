import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Users, Phone, Plus, X, Trash, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { getContacts, addContact, deleteContact, Contact } from "@/lib/db";

export const Route = createFileRoute("/app/contacts")({ component: ContactsPage });

function ContactsPage() {
  const { user: authUser } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  // New Contact form state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactType, setContactType] = useState("Friend");

  const fetchContacts = async () => {
    if (!authUser) return;
    try {
      const list = await getContacts(authUser.uid);
      setContacts(list);
    } catch (err) {
      console.error("Failed to load contacts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [authUser]);

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !contactName.trim() || !contactPhone.trim()) return;

    try {
      await addContact(authUser.uid, {
        name: contactName,
        role: contactRole || "Contact",
        phone: contactPhone,
        type: contactType,
      });
      setContactName("");
      setContactRole("");
      setContactPhone("");
      setIsAddOpen(false);
      fetchContacts();
    } catch (err) {
      console.error("Failed to create contact", err);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!authUser) return;
    if (!confirm("Are you sure you want to delete this contact?")) return;
    try {
      await deleteContact(authUser.uid, id);
      fetchContacts();
    } catch (err) {
      console.error("Failed to delete contact", err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Syncing contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl relative">
      <PageHeader
        title="Contacts"
        description="Family, friends, doctors and emergency contacts."
        icon={<Users className="h-5 w-5" />}
        actions={
          <Button className="rounded-full bg-gradient-primary cursor-pointer" onClick={() => setIsAddOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />New Contact
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {contacts.map((c) => {
          const initials = c.name
            .split(" ")
            .map((w) => w[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
          return (
            <div key={c.id} className="glass rounded-2xl p-6 relative group">
              <button
                onClick={() => handleDeleteContact(c.id)}
                className="absolute right-4 top-4 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1"
              >
                <Trash className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-primary text-primary-foreground font-bold text-sm">
                  {initials || "C"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.role}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">{c.type}</span>
                <a href={`tel:${c.phone}`} className="text-xs text-primary flex items-center gap-1 font-semibold hover:underline">
                  <Phone className="h-3 w-3" />
                  {c.phone}
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Contact Overlay Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md rounded-2xl p-6 shadow-2xl relative border border-white/10 animate-in fade-in-0 zoom-in-95 duration-200">
            <button
              onClick={() => setIsAddOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-muted cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-primary" /> Add New Contact
            </h3>
            <form onSubmit={handleCreateContact} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
                <Input
                  required
                  placeholder="e.g. Sarah Patel"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Role / Relationship</label>
                <Input
                  placeholder="e.g. Manager, Doctor, Best Friend"
                  value={contactRole}
                  onChange={(e) => setContactRole(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Phone Number</label>
                  <Input
                    required
                    placeholder="+1 555-0199"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Category Type</label>
                  <select
                    value={contactType}
                    onChange={(e) => setContactType(e.target.value)}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="Friend">Friend</option>
                    <option value="Family">Family</option>
                    <option value="Work">Work</option>
                    <option value="Doctor">Doctor</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-full cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" className="rounded-full bg-gradient-primary cursor-pointer">
                  Add Contact
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}