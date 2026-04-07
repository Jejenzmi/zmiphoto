import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Ticket, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Voucher {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  max_uses: number;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

const emptyForm = {
  code: "",
  discount_type: "fixed",
  discount_value: 0,
  max_uses: 1,
  is_active: true,
  expires_at: "",
};

const AdminVouchers = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Voucher | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchVouchers = async () => {
    const { data } = await supabase.from("vouchers").select("*").order("created_at", { ascending: false });
    setVouchers(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchVouchers(); }, []);

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    return `ZMI-${code}`;
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, code: generateCode() });
    setDialogOpen(true);
  };

  const openEdit = (v: Voucher) => {
    setEditing(v);
    setForm({
      code: v.code,
      discount_type: v.discount_type,
      discount_value: v.discount_value,
      max_uses: v.max_uses,
      is_active: v.is_active,
      expires_at: v.expires_at ? v.expires_at.slice(0, 16) : "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) { toast.error("Kode voucher wajib diisi"); return; }

    const payload = {
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      discount_value: form.discount_value,
      max_uses: form.max_uses,
      is_active: form.is_active,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    };

    if (editing) {
      const { error } = await supabase.from("vouchers").update(payload).eq("id", editing.id);
      if (error) { toast.error("Gagal update: " + error.message); return; }
      toast.success("Voucher diperbarui");
    } else {
      const { error } = await supabase.from("vouchers").insert(payload);
      if (error) { toast.error("Gagal buat: " + error.message); return; }
      toast.success("Voucher dibuat");
    }
    setDialogOpen(false);
    fetchVouchers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus voucher ini?")) return;
    const { error } = await supabase.from("vouchers").delete().eq("id", id);
    if (error) { toast.error("Gagal hapus: " + error.message); return; }
    toast.success("Voucher dihapus");
    fetchVouchers();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Kode disalin");
  };

  const formatDiscount = (v: Voucher) => {
    if (v.discount_type === "free") return "GRATIS";
    if (v.discount_type === "percentage") return `${v.discount_value}%`;
    return `Rp ${v.discount_value.toLocaleString("id-ID")}`;
  };

  const activeCount = vouchers.filter(v => v.is_active).length;
  const totalRedeemed = vouchers.reduce((s, v) => s + v.used_count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Kelola Voucher</h2>
          <p className="text-sm text-muted-foreground">Buat dan kelola kode voucher diskon</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Buat Voucher</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Voucher</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{vouchers.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Aktif</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-primary">{activeCount}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Redeem</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totalRedeemed}</p></CardContent></Card>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Diskon</TableHead>
              <TableHead>Penggunaan</TableHead>
              <TableHead>Kadaluarsa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Memuat...</TableCell></TableRow>
            ) : vouchers.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada voucher</TableCell></TableRow>
            ) : vouchers.map((v) => (
              <TableRow key={v.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-primary" />
                    <code className="font-mono font-bold">{v.code}</code>
                    <button onClick={() => copyCode(v.code)} className="text-muted-foreground hover:text-foreground"><Copy className="w-3 h-3" /></button>
                  </div>
                </TableCell>
                <TableCell>{formatDiscount(v)}</TableCell>
                <TableCell>{v.used_count} / {v.max_uses}</TableCell>
                <TableCell>{v.expires_at ? format(new Date(v.expires_at), "dd/MM/yyyy HH:mm") : "—"}</TableCell>
                <TableCell>
                  <Badge variant={v.is_active ? "default" : "secondary"}>{v.is_active ? "Aktif" : "Nonaktif"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(v)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Voucher" : "Buat Voucher Baru"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Kode Voucher</Label>
              <div className="flex gap-2">
                <Input value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="DISKON50" className="font-mono uppercase" />
                <Button type="button" variant="outline" size="icon" onClick={() => setForm({...form, code: generateCode()})} title="Generate kode acak">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label>Tipe Diskon</Label>
              <Select value={form.discount_type} onValueChange={v => setForm({...form, discount_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Potongan Tetap (Rp)</SelectItem>
                  <SelectItem value="percentage">Persentase (%)</SelectItem>
                  <SelectItem value="free">Gratis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.discount_type !== "free" && (
              <div>
                <Label>{form.discount_type === "percentage" ? "Nilai (%)" : "Nilai (Rp)"}</Label>
                <Input type="number" value={form.discount_value} onChange={e => setForm({...form, discount_value: Number(e.target.value)})} />
              </div>
            )}
            <div>
              <Label>Maks Penggunaan</Label>
              <Input type="number" value={form.max_uses} onChange={e => setForm({...form, max_uses: Number(e.target.value)})} min={1} />
            </div>
            <div>
              <Label>Kadaluarsa (opsional)</Label>
              <Input type="datetime-local" value={form.expires_at} onChange={e => setForm({...form, expires_at: e.target.value})} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({...form, is_active: v})} />
              <Label>Aktif</Label>
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? "Simpan Perubahan" : "Buat Voucher"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminVouchers;
