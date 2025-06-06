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

  // 7) Total Protection (count)
  const totalProtection = entries.reduce(
    (sum, e) => sum + Number(e.protection),
    0
  );

  // 8) Protection % of total lines (one decimal place)
  const protectionPercent =
    totalLines > 0
      ? `${((totalProtection / totalLines) * 100).toFixed(1)}%`
      : "0.0%";

  // 9) Average MRC ($)
  const averageMRC =
    entries.length > 0
      ? (
          entries.reduce((sum, e) => sum + Number(e.mrc), 0) /
          entries.length
        ).toFixed(2)
      : "0.00";

  // 🔟 Tip from LLM API (always fetch whenever `entries` changes)
  const [tip, setTip] = useState<string>("");
  const [isLoadingTip, setIsLoadingTip] = useState<boolean>(false);

  useEffect(() => {
    setIsLoadingTip(true);

    async function fetchTip() {
      const token = localStorage.getItem("authToken");

      try {
        const res = await fetch("http://localhost:4000/api/generateTip", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ entries }),
        });
        const raw = await res.text();

        if (!res.ok) {
          setTip(`(error) ${raw}`);
          setIsLoadingTip(false);
          return;
        }
        let data: { tip?: string };
        try {
          data = JSON.parse(raw);
        } catch {
          setTip(`(invalid JSON) ${raw}`);
          setIsLoadingTip(false);
          return;
        }
        if (data.tip) {
          setTip(data.tip);
        } else {
          setTip(`(no "tip" field) ${JSON.stringify(data)}`);
        }
      } catch (err) {
        setTip(`(fetch error) ${String(err)}`);
      } finally {
        setIsLoadingTip(false);
      }
    }

    fetchTip();
  }, [entries]);

  // ⓫ Clear Database with confirmation
  const handleClearDatabase = () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete ALL entries? This action cannot be undone."
    );
    if (!confirmed) return;

    localStorage.removeItem("entries");
    setEntries([]);
  };

  // ⓬ Logout handler
  const handleLogout = () => {
    localStorage.removeItem("authToken");
    navigate("/login");
  };

  return (
    // Replace solid black with a vertical grey gradient:
    // "bg-gradient-to-b from-gray-800 to-gray-200" 
    // (dark gray at top fading to light gray at bottom)
    <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-200 p-6">
      {/* ➡️ Top Nav */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-tmagenta">PERFORMANCE TRACKER</h1>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="border-tmagenta text-tmagenta hover:bg-tmagenta hover:text-twhite transition-colors"
        >
          Log out
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Enter Daily Sales Form ───────────────────────────────────────── */}
        <Card className="bg-twhite shadow-lg rounded-lg border border-gray-200">
          <CardContent className="space-y-6 p-6">
            <h2 className="text-2xl font-semibold text-tblack mb-2">Enter Daily Sales</h2>
            <Form {...formHook}>
              <form
                onSubmit={formHook.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                {/* Date */}
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
                          className="border-gray-300 focus:border-tmagenta focus:ring-tmagenta"
                        />
                      </FormControl>
                      <FormMessage className="text-red-600" />
                    </FormItem>
                  )}
                />

                {/* Voice Lines / BTS / IOT / HSI */}
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
                              className="border-gray-300 focus:border-tmagenta focus:ring-tmagenta"
                            />
                          </FormControl>
                          <FormMessage className="text-red-600" />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>

                {/* Protection / Accessories / MRC / Plan Name */}
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
                            className="border-gray-300 focus:border-tmagenta focus:ring-tmagenta"
                          />
                        </FormControl>
                        <FormMessage className="text-red-600" />
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
                            className="border-gray-300 focus:border-tmagenta focus:ring-tmagenta"
                          />
                        </FormControl>
                        <FormMessage className="text-red-600" />
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
                            className="border-gray-300 focus:border-tmagenta focus:ring-tmagenta"
                          />
                        </FormControl>
                        <FormMessage className="text-red-600" />
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
                            className="border-gray-300 focus:border-tmagenta focus:ring-tmagenta"
                          />
                        </FormControl>
                        <FormMessage className="text-red-600" />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={!formHook.formState.isValid}
                  className="w-full bg-tmagenta text-twhite hover:bg-opacity-90 transition-colors"
                >
                  Submit
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* ── Latest Entry Overview ──────────────────────────────────────── */}
        <Card className="bg-twhite shadow-lg rounded-lg border border-gray-200">
          <CardContent className="p-6 space-y-3">
            <h2 className="text-2xl font-semibold text-tmagenta mb-2">Latest Entry</h2>
            <p className="text-tblack">
              <span className="font-medium">Voice Lines:</span> {entries[0]?.voiceLines || 0}
            </p>
            <p className="text-tblack">
              <span className="font-medium">BTS:</span> {entries[0]?.bts || 0}
            </p>
            <p className="text-tblack">
              <span className="font-medium">IOT:</span> {entries[0]?.iot || 0}
            </p>
            <p className="text-tblack">
              <span className="font-medium">HSI:</span> {entries[0]?.hsi || 0}
            </p>
            <p className="text-tblack">
              <span className="font-medium">Accessories:</span> $
              {entries[0]?.accessories || "0.00"}
            </p>
            <p className="text-tblack">
              <span className="font-medium">Protection:</span> {entries[0]?.protection || 0}
            </p>
            <p className="text-tblack">
              <span className="font-medium">Plan Name:</span> {entries[0]?.planName || "—"}
            </p>
            <p className="text-tblack">
              <span className="font-medium">MRC:</span> ${entries[0]?.mrc || "0.00"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Summary Statistics ───────────────────────────────────────── */}
      <Card className="mt-8 bg-twhite shadow-lg rounded-lg border border-gray-200">
        <CardContent className="p-6">
          <h2 className="text-2xl font-semibold text-tmagenta mb-4">Summary Statistics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-tblack text-sm">
            {/* TOTAL LINES */}
            <div>
              <p className="font-medium">TOTAL LINES</p>
              <p className="text-lg">{totalLines}</p>
            </div>

            {/* TOTAL VOICE LINES */}
            <div>
              <p className="font-medium">TOTAL VOICE LINES</p>
              <p className="text-lg">{totalVoiceLines}</p>
            </div>

            {/* TOTAL BTS */}
            <div>
              <p className="font-medium">TOTAL BTS</p>
              <p className="text-lg">{totalBts}</p>
            </div>

            {/* TOTAL HSI */}
            <div>
              <p className="font-medium">TOTAL HSI</p>
              <p className="text-lg">{totalHsi}</p>
            </div>

            {/* TOTAL IOT */}
            <div>
              <p className="font-medium">TOTAL IOT</p>
              <p className="text-lg">{totalIot}</p>
            </div>

            {/* PROTECTION % */}
            <div>
              <p className="font-medium">PROTECTION %</p>
              <p className="text-lg">{protectionPercent}</p>
            </div>

            {/* TOTAL ACCESSORIES */}
            <div>
              <p className="font-medium">TOTAL ACCESSORIES</p>
              <p className="text-lg">${totalAccessories.toFixed(2)}</p>
            </div>

            {/* AVERAGE MRC */}
            <div>
              <p className="font-medium">AVERAGE MRC</p>
              <p className="text-lg">${averageMRC}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tip of the Day ─────────────────────────────────────────────── */}
      <Card className="mt-8 bg-twhite shadow-lg rounded-lg border border-gray-200">
        <CardContent className="p-6 space-y-2">
          <h2 className="text-2xl font-semibold text-tmagenta mb-2">Tip of the Day</h2>
          {isLoadingTip ? (
            <p className="text-tblack text-sm">Loading tip…</p>
          ) : tip ? (
            <p className="text-tblack text-sm">{tip}</p>
          ) : (
            <p className="text-gray-500 text-sm">No tip available.</p>
          )}
        </CardContent>
      </Card>

      {/* ── Entries Table + Clear Database ───────────────────────────── */}
      <Card className="mt-8 bg-twhite shadow-lg rounded-lg border border-gray-200">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-tmagenta">All Entries</h2>
            <Button
              onClick={handleClearDatabase}
              disabled={entries.length === 0}
              className={`mt-3 sm:mt-0 text-sm font-semibold py-2 px-4 rounded ${
                entries.length === 0
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-tmagenta text-twhite hover:bg-opacity-90"
              } transition-colors`}
            >
              Clear Database
            </Button>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full table-auto border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-tblack">Date</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-tblack">Voice Lines</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-tblack">BTS</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-tblack">IOT</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-tblack">HSI</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-tblack">
                    Accessories ($)
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-tblack">
                    Protection
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-tblack">
                    Plan Name
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-tblack">MRC ($)</th>
                </tr>
              </thead>
              <tbody>
                {entries.length > 0 ? (
                  entries.map((ent, idx) => (
                    <tr
                      key={idx}
                      className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="px-4 py-2 text-sm text-tblack">{ent.date}</td>
                      <td className="px-4 py-2 text-sm text-tblack">{ent.voiceLines}</td>
                      <td className="px-4 py-2 text-sm text-tblack">{ent.bts}</td>
                      <td className="px-4 py-2 text-sm text-tblack">{ent.iot}</td>
                      <td className="px-4 py-2 text-sm text-tblack">{ent.hsi}</td>
                      <td className="px-4 py-2 text-sm text-tblack">
                        ${Number(ent.accessories).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-sm text-tblack">{ent.protection}</td>
                      <td className="px-4 py-2 text-sm text-tblack">{ent.planName}</td>
                      <td className="px-4 py-2 text-sm text-tblack">${ent.mrc}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-2 text-center text-gray-500 text-sm"
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
