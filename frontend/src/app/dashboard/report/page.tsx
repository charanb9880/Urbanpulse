"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Upload,
  MapPin,
  AlertTriangle,
  Zap,
  Camera,
} from "lucide-react";
import Link from "next/link";

export default function ReportIncident() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    location: "",
    severity: "Medium",
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const categories = [
    "Accident",
    "Flood",
    "Pothole",
    "Road Damage",
    "Traffic Blockage",
    "Fallen Tree",
    "Infrastructure Failure",
  ];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSubmitting(false);
    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mb-6">
            <Zap className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Report Submitted!</h1>
          <p className="text-slate-400 mb-8 max-w-md">
            Thank you for helping make Bengaluru safer. Our AI is analyzing your report now.
          </p>
          <Link
            href="/dashboard"
            className="bg-gradient-to-r from-primary-500 to-accent-500 px-8 py-3 rounded-full font-semibold hover:shadow-lg hover:shadow-primary-500/20 transition-all inline-flex items-center gap-2"
          >
            Back to Dashboard
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 backdrop-blur-xl"
        >
          <div className="text-center mb-8">
            <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Report an Incident</h1>
            <p className="text-slate-400">Help us make Bengaluru better</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                placeholder="Brief description of the incident"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all h-32 resize-none"
                placeholder="Provide more details about what happened"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                required
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                  placeholder="Enter location or use current location"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Severity</label>
              <div className="grid grid-cols-3 gap-3">
                {["Low", "Medium", "High"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFormData({ ...formData, severity: s })}
                    className={`px-4 py-3 rounded-xl border transition-all ${
                      formData.severity === s
                        ? "bg-gradient-to-r from-primary-500/20 to-accent-500/20 border-primary-500"
                        : "bg-slate-900/50 border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Upload Photo
              </label>
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setImagePreview(null)}
                    className="absolute top-2 right-2 p-1 rounded-full bg-slate-900/80 hover:bg-slate-800"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 rounded-xl border-2 border-dashed border-slate-700 hover:border-slate-600 cursor-pointer bg-slate-900/30 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-10 h-10 mb-3 text-slate-500" />
                    <p className="mb-2 text-sm text-slate-400">
                      <span className="font-semibold">Click to upload</span> or
                      drag and drop
                    </p>
                    <p className="text-xs text-slate-500">
                      PNG, JPG up to 10MB
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-primary-500 to-accent-500 px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-primary-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Submitting...
                </>
              ) : (
                "Submit Report"
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
