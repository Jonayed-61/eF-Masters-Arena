"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle, CreditCard, Image as ImageIcon, Loader2, Send, ShieldCheck, Upload, X } from "lucide-react";
import Image from "next/image";

type RegistrationSummary = {
  status: string;
  finalFee: number;
  rejectionReason?: string | null;
  payment?: { status: string; rejectionReason?: string | null } | null;
} | null;

function responseError(data: { error?: string | { message?: string } }, fallback: string) {
  return typeof data.error === "string" ? data.error : data.error?.message || fallback;
}

export function RegistrationModal({
  tournament,
  userRegistration,
  isOpen,
  onClose,
  onSuccess,
}: {
  tournament: { id: string; name: string; slug: string; entryFee: number; currency: string; paymentInstructions?: string | null };
  userRegistration: RegistrationSummary;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const needsExistingPayment = Boolean(userRegistration && ["PENDING_PAYMENT", "REJECTED"].includes(userRegistration.status));
  const [step, setStep] = useState<"registration" | "payment" | "success">(needsExistingPayment ? "payment" : "registration");
  const [method, setMethod] = useState("bKash");
  const [senderNumber, setSenderNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [amountDue, setAmountDue] = useState(userRegistration?.finalFee ?? tournament.entryFee);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  if (!isOpen) return null;

  async function createRegistration(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/tournaments/${tournament.slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ couponCode: couponCode || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(responseError(data, "Registration failed."));
      if (data.requiresPayment) {
        setAmountDue(data.amountDue);
        setStep("payment");
      } else {
        setSuccessMessage("Your tournament place is confirmed.");
        setStep("success");
        onSuccess();
      }
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitPayment(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      if (!screenshotFile) throw new Error("Select a payment proof image.");
      setUploading(true);
      const uploadBody = new FormData();
      uploadBody.append("file", screenshotFile);
      uploadBody.append("type", "payment");
      const uploadResponse = await fetch("/api/v1/uploads/payment-screenshot", { method: "POST", body: uploadBody });
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(responseError(uploadData, "Payment proof upload failed."));
      setUploading(false);

      const response = await fetch(`/api/v1/tournaments/${tournament.slug}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, senderNumber, transactionId, amount: amountDue, screenshot: uploadData.url }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(responseError(data, "Payment submission failed."));
      setSuccessMessage("Your payment proof is awaiting administrator verification.");
      setStep("success");
      onSuccess();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Payment submission failed.");
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  }

  function handleScreenshotChange(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size === 0 || file.size > 5 * 1024 * 1024) {
      setError("Choose a JPG, PNG, or WEBP image smaller than 5 MB.");
      return;
    }
    setError("");
    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
  }

  return (
    <div className="dialog-backdrop">
      <div className="dialog-panel max-w-lg">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-slate-950 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-2"><CreditCard className="h-5 w-5 shrink-0 text-cyan-400" /><h3 className="truncate text-base font-extrabold text-white">Tournament Registration</h3></div>
          <button type="button" onClick={onClose} aria-label="Close registration" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-900 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        {step === "registration" && (
          <form onSubmit={createRegistration} className="custom-scrollbar min-h-0 space-y-4 overflow-y-auto p-4 sm:p-6">
            {error && <div className="flex gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
            <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm">
              <div className="flex flex-col gap-1 text-slate-400 min-[390px]:flex-row min-[390px]:justify-between"><span className="shrink-0">Tournament</span><span className="break-words font-semibold text-white min-[390px]:text-right">{tournament.name}</span></div>
              <div className="flex justify-between text-slate-400"><span>Entry fee</span><span className="font-semibold text-white">{tournament.currency} {tournament.entryFee}</span></div>
            </div>
            {tournament.entryFee > 0 && <div><label className="text-xs font-semibold text-slate-300">Coupon code (optional)</label><input value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} maxLength={64} className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-white" /></div>}
            <p className="text-xs leading-relaxed text-slate-400">Submitting creates your registration. Paid registrations continue to a separate payment-proof step.</p>
            <button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 py-3 text-sm font-extrabold text-black disabled:opacity-60">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{submitting ? "Registering..." : "Create registration"}</button>
          </form>
        )}

        {step === "payment" && (
          <form onSubmit={submitPayment} className="custom-scrollbar min-h-0 space-y-4 overflow-y-auto p-4 sm:p-6">
            {error && <div className="flex gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
            {(userRegistration?.rejectionReason || userRegistration?.payment?.rejectionReason) && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">Previous submission rejected: {userRegistration.rejectionReason || userRegistration.payment?.rejectionReason}</div>}
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-xs text-cyan-100">
              <p className="mb-2 flex items-center gap-1 font-bold"><ShieldCheck className="h-4 w-4" />Tournament payment instructions</p>
              <p className="whitespace-pre-wrap break-words text-slate-300">{tournament.paymentInstructions || "The organizer has not configured payment instructions. Contact support before paying."}</p>
              <p className="mt-3 font-bold text-white">Amount due: {tournament.currency} {amountDue}</p>
            </div>
            <div><label className="text-xs font-semibold text-slate-300">Payment method</label><select value={method} onChange={(event) => setMethod(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"><option>bKash</option><option>Nagad</option><option>Rocket</option><option value="Gateway">Manual/custom method</option></select></div>
            <div><label className="text-xs font-semibold text-slate-300">Sender/account reference</label><input required minLength={6} maxLength={32} value={senderNumber} onChange={(event) => setSenderNumber(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white" /></div>
            <div><label className="text-xs font-semibold text-slate-300">Transaction/reference ID</label><input required minLength={4} maxLength={128} value={transactionId} onChange={(event) => setTransactionId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-white" /></div>
            <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-cyan-500/40 bg-cyan-500/5 p-4 text-center">
              {screenshotPreview ? <Image src={screenshotPreview} alt="Selected payment proof" width={448} height={288} unoptimized className="max-h-36 w-auto rounded-lg object-contain" /> : <><ImageIcon className="h-7 w-7 text-cyan-400" /><span className="text-xs font-bold text-slate-200">Choose payment proof</span><span className="text-[11px] text-slate-500">JPG, PNG, or WEBP up to 5 MB</span></>}
              <input type="file" required accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => handleScreenshotChange(event.target.files?.[0])} />
            </label>
            {screenshotFile && <p className="flex items-center gap-1 text-[11px] text-emerald-400"><Upload className="h-3 w-3" />{screenshotFile.name}</p>}
            <button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 py-3 text-sm font-extrabold text-black disabled:opacity-60">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{uploading ? "Uploading proof..." : submitting ? "Submitting..." : "Submit payment proof"}</button>
          </form>
        )}

        {step === "success" && <div className="custom-scrollbar min-h-0 space-y-4 overflow-y-auto p-6 text-center sm:p-8"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/20 text-emerald-400"><CheckCircle className="h-10 w-10" /></div><h4 className="text-xl font-extrabold text-white">Submitted successfully</h4><p className="break-words text-sm text-slate-300">{successMessage}</p><button onClick={() => { onClose(); window.location.reload(); }} className="min-h-11 rounded-xl bg-cyan-500 px-6 py-2.5 text-xs font-bold text-black">Close and refresh</button></div>}
      </div>
    </div>
  );
}
