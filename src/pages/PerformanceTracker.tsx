// src/pages/PerformanceTracker.tsx

import { supabase } from "@/lib/supabaseClient";
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
  voiceLines: string;
  bts: string;
  iot: string;
  hsi: string;
  accessories: string;
  protection: string;
  planName: string;
  mrc: string;
};

const performanceFormSchema = z.object({
  date: z
    .string()
    .nonempty({ message: "Date is required" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "Enter a valid date (YYYY-MM-DD)",
    }),
  voiceLines: z.string().regex(/^\d+$/, "Must be a whole number"),
  bts: z.string().regex(/^\d+$/, "Must be a whole number"),
  iot: z.string().regex(/^\d+$/, "Must be a whole number"),
  hsi: z.string().regex(/^\d+$/, "Must be a whole number"),
  accessories: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid dollar amount"),
  protection: z.string().regex(/^\d+$/, "Must be a whole number"),
  planName: z.string().nonempty({ message: "Plan Name is required" }),
  mrc: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid dollar amount"),
});
type PerformanceFormValues = z.infer<typeof performanceFormSchema>;

export default function PerformanceTracker() {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  // 1️⃣ Form setup
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

  // 2️⃣ Entries state (from Supabase)
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  // 3️⃣ Fetch existing entries on mount
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from<{
          date: string;
          lines: number;
          accessories: number;
          protection: number;
          revenue: number;
          plan_name: string;
          created_at: string;
        }>("entries")
        .select("date, lines, accessories, protection, revenue, plan_name, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Fetch error:", error.message);
      } else {
        // Map Supabase rows back into your UI Entry shape
        const mapped = data.map((row) => ({
          date: row.date,
          voiceLines: String(row.lines), // we only have total lines in DB
          bts: "0",
          iot: "0",
          hsi: "0",
          accessories: String(row.accessories),
          protection: String(row.protection),
          planName: row.plan_name,
          mrc: String(row.revenue),
        }));
        setEntries(mapped);
      }
      setLoading(false);
    })();
  }, []);

  // 4️⃣ Handle form submit (write to Supabase)
  const onSubmit = formHook.handleSubmit(async (values) => {
    // Combine the four line fields into one
    const totalLines = [
      values.voiceLines,
      values.bts,
      values.iot,
      values.hsi,
    ]
      .map(Number)
      .reduce((a, b) => a + b, 0);

    const { data, error } = await supabase
      .from("entries")
      .insert([
        {
          date: values.date,
          lines: totalLines,
          accessories: Number(values.accessories),
          protection: Number(values.protection),
          revenue: Number(values.mrc),
          plan_name: values.planName,
        },
      ])
      .select();

    if (error) {
      console.error("Insert error:", error.message);
      return;
    }

    // Prepend to UI state
    setEntries((prev) => [
      values, // use the same shape as your table expects
      ...prev,
    ]);
    formHook.reset({
      date: today,
      voiceLines: "",
      bts: "",
      iot: "",
      hsi: "",
      accessories: "",
      protection: "",
      planName: "",
      mrc: "",
    });
  });

  // ⓫ Clear DB (optional)
  const handleClearDatabase = async () => {
  if (!window.confirm("Are you sure you want to delete ALL entries?")) return;

  // DELETE *all* rows, then select them back so the request actually runs
  const { data, error } = await supabase
    .from("entries")
    .delete()      // delete all rows
    .select();     // <-- necessary in v2 to actually execute and return deleted rows

  if (error) {
    console.error("Delete error:", error.message);
    alert("Could not clear database:\n" + error.message);
  } else {
    console.log("Deleted rows:", data.length);
    setEntries([]);  // clear your UI state
        }
      };

  // ⓬ Logout handler
  const handleLogout = () => {
    localStorage.removeItem("authToken");
    navigate("/login");
  };

  if (loading) {
    return <div>Loading…</div>;
  }

  // ── Recompute summary metrics ────────────────────────────────────
  const totalVoiceLines = entries.reduce(
    (sum, e) => sum + Number(e.voiceLines),
    0
  );
  const totalBts = entries.reduce((sum, e) => sum + Number(e.bts), 0);
  const totalIot = entries.reduce((sum, e) => sum + Number(e.iot), 0);
  const totalHsi = entries.reduce((sum, e) => sum + Number(e.hsi), 0);
  const totalLines = totalVoiceLines + totalBts + totalIot + totalHsi;
  const totalAccessories = entries.reduce(
    (sum, e) => sum + Number(e.accessories),
    0
  );
  const totalProtection = entries.reduce(
    (sum, e) => sum + Number(e.protection),
    0
  );
  const protectionPercent =
    totalLines > 0
      ? `${((totalProtection / totalLines) * 100).toFixed(1)}%`
      : "0.0%";
  const averageMRC =
    entries.length > 0
      ? (
          entries.reduce((sum, e) => sum + Number(e.mrc), 0) /
          entries.length
        ).toFixed(2)
      : "0.00";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-200 p-6">
      {/* ➡️ Top Nav */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-tmagenta">
          PERFORMANCE TRACKER
        </h1>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="border-tmagenta text-tmagenta hover:bg-tmagenta hover:text-twhite transition-colors"
        >
          Log out
        </Button>
      </div>

      {/* ── Form & Latest Entry ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <Card className="bg-twhite shadow-lg rounded-lg border border-gray-200">
          <CardContent className="space-y-6 p-6">
            <h2 className="text-2xl font-semibold text-tblack mb-2">
              Enter Daily Sales
            </h2>
            <Form {...formHook}>
              <form
                onSubmit={onSubmit}
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

        {/* Latest Entry */}
        <Card className="bg-twhite shadow-lg rounded-lg border border-gray-200">
          <CardContent className="p-6 space-y-3">
            <h2 className="text-2xl font-semibold text-tmagenta mb-2">
              Latest Entry
            </h2>
            <p className="text-tblack">
              <span className="font-medium">Voice Lines:</span>{" "}
              {entries[0]?.voiceLines || 0}
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
              <span className="font-medium">Protection:</span>{" "}
              {entries[0]?.protection || 0}
            </p>
            <p className="text-tblack">
              <span className="font-medium">Plan Name:</span>{" "}
              {entries[0]?.planName || "—"}
            </p>
            <p className="text-tblack">
              <span className="font-medium">MRC:</span> $
              {entries[0]?.mrc || "0.00"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Statistics */}
      <Card className="mt-8 bg-twhite shadow-lg rounded-lg border border-gray-200">
        <CardContent className="p-6">
          <h2 className="text-2xl font-semibold text-tmagenta mb-4">
            Summary Statistics
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-tblack text-sm">
            <div>
              <p className="font-medium">TOTAL LINES</p>
              <p className="text-lg">{totalLines}</p>
            </div>
            <div>
              <p className="font-medium">TOTAL VOICE LINES</p>
              <p className="text-lg">{totalVoiceLines}</p>
            </div>
            <div>
              <p className="font-medium">TOTAL BTS</p>
              <p className="text-lg">{totalBts}</p>
            </div>
            <div>
              <p className="font-medium">TOTAL HSI</p>
              <p className="text-lg">{totalHsi}</p>
            </div>
            <div>
              <p className="font-medium">TOTAL IOT</p>
              <p className="text-lg">{totalIot}</p>
            </div>
            <div>
              <p className="font-medium">PROTECTION %</p>
              <p className="text-lg">{protectionPercent}</p>
            </div>
            <div>
              <p className="font-medium">TOTAL ACCESSORIES</p>
              <p className="text-lg">${totalAccessories.toFixed(2)}</p>
            </div>
            <div>
              <p className="font-medium">AVERAGE MRC</p>
              <p className="text-lg">${averageMRC}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      
      <Card className="mt-8 bg-twhite shadow-lg rounded-lg border border-gray-200">
        <CardContent className="p-6 space-y-2">
          <h2 className="text-2xl font-semibold text-tmagenta mb-2">
            Tip of the Day
          </h2>
          <p className="text-tblack text-sm">
            {/* You could fetch this via your API or keep your local tip logic */}
            Focus on promoting accessory sales to drive revenue growth and enhance
            customer experience.
          </p>
        </CardContent>
      </Card>

      {/* All Entries Table + Clear */}
      <Card className="mt-8 bg-twhite shadow-lg rounded-lg border border-gray-200">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-tmagenta">All Entries</h2>
            <Button
              onClick={handleClearDatabase}
              disabled={entries.length === 0}
              className={`text-sm font-semibold py-2 px-4 rounded ${
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
                  <th className="px-4 py-2 text-left text-sm font-medium text-tblack">
                    Date
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-tblack">
                    Voice Lines
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-tblack">
                    BTS
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-tblack">
                    IOT
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-tblack">
                    HSI
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-tblack">
                    Accessories ($)
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-tblack">
                    Protection
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-tblack">
                    Plan Name
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-tblack">
                    MRC ($)
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.length > 0 ? (
                  entries.map((ent, idx) => (
                    <tr
                      key={idx}
                      className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="px-4 py-2 text-sm text-tblack">
                        {ent.date}
                      </td>
                      <td className="px-4 py-2 text-sm text-tblack">
                        {ent.voiceLines}
                      </td>
                      <td className="px-4 py-2 text-sm text-tblack">
                        {ent.bts}
                      </td>
                      <td className="px-4 py-2 text-sm text-tblack">
                        {ent.iot}
                      </td>
                      <td className="px-4 py-2 text-sm text-tblack">
                        {ent.hsi}
                      </td>
                      <td className="px-4 py-2 text-sm text-tblack">
                        ${Number(ent.accessories).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-sm text-tblack">
                        {ent.protection}
                      </td>
                      <td className="px-4 py-2 text-sm text-tblack">
                        {ent.planName}
                      </td>
                      <td className="px-4 py-2 text-sm text-tblack">
                        ${ent.mrc}
                      </td>
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
