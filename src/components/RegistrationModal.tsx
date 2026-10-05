"use client";

import { useState } from "react";
import { X, CheckCircle, CreditCard, ShieldCheck, AlertCircle, Send, Upload, Image as ImageIcon, Loader2 } from "lucide-react";

export function RegistrationModal({
  tournament,
  isOpen,
  onClose,
  onSuccess,
}: {
  tournament: {
    id: string;
    name: string;
    slug: string;
    entryFee: number;
    currency: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [method, setMethod] = useState("bKash");
  const [senderNumber, setSenderNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [screenshot, setScreenshot] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [finalFee, setFinalFee] = useState(tournament.entryFee);
  const [couponMsg, setCouponMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);

  if (!isOpen) return null;

  const handleValidateCoupon = async () => {
    if (!couponCode) return;
    try {
      const res = await fetch("/api/v1/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, originalPrice: tournament.entryFee }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDiscountAmount(data.coupon.discountAmount);
        setFinalFee(data.coupon.finalPrice);
        setCouponMsg(`✅ Code '${data.coupon.code}' applied! Saved ৳${data.coupon.discountAmount}`);
      } else {
        setCouponMsg(`❌ ${data.error || "Invalid coupon"}`);
      }
    } catch {
      setCouponMsg("❌ Failed to validate coupon");
    }
  };

  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      let screenshotUrl = screenshot;
      if (tournament.entryFee > 0) {
        if (!screenshotFile) throw new Error("Please upload your payment screenshot.");

        setUploading(true);
        const uploadBody = new FormData();
        uploadBody.append("file", screenshotFile);
        const uploadRes = await fetch("/api/v1/uploads/payment-screenshot", { method: "POST", body: uploadBody });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "Screenshot upload failed");
        screenshotUrl = uploadData.url;
        setUploading(false);
      }

      const res = await fetch(`/api/v1/tournaments/${tournament.slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          senderNumber,
          transactionId,
          amount: finalFee,
          screenshot: screenshotUrl,
          couponCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setStep(3); // Success step
      onSuccess();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Registration failed";
      setError(errorMsg);
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  };

  const handleScreenshotChange = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Screenshot must be smaller than 5MB.");
      return;
    }
    setError("");
    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg max-h-[92vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-cyan-400" />
            <h3 className="font-extrabold text-white text-base">Tournament Registration</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1 & 2 Form Content */}
        {step === 1 && (
          <form onSubmit={handleSubmitRegistration} className="p-4 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Tournament</span>
                <span className="font-semibold text-white">{tournament.name}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Entry Fee</span>
                <span className="font-semibold text-white">৳{tournament.entryFee}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-xs text-emerald-400 font-semibold">
                  <span>Discount</span>
                  <span>-৳{discountAmount}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-cyan-400 border-t border-slate-800 pt-2">
                <span>Total Payable</span>
                <span>৳{finalFee}</span>
              </div>
            </div>

            {tournament.entryFee > 0 && (
              <>
                {/* Official Merchant Numbers */}
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300 space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" /> Official Mobile Banking Account:
                  </p>
                  <p>• bKash (Personal): <span className="font-mono text-white font-bold">01700000000</span></p>
                  <p>• Nagad (Personal): <span className="font-mono text-white font-bold">01800000001</span></p>
                  <p className="text-[11px] text-slate-400 mt-1">Send ৳{finalFee} via Cash In / Send Money and enter TrxID below.</p>
                </div>

                {/* Coupon Code Input */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Discount Coupon (Optional)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. SEASON4"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs uppercase font-mono text-white focus:border-cyan-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleValidateCoupon}
                      className="px-3 py-2 rounded-xl bg-slate-800 text-cyan-400 font-bold text-xs hover:bg-slate-700"
                    >
                      Apply
                    </button>
                  </div>
                  {couponMsg && <p className="text-[11px] mt-1 font-medium">{couponMsg}</p>}
                </div>

                {/* Payment Method Radio */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Select Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["bKash", "Nagad", "Rocket"].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMethod(m)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          method === m
                            ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sender Number */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Sender Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="01711223344"
                    value={senderNumber}
                    onChange={(e) => setSenderNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-cyan-500 outline-none"
                  />
                </div>

                {/* Transaction ID */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Transaction ID (TrxID)</label>
                  <input
                    type="text"
                    required
                    placeholder="TRX98765432"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:border-cyan-500 outline-none"
                  />
                </div>

                {/* Payment screenshot upload */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Payment Screenshot</label>
                  <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-cyan-500/40 bg-cyan-500/5 px-4 py-4 text-center transition-colors hover:border-cyan-400 hover:bg-cyan-500/10">
                    {screenshotPreview ? (
                      <img src={screenshotPreview} alt="Selected payment screenshot preview" className="max-h-36 rounded-lg object-contain" />
                    ) : (
                      <>
                        <ImageIcon className="h-7 w-7 text-cyan-400" />
                        <span className="text-xs font-bold text-slate-200">Choose screenshot image</span>
                        <span className="text-[11px] text-slate-500">JPG, PNG or WEBP up to 5MB</span>
                      </>
                    )}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => handleScreenshotChange(e.target.files?.[0])} />
                  </label>
                  {screenshotFile && <p className="flex items-center gap-1 text-[11px] text-emerald-400"><Upload className="h-3 w-3" /> {screenshotFile.name}</p>}
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 text-black font-extrabold text-sm shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-emerald-300 transition-all flex items-center justify-center gap-2"
            >
              {uploading ? "Uploading screenshot..." : submitting ? "Processing..." : tournament.entryFee === 0 ? "Confirm Free Registration" : "Submit Payment & Register"}
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        )}

        {/* Step 3: Success Screen */}
        {step === 3 && (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40 animate-bounce">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-extrabold text-white">Registration Submitted!</h4>
            <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
              Your registration details and payment transaction have been received. An administrator will review your payment shortly.
            </p>
            <button
              onClick={() => {
                onClose();
                window.location.reload();
              }}
              className="px-6 py-2.5 rounded-xl bg-cyan-500 text-black font-bold text-xs"
            >
              Close & Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
