import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

type Entry = {
  date: string;
  voiceLines: string;   // Voice Lines
  bts: string;          // BTS
  iot: string;          // IOT
  hsi: string;          // HSI
  accessories: string;  // Accessories ($)
  protection: string;   // Protection (count)
  planName: string;     // Name of Plan
  mrc: string;          // MRC ($)
};

const performanceFormSchema = z.object({
  date: z
    .string()
    .nonempty({ message: "Date is required" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Enter a valid date (YYYY-MM-DD)" }),

  voiceLines: z.string().regex(/^\d+$/, "Must be a whole number"),
  bts:        z.string().regex(/^\d+$/, "Must be a whole number"),
  iot:        z.string().regex(/^\d+$/, "Must be a whole number"),
  hsi:        z.string().regex(/^\d+$/, "Must be a whole number"),

  accessories: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid dollar amount"),
  protection:  z.string().regex(/^\d+$/, "Must be a whole number"),
  planName:    z.string().nonempty({ message: "Plan Name is required" }),
  mrc:         z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid dollar amount"),
});
type PerformanceFormValues = z.infer<typeof performanceFormSchema>;

export default function PerformanceTracker() {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  // 1️⃣ Form setup (defaultValues match schema)
  const formHook = useForm<PerformanceFormValues>({
    resolver: zodResolver(performanceFormSchema),
    mode: "onChange",
    defaultValues: {
      date: today,
      voiceLines: "",
      bts: "",
      iot: "",
      hsi: "",
      accessories: "",
      protection: "",
      planName: "",
      mrc: "",
    },
  });

  // 2️⃣ Entries state (load from localStorage if present)
  const [entries, setEntries] = useState<Entry[]>(() => {
    const saved = localStorage.getItem("entries");
    return saved ? JSON.parse(saved) : [];
  });

  // 3️⃣ Persist entries whenever they change
  useEffect(() => {
    localStorage.setItem("entries", JSON.stringify(entries));
  }, [entries]);

  // 4️⃣ Handle form submit
  const onSubmit = (values: PerformanceFormValues) => {
    setEntries([values, ...entries]);
    formHook.reset();
  };

  // ── Recompute all summary metrics ─────────────────────────────────

  // 1) Total voiceLines
  const totalVoiceLines = entries.reduce(
    (sum, e) => sum + Number(e.voiceLines),
    0
  );

  // 2) Total BTS
  const totalBts = entries.reduce((sum, e) => sum + Number(e.bts), 0);

  // 3) Total IOT
  const totalIot = entries.reduce((sum, e) => sum + Number(e.iot), 0);

  // 4) Total HSI
  const totalHsi = entries.reduce((sum, e) => sum + Number(e.hsi), 0);

  // 5) Total Lines (all four combined)
  const totalLines = totalVoiceLines + totalBts + totalIot + totalHsi;

  // 6) Total Accessories ($)
  const totalAccessories = entries.reduce(
    (sum, e) => sum + Number(e.accessories),
    0
  );

  // 7) Average Protection (count per entry)
  const averageProtection =
    entries.length > 0
      ? (
          entries.reduce((sum, e) => sum + Number(e.protection), 0) /
          entries.length
        ).toFixed(1) // one decimal place
      : "0.0";

  // 8) Average MRC ($)
  const averageMRC =
    entries.length > 0
      ? (
          entries.reduce((sum, e) => sum + Number(e.mrc), 0) /
          entries.length
        ).toFixed(2)
      : "0.00";

  // 9️⃣ Tip from LLM API (always fetch whenever `entries` changes)
  const [tip, setTip] = useState<string>("");
  const [isLoadingTip, setIsLoadingTip] = useState<boolean>(false);

  useEffect(() => {
    setIsLoadingTip(true);

    async function fetchTip() {
      console.log("🛰️ [Tip] Fetching tip with entries:", entries);

      // ➊ Grab the current token from localStorage
      const token = localStorage.getItem("authToken");
      console.log("🛰️ [Tip] Using authToken:", token);

      try {
        // ➋ Use full backend URL
        const res = await fetch("http://localhost:4000/api/generateTip", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ entries }),
        });
        console.log("🛰️ [Tip] Response status:", res.status);

        // Always read the raw text, even if status is not OK
        const raw = await res.text();
        console.log("🛰️ [Tip] Raw response text:", raw);

        if (!res.ok) {
          // Show the raw response so you can see any error message
          setTip(`(error) ${raw}`);
          setIsLoadingTip(false);
          return;
        }

        // Try to parse JSON
        let data: { tip?: string };
        try {
          data = JSON.parse(raw);
        } catch (parseErr) {
          console.error("🛰️ [Tip] JSON parse error:", parseErr);
          // Show raw text so you know what arrived
          setTip(`(invalid JSON) ${raw}`);
          setIsLoadingTip(false);
          return;
        }

        if (data.tip) {
          setTip(data.tip);
        } else {
          // If there's no "tip" field, show raw JSON so you can inspect it
          setTip(`(no "tip" field) ${JSON.stringify(data)}`);
        }
      } catch (err) {
        console.error("🛰️ [Tip] fetch threw an error:", err);
        setTip(`(fetch error) ${String(err)}`);
      } finally {
        setIsLoadingTip(false);
      }
    }

    fetchTip();
  }, [entries]);

  // 🔟 Clear Database with confirmation
  const handleClearDatabase = () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete ALL entries? This action cannot be undone."
    );
    if (!confirmed) return;

    localStorage.removeItem("entries");
    setEntries([]);
  };

  // Logout handler (unchanged)
  const handleLogout = () => {
    localStorage.removeItem("authToken");
    navigate("/login");
  };

  return (
    <div className="p-6 space-y-8">
      {/* ➡️ Logout button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={handleLogout}
          className="text-sm text-red-600"
        >
          Log out
        </Button>
      </div>

      {/* ===== Form + Latest Overview ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* ── Enter Daily Sales Form ───────────────────────────────────────── */}
        <Card>
          <CardContent className="space-y-4 pt-6">
            <h2 className="text-xl font-semibold">Enter Daily Sales</h2>
            <Form {...formHook}>
              <form
                onSubmit={formHook.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                {/* 1) Date */}
                <FormField
                  control={formHook.control}
                  name="date"
                  render={({ field: hookField }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...hookField}
                          required
                          type="date"
                          className="text-gray-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 2) Voice Lines / BTS / IOT / HSI */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {(
                    [
                      ["voiceLines", "Voice Lines"],
                      ["bts", "BTS"],
                      ["iot", "IOT"],
                      ["hsi", "HSI"],
                    ] as const
                  ).map(([fieldName, label]) => (
                    <FormField
                      key={fieldName}
                      control={formHook.control}
                      name={fieldName as any}
                      render={({ field: hookField }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              {...hookField}
                              required
                              type="text"
                              placeholder={label}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>

                {/* 3) Protection / Accessories ($) / MRC ($) / Name of Plan */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Protection */}
                  <FormField
                    control={formHook.control}
                    name="protection"
                    render={({ field: hookField }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...hookField}
                            required
                            type="text"
                            placeholder="Protection"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Accessories ($) */}
                  <FormField
                    control={formHook.control}
                    name="accessories"
                    render={({ field: hookField }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...hookField}
                            required
                            type="text"
                            placeholder="Accessories $"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* MRC ($) */}
                  <FormField
                    control={formHook.control}
                    name="mrc"
                    render={({ field: hookField }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...hookField}
                            required
                            type="text"
                            placeholder="MRC $"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Name of Plan */}
                  <FormField
                    control={formHook.control}
                    name="planName"
                    render={({ field: hookField }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...hookField}
                            required
                            type="text"
                            placeholder="Name of Plan"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" disabled={!formHook.formState.isValid}>
                  Submit
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* ── Latest Entry Overview ──────────────────────────────────────── */}
        <Card>
          <CardContent className="pt-6 space-y-2">
            <h2 className="text-xl font-semibold">Latest Entry Overview</h2>
            <p>Voice Lines: {entries[0]?.voiceLines || 0}</p>
            <p>BTS: {entries[0]?.bts || 0}</p>
            <p>IOT: {entries[0]?.iot || 0}</p>
            <p>HSI: {entries[0]?.hsi || 0}</p>
            <p>Accessories: ${entries[0]?.accessories || "0.00"}</p>
            <p>Protection: {entries[0]?.protection || 0}</p>
            <p>Plan Name: {entries[0]?.planName || "—"}</p>
            <p>MRC: ${entries[0]?.mrc || "0.00"}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Summary Statistics ───────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-6 space-y-2">
          <h2 className="text-xl font-semibold mb-2">Summary Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {/* TOTAL LINES */}
            <div>
              <p className="font-medium">TOTAL LINES</p>
              <p>{totalLines}</p>
            </div>

            {/* TOTAL VOICE LINES */}
            <div>
              <p className="font-medium">TOTAL VOICE LINES</p>
              <p>{totalVoiceLines}</p>
            </div>

            {/* TOTAL BTS */}
            <div>
              <p className="font-medium">TOTAL BTS</p>
              <p>{totalBts}</p>
            </div>

            {/* TOTAL HSI */}
            <div>
              <p className="font-medium">TOTAL HSI</p>
              <p>{totalHsi}</p>
            </div>

            {/* TOTAL IOT */}
            <div>
              <p className="font-medium">TOTAL IOT</p>
              <p>{totalIot}</p>
            </div>

            {/* PROTECTION AVERAGE */}
            <div>
              <p className="font-medium">PROTECTION AVERAGE</p>
              <p>{averageProtection}</p>
            </div>

            {/* TOTAL ACCESSORIES */}
            <div>
              <p className="font-medium">TOTAL ACCESSORIES</p>
              <p>${totalAccessories.toFixed(2)}</p>
            </div>

            {/* AVERAGE MRC */}
            <div>
              <p className="font-medium">AVERAGE MRC</p>
              <p>${averageMRC}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tip of the Day ─────────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-6 space-y-2">
          <h2 className="text-xl font-semibold mb-2">Tip of the Day</h2>
          {isLoadingTip ? (
            <p className="text-sm text-gray-500">Loading tip…</p>
          ) : tip ? (
            <p className="text-sm">{tip}</p>
          ) : (
            <p className="text-sm text-gray-500">No tip available.</p>
          )}
        </CardContent>
      </Card>

      {/* ── Entries Table + Clear Database ───────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">All Entries</h2>
            <Button
              onClick={handleClearDatabase}
              disabled={entries.length === 0}
              className={`text-sm font-semibold ${
                entries.length === 0
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-red-500 hover:bg-red-600 text-white"
              } py-1 px-3 rounded`}
            >
              Clear Database
            </Button>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Date
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Voice Lines
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    BTS
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    IOT
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    HSI
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Accessories ($)
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Protection
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    Plan Name
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                    MRC ($)
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.length > 0 ? (
                  entries.map((ent, idx) => (
                    <tr
                      key={idx}
                      className={idx % 2 === 0 ? "bg-white" : "bg-gray-100"}
                    >
                      <td className="px-4 py-2 text-sm">{ent.date}</td>
                      <td className="px-4 py-2 text-sm">{ent.voiceLines}</td>
                      <td className="px-4 py-2 text-sm">{ent.bts}</td>
                      <td className="px-4 py-2 text-sm">{ent.iot}</td>
                      <td className="px-4 py-2 text-sm">{ent.hsi}</td>
                      <td className="px-4 py-2 text-sm">
                        ${Number(ent.accessories).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-sm">{ent.protection}</td>
                      <td className="px-4 py-2 text-sm">{ent.planName}</td>
                      <td className="px-4 py-2 text-sm">${ent.mrc}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-2 text-center text-gray-500"
                    >
                      No entries yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
