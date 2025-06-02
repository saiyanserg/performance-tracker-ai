import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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
  lines: string;
  accessories: string;
  protection: string;
  revenue: string;
};

const performanceFormSchema = z.object({
  date: z
    .string()
    .nonempty({ message: "Date is required" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Enter a valid date (YYYY-MM-DD)" }),
  lines: z.string().regex(/^\d+$/, "Must be a number"),
  accessories: z.string().regex(/^\d+$/, "Must be a number"),
  protection: z.string().regex(/^\d+$/, "Must be a number"),
  revenue: z.string().regex(/^\d+$/, "Must be a number"),
});
type PerformanceFormValues = z.infer<typeof performanceFormSchema>;

export default function PerformanceTracker() {
  const today = new Date().toISOString().split("T")[0];

  // 1️⃣ Form setup
  const formHook = useForm<PerformanceFormValues>({
    resolver: zodResolver(performanceFormSchema),
    mode: "onChange",
    defaultValues: {
      date: today,
      lines: "",
      accessories: "",
      protection: "",
      revenue: "",
    },
  });

  // 2️⃣ Entries state: initialize from localStorage (if present) or []
  const [entries, setEntries] = useState<Entry[]>(() => {
    const saved = localStorage.getItem("entries");
    return saved ? JSON.parse(saved) : [];
  });

  // 3️⃣ Save to localStorage whenever entries change
  useEffect(() => {
    localStorage.setItem("entries", JSON.stringify(entries));
  }, [entries]);

  // 4️⃣ Submit handler
  const onSubmit = (values: PerformanceFormValues) => {
    setEntries([values, ...entries]);
    formHook.reset();
  };

  // 5️⃣ Totals & averages
  const totals = entries.reduce(
    (acc, { lines, accessories, protection, revenue }) => ({
      lines: acc.lines + Number(lines),
      accessories: acc.accessories + Number(accessories),
      protection: acc.protection + Number(protection),
      revenue: acc.revenue + Number(revenue),
    }),
    { lines: 0, accessories: 0, protection: 0, revenue: 0 }
  );
  const averages = {
    lines: entries.length ? Math.round(totals.lines / entries.length) : 0,
    accessories: entries.length
      ? Math.round(totals.accessories / entries.length)
      : 0,
    protection: entries.length ? Math.round(totals.protection / entries.length) : 0,
    revenue: entries.length
      ? (totals.revenue / entries.length).toFixed(2)
      : "0.00",
  };

  // 6️⃣ Tip from LLM API (with added logging for debugging)
  const [tip, setTip] = useState<string>("Loading tip...");
  useEffect(() => {
    async function fetchTip() {
      console.log("🛰️ [Tip] Sending entries to /api/generateTip:", entries);

      try {
        const res = await fetch("/api/generateTip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entries }),
        });
        console.log("🛰️ [Tip] Response status:", res.status);

        // ─────────────────────────────────────────────────────────────
        // ★ CHANGED LINE ★: First read the raw text, then parse JSON
        const raw = await res.text();
        console.log("🛰️ [Tip] Raw response text:", raw);
        // ─────────────────────────────────────────────────────────────

        if (!res.ok) {
          console.error("🛰️ [Tip] fetch returned non-OK:", res.status);
          setTip("Unable to generate tip right now.");
          return;
        }

        // Now try to parse JSON from that raw text
        const data = JSON.parse(raw) as { tip?: string };
        console.log("🛰️ [Tip] Parsed JSON:", data);

        if (data.tip) {
          setTip(data.tip);
        } else {
          console.warn("🛰️ [Tip] No 'tip' field in parsed JSON:", data);
          setTip("No tip found in response.");
        }
      } catch (err) {
        console.error("🛰️ [Tip] fetch threw an error:", err);
        setTip("Unable to generate tip right now.");
      }
    }
    fetchTip();
  }, [entries]);

  return (
    <div className="p-6 space-y-8">
      {/* Form + Latest Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <h2 className="text-xl font-semibold">Enter Daily Sales</h2>
            <Form {...formHook}>
              <form
                onSubmit={formHook.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                {(
                  ["date", "lines", "accessories", "protection", "revenue"] as const
                ).map((field) => (
                  <FormField
                    key={field}
                    control={formHook.control}
                    name={field}
                    render={({ field: hookField }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...hookField}
                            required
                            type={field === "date" ? "date" : "text"}
                            placeholder={
                              field.charAt(0).toUpperCase() + field.slice(1)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
                <Button type="submit" disabled={!formHook.formState.isValid}>
                  Submit
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 space-y-2">
            <h2 className="text-xl font-semibold">Latest Entry Overview</h2>
            <p>Lines: {entries[0]?.lines || 0}</p>
            <p>Accessories: {entries[0]?.accessories || 0}</p>
            <p>Protection: {entries[0]?.protection || 0}</p>
            <p>Revenue: ${entries[0]?.revenue || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Statistics */}
      <Card>
        <CardContent className="pt-6 space-y-2">
          <h2 className="text-xl font-semibold mb-2">Summary Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium">Total Lines</p>
              <p>{totals.lines}</p>
            </div>
            <div>
              <p className="font-medium">Avg Lines</p>
              <p>{averages.lines}</p>
            </div>
            <div>
              <p className="font-medium">Total Accessories</p>
              <p>{totals.accessories}</p>
            </div>
            <div>
              <p className="font-medium">Avg Accessories</p>
              <p>{averages.accessories}</p>
            </div>
            <div>
              <p className="font-medium">Total Protection</p>
              <p>{totals.protection}</p>
            </div>
            <div>
              <p className="font-medium">Avg Protection</p>
              <p>{averages.protection}</p>
            </div>
            <div>
              <p className="font-medium">Total Revenue</p>
              <p>${totals.revenue}</p>
            </div>
            <div>
              <p className="font-medium">Avg Revenue</p>
              <p>${averages.revenue}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 🤖 Tip of the Day (from LLM) */}
      <Card>
        <CardContent className="pt-6 space-y-2">
          <h2 className="text-xl font-semibold mb-2">Tip of the Day</h2>
          <p className="text-sm">{tip}</p>
        </CardContent>
      </Card>

      {/* Entries Table */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-4">All Entries</h2>
          <div className="overflow-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  {["Date", "Lines", "Accessories", "Protection", "Revenue"].map(
                    (col) => (
                      <th
                        key={col}
                        className="px-4 py-2 text-left text-sm font-medium text-gray-700"
                      >
                        {col}
                      </th>
                    )
                  )}
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
                      <td className="px-4 py-2 text-sm">{ent.lines}</td>
                      <td className="px-4 py-2 text-sm">{ent.accessories}</td>
                      <td className="px-4 py-2 text-sm">{ent.protection}</td>
                      <td className="px-4 py-2 text-sm">${ent.revenue}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-2 text-center text-gray-500">
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
