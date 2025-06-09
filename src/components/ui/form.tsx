import React from "react";
import { Controller } from "react-hook-form";

export function Form({ children }: { children: React.ReactNode }) {
  // Just render children; your <form> tag is inside PerformanceTracker.tsx
  return <>{children}</>;
}

export function FormField(props: {
  name: string;
  control: any;
  render: (args: { field: any; fieldState: any; formState: any }) => React.ReactNode;
}) {
  // Use react-hook-form’s Controller to wire up each field
  return (
    <Controller
      name={props.name}
      control={props.control}
      render={({ field, fieldState, formState }) => (
        <>{props.render({ field, fieldState, formState })}</>
      )}
    />
  );
}

export function FormItem({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col mb-2">{children}</div>;
}

export function FormControl({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

export function FormMessage({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <p className={`text-red-500 text-sm mt-1 ${className ?? ""}`}>{children}</p>;
}
