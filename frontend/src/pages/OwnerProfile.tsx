import { useEffect, useState } from "react";
import { getBusinessProfile, updateBusinessProfile, type OwnerBusiness } from "../services/api";

export default function OwnerProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [biz, setBiz] = useState<OwnerBusiness | null>(null);

  const [address, setAddress] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    (async () => {
      setErr(null);
      try {
        const b = await getBusinessProfile();
        setBiz(b);
        setAddress(b.address ?? "");
        setState(b.state ?? "");
        setCity(b.city ?? "");
        setPostcode(b.postcode ?? "");
        setPhone(b.phone ?? "");
      } catch (e: Error | unknown) {
        setErr(e instanceof Error ? e.message : "Failed to load business profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    setErr(null);
    setOk(null);
    try {
      const updated = await updateBusinessProfile({
        address,
        state,
        city,
        postcode,
        phone,
      });
      setBiz(updated);
      setOk("Profile updated");
      localStorage.setItem("smashit_owner_business", JSON.stringify(updated));
      window.dispatchEvent(new Event("smashit:business-updated"));
    } catch (e: Error | unknown) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-slate-600">Loading profile…</div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="font-outfit text-2xl font-extrabold text-slate-900">
          Business Profile
        </h1>
        <p className="mt-1 text-slate-600">
          Fill in your business details (shown to customers).
        </p>

        {biz && (
          <div className="mt-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{biz.name}</span>{" "}
            <span className="text-slate-400">•</span>{" "}
            <span className="font-mono text-xs">#{biz.slug}</span>
          </div>
        )}

        {err && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {err}
          </div>
        )}

        {ok && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {ok}
          </div>
        )}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-600">Address</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              placeholder="Full address"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">State</label>
            <input
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              placeholder="e.g. Selangor"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">City</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              placeholder="e.g. Puchong"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Postcode</label>
            <input
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              placeholder="e.g. 47100"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              placeholder="e.g. 0123456789"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={save}
            disabled={saving}
            className="h-10 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
