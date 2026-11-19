import { useState } from "react";
import toast from "react-hot-toast";
import { usePreferences } from "../hooks/usePreferences";
import { preferenceService } from "../services";
import { DIETARY_OPTIONS } from "../utils/constants";

const EMPTY = { maxBudget: null, sameCategoryOnly: true, organicOnly: false, dietaryRestrictions: [], preferredBrands: [] };
const toForm = (p) => ({ ...p, maxBudget: p.maxBudget ?? "", preferredBrands: p.preferredBrands.join(", ") });
const toPayload = (f) => ({
  ...f,
  maxBudget: f.maxBudget === "" ? null : Number(f.maxBudget),
  preferredBrands: f.preferredBrands.split(",").map((b) => b.trim()).filter(Boolean),
});

const PreferencesPage = () => {
  const { preferences, savePreferences, resetPreferences } = usePreferences();
  const [form, setForm] = useState(() => toForm(preferences));

  const toggleDietary = (option) =>
    setForm((prev) => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(option)
        ? prev.dietaryRestrictions.filter((d) => d !== option)
        : [...prev.dietaryRestrictions, option],
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.maxBudget !== "" && Number(form.maxBudget) < 0) { toast.error("Budget cannot be negative"); return; }
    const payload = toPayload(form);
    savePreferences(payload);
    try {
      await preferenceService.save(payload);
      toast.success("Preferences saved");
    } catch (err) {
      toast.error(`Saved on this device, but sync failed: ${err.message}`);
    }
  };

  const handleReset = async () => {
    resetPreferences();
    setForm(toForm(EMPTY));
    try { await preferenceService.save(EMPTY); toast.success("Preferences reset"); }
    catch (err) { toast.error(`Reset on this device, but sync failed: ${err.message}`); }
  };

  return (
    <div className="narrow">
      <h1>Substitution Preferences</h1>
      <p className="muted">These rules are strict: substitutes that break them will never be shown.</p>

      <form className="card" onSubmit={handleSubmit}>
        <label className="form-field">Maximum price per item ($)
          <input type="number" min="0" step="0.01" value={form.maxBudget} onChange={(e) => setForm({ ...form, maxBudget: e.target.value })} placeholder="No limit" />
        </label>
        <label className="checkbox-field">
          <input type="checkbox" checked={form.sameCategoryOnly} onChange={(e) => setForm({ ...form, sameCategoryOnly: e.target.checked })} />
          Only suggest products from the same category
        </label>
        <label className="checkbox-field">
          <input type="checkbox" checked={form.organicOnly} onChange={(e) => setForm({ ...form, organicOnly: e.target.checked })} />
          Organic only
        </label>
        <fieldset className="form-field">
          <legend>Dietary restrictions</legend>
          <div className="tag-row">
            {DIETARY_OPTIONS.map((opt) => (
              <label key={opt} className="checkbox-field">
                <input type="checkbox" checked={form.dietaryRestrictions.includes(opt)} onChange={() => toggleDietary(opt)} />{opt}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="form-field">Preferred brands (soft preference, comma separated)
          <input value={form.preferredBrands} onChange={(e) => setForm({ ...form, preferredBrands: e.target.value })} placeholder="OatLand, GreenFarm" />
        </label>
        <div className="hero-actions">
          <button type="submit" className="btn btn-primary">Save Preferences</button>
          <button type="button" className="btn btn-outline" onClick={handleReset}>Reset</button>
        </div>
      </form>
    </div>
  );
};
export default PreferencesPage;
