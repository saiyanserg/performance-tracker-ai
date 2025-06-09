// Import Supabase client for database operations
import { supabase } from "@/lib/supabaseClient";
// React hooks for component state & side effects
import { useState, useEffect } from "react";
// React Hook Form for form state management
import { useForm } from "react-hook-form";
// Zod resolver to integrate schema validation
import { zodResolver } from "@hookform/resolvers/zod";
// Zod for schema definitions and validation
import * as z from "zod";
// Navigation hook from React Router
import { useNavigate } from "react-router-dom";
// UI components: Card layout
import { Card, CardContent } from "@/components/ui/card";
// UI component: Input fields
import { Input } from "@/components/ui/input";
// UI component: Button with variants
import { Button } from "@/components/ui/button";
// Form primitives for building accessible forms
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

/**
 * Entry represents a single day's sales data in the UI.
 */
type Entry = {
  date: string;          // Entry date (YYYY-MM-DD)
  voiceLines: string;    // Number of voice lines sold
  bts: string;           // Number of BTS units sold
  iot: string;           // Number of IoT units sold
  hsi: string;           // Number of HSI units sold
  accessories: string;   // Accessories revenue ($) as string
  protection: string;    // Protection packages sold
  planName: string;      // Name of the plan
  mrc: string;           // Monthly Recurring Charge ($) as string
};

/**
 * Zod schema for validating the performance form inputs.
 */
const performanceFormSchema = z.object({
  // Date field must be non-empty and match YYYY-MM-DD
  date: z
    .string()
    .nonempty({ message: "Date is required" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Enter a valid date (YYYY-MM-DD)" }),
  // Numeric fields must be whole numbers
  voiceLines: z.string().regex(/^\d+$/, "Must be a whole number"),
  bts: z.string().regex(/^\d+$/, "Must be a whole number"),
  iot: z.string().regex(/^\d+$/, "Must be a whole number"),
  hsi: z.string().regex(/^\d+$/, "Must be a whole number"),
  // Dollar amount fields
  accessories: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid dollar amount"),
  protection: z.string().regex(/^\d+$/, "Must be a whole number"),
  // Plan name must not be empty
  planName: z.string().nonempty({ message: "Plan Name is required" }),
  mrc: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid dollar amount"),
});
// Infer TypeScript types from Zod schema
type PerformanceFormValues = z.infer<typeof performanceFormSchema>;

/**
 * Main PerformanceTracker component.
 * Renders the form, table, summary stats, and handles data fetching & submission.
 */
export default function PerformanceTracker() {
  // React Router navigate function
  const navigate = useNavigate();
  // Default 'today' date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0];

  // 1️⃣ Set up React Hook Form with Zod validation
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

  // 2️⃣ Component state: entries list & loading flag
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  // 3️⃣ State for Tip of the Day feature
  const [tip, setTip] = useState<string>("");
  const [isLoadingTip, setIsLoadingTip] = useState<boolean>(false);

  // 4️⃣ Fetch existing entries from Supabase on mount
  useEffect(() => {
    (async () => {
      // fetch rows without a bad generic
      const { data, error } = await supabase
        .from("entries")
        .select("date, lines, accessories, protection, revenue, plan_name, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      // Handle fetch error & map rows into our UI type
      if (error) {
        console.error("Fetch error:", error.message);
      } else {
      // cast `data` into our expected row shape
      type Row = {
        date: string;
        lines: number;
        accessories: number;
        protection: number;
        revenue: number;
        plan_name: string;
        created_at: string;
      };
      const rows = (data ?? []) as Row[];
      const mapped = rows.map(row => ({  
          date: row.date,
          voiceLines: String(row.lines), // total lines from DB
          bts: "0", // placeholder until multi-line supported
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

 /**
   * fetchTip: Calls the AI endpoint to generate a personalized sales tip based on current entries.
   * @param entries - Array of Entry objects representing daily sales data
   */
  // fetchTip helper
  async function fetchTip(entries: Entry[]) {
    setIsLoadingTip(true);
    try {
      const token = localStorage.getItem("authToken") || "";
      const res = await fetch("http://localhost:4000/api/generateTip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ entries }),
      });
      const raw = await res.text();
      if (!res.ok) throw new Error(raw);
      const data = JSON.parse(raw);
      setTip(data.tip || "(no tip)");
    } catch (err: any) {
      setTip(`Error: ${err.message}`);
    } finally {
      setIsLoadingTip(false);
    }
  }

  // 5️⃣ Re-fetch tip whenever the entries array updates
  useEffect(() => {
    if (entries.length > 0) {
      fetchTip(entries);
    } else {
      setTip("📊 Add at least one sales entry to get a personalized tip.");
    }
  }, [entries]);

  /**
   * onSubmit handler: Validates form values, combines line metrics, inserts a new entry into Supabase,
   * and updates the UI entries list.
   */
  // 6️⃣ Handle form submit (write to Supabase)
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

  // Insert a new entry
  const { error } = await supabase
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
  
  // Prepend new entry to UI state
  setEntries((prev) => [values, ...prev]);
  // Reset form fields to default values
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

// 7️⃣ Clear DB (optional)
const handleClearDatabase = async () => {
  if (!window.confirm("Are you sure you want to delete ALL entries?")) return;

  // Delete all rows by filtering on a non-nullable primary key
  const { data: deletedRows, error } = await supabase
    .from("entries")
    .delete()      
    .not("id", "is", null) 
    .select();

  if (error) {
    console.error("Delete error:", error.message);
    alert("Could not clear database:\n" + error.message);
  } else {
    console.log("Deleted rows:", deletedRows?.length);
    setEntries([]);  // clear your UI state
  }
};

  /**
  * handleLogout
  * • Clears the saved auth token to end the session
  * • Redirects the user back to the login page
  */
  const handleLogout = () => {
    localStorage.removeItem("authToken");
    navigate("/login");
  };

  /**
  * Loading guard
  * While entries are still being fetched, render a simple loading indicator
  */
  if (loading) {
    return <div>Loading…</div>;
  }

  /**
  * Summary metrics calculation
  * • totalVoiceLines: sum of all voiceLines values
  * • totalBts:         sum of all BTS values
  * • totalIot:         sum of all IOT values
  * • totalHsi:         sum of all HSI values
  * • totalLines:       combined total of all line metrics
  * • totalAccessories: sum of accessories revenue
  * • totalProtection:  sum of protection counts
  * • protectionPercent: (totalProtection / totalLines) * 100 as a string with one decimal
  * • averageMRC:       average monthly recurring charge across entries
  */
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

  /** 
  * Now the component render can proceed:
  */    
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

      {/**
        * Form & Latest Entry Section
        * - Left side: Form to capture daily sales metrics.
        * - Right side: Displays the most recent entry.
      */}
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
                  control={formHook.control}    // Connects field to React Hook Form
                  name="date"                   // Field name matching Zod schema
                  render={({ field: hookField, fieldState }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...hookField}          // Spread RHF field props (value, onChange, etc.)
                          required                // Native required attribute
                          type="date"             // Renders a date picker
                          className="border-gray-300 focus:border-tmagenta focus:ring-tmagenta"
                        />
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />

                {/*
                  Sales Metrics Inputs Group
                  — Renders four synchronized input fields for capturing:
                  • Voice Lines
                  • BTS
                  • IOT
                  • HSI
                  — Uses a map over a constant tuple array to DRYly generate each FormField with:
                    • React Hook Form binding (control & name)
                    • An Input component with `required`, `type="text"`, and a placeholder
                    • Inline validation error messaging
                */}
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
                      render={({ field: hookField, fieldState }) => (
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
                          <FormMessage>{fieldState.error?.message}</FormMessage>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>

                {/*
                Protection / Accessories / MRC / Plan Name Inputs Group
                – Renders four input fields in a responsive grid:
                  • Protection: number of protection packages sold (whole number)
                  • Accessories $: accessories revenue (dollar amount)
                  • MRC $: monthly recurring charge (dollar amount)
                  • Plan Name: name of the selected plan (non‐empty string)
                – Each FormField is bound to React Hook Form (`control` & `name`)
                – Uses an Input component with `required` and appropriate `placeholder`
                – Displays inline validation messages via FormMessage
              */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Protection field */}
                  <FormField
                    control={formHook.control}
                    name="protection"
                    render={({ field: hookField, fieldState }) => (
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
                        <FormMessage>{fieldState.error?.message}</FormMessage>
                      </FormItem>
                    )}
                  />

                  {/* Accessories $ field */}
                  <FormField
                    control={formHook.control}
                    name="accessories"
                    render={({ field: hookField, fieldState }) => (
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
                        <FormMessage>{fieldState.error?.message}</FormMessage>
                      </FormItem>
                    )}
                  />

                  {/* MRC $ field */}
                  <FormField
                    control={formHook.control}
                    name="mrc"
                    render={({ field: hookField, fieldState }) => (
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
                         <FormMessage>{fieldState.error?.message}</FormMessage>
                      </FormItem>
                    )}
                  />

                  {/* Plan Name field */}
                  <FormField
                    control={formHook.control}
                    name="planName"
                    render={({ field: hookField, fieldState }) => (
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
                         <FormMessage>{fieldState.error?.message}</FormMessage>
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

        {/*
          Latest Entry Card
          – Displays the most recent sales entry submitted.
          – If no entries exist, each field falls back to a default value.
        */}
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

      {/*
        Summary Statistics Card
        – Displays aggregated metrics for all entries:
          • TOTAL LINES
          • TOTAL VOICE LINES
          • TOTAL BTS
          • TOTAL HSI
          • TOTAL IOT
          • PROTECTION % (protection / totalLines)
          • TOTAL ACCESSORIES
          • AVERAGE MRC
      */}
      {/* Summary Statistics */}
      <Card className="mt-8 bg-twhite shadow-lg rounded-lg border border-gray-200">
        <CardContent className="p-6">
          {/* Section heading */}
          <h2 className="text-2xl font-semibold text-tmagenta mb-4">
            Summary Statistics
          </h2>
          {/* Grid of metric cards */}
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
      
      {/*
        Tip of the Day Card
        – Shows a loading state while fetching, then displays the AI-generated sales tip.
      */}
      {/* ── Tip of the Day ── */}
      <Card className="mt-8 bg-twhite shadow-lg rounded-lg border border-gray-200">
        <CardContent className="p-6 space-y-2">
          <h2 className="text-2xl font-semibold text-tmagenta mb-2">
            Tip of the Day
          </h2>
          {isLoadingTip ? (
            <p className="text-tblack text-sm">Loading tip…</p>
          ) : (
            <p className="text-tblack text-sm">{tip}</p>
          )}
          </CardContent>
        </Card>

      {/*
        All Entries Table + Clear
        – Provides a scrollable table of every entry.
        – Includes a “Clear Database” button that’s disabled when no entries exist.
      */}
      {/* All Entries Table + Clear */}
      <Card className="mt-8 bg-twhite shadow-lg rounded-lg border border-gray-200">
        <CardContent className="p-6">
          {/* Header with title and clear action */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-tmagenta">All Entries</h2>
            {/* Clear Database button */}
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
          {/* Table container for overflow on small screens */}
          </div>
          <div className="overflow-auto">
            <table className="min-w-full table-auto border-collapse">
              {/* Column headers */}
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-tblack">Date</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-tblack">Voice Lines</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-tblack">BTS</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-tblack">IOT</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-tblack">HSI</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-tblack">Accessories ($)</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-tblack">Protection</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-tblack">Plan Name</th>
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
                      {/* Data cells for each entry property */}
                      <td className="px-4 py-2 text-sm text-tblack">{ent.date}</td>
                      <td className="px-4 py-2 text-sm text-tblack">{ent.voiceLines}</td>
                      <td className="px-4 py-2 text-sm text-tblack">{ent.bts}</td>
                      <td className="px-4 py-2 text-sm text-tblack">{ent.iot}</td>
                      <td className="px-4 py-2 text-sm text-tblack">{ent.hsi}</td>
                      <td className="px-4 py-2 text-sm text-tblack">${Number(ent.accessories).toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-tblack">{ent.protection}</td>
                      <td className="px-4 py-2 text-sm text-tblack">{ent.planName}</td>
                      <td className="px-4 py-2 text-sm text-tblack">${ent.mrc}</td>
                    </tr>
                  ))
                ) : (
                  // Fallback row when there are no entries
                  <tr>
                    <td colSpan={9} className="px-4 py-2 text-center text-gray-500 text-sm">
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
