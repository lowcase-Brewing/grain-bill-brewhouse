import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatPpg } from "@/domain/format";
import { isIngredientUsableForCalc } from "@/domain/library";
import { INGREDIENT_CATEGORIES, type Ingredient, type IngredientSnapshot } from "@/domain/types";
import { cn } from "@/lib/utils";

export function IngredientPicker({
  library,
  value,
  onChange,
  invalid,
  id,
  emptyMessage = "No matching ingredient. Add it in the Malt library.",
}: {
  library: Ingredient[];
  value: IngredientSnapshot | null;
  onChange: (i: Ingredient) => void;
  invalid?: boolean;
  id?: string;
  emptyMessage?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          className={cn(
            "h-9 w-full justify-between bg-card px-3 font-normal",
            !value && "text-muted-foreground",
            invalid && "border-destructive",
          )}
        >
          <span className="truncate">{value ? value.name : "Choose ingredient…"}</span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,24rem)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search malts, adjuncts, extracts…" />
          <CommandList className="max-h-80">
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {INGREDIENT_CATEGORIES.map((cat) => {
              const items = library.filter((i) => i.category === cat);
              if (!items.length) return null;
              return (
                <CommandGroup key={cat} heading={cat}>
                  {items.map((i) => (
                    <CommandItem
                      key={i.id}
                      value={`${i.name} ${i.origin} ${i.category} ${i.id}`}
                      onSelect={() => {
                        onChange(i);
                        setOpen(false);
                      }}
                      className="flex items-start gap-2"
                    >
                      <Check
                        className={cn(
                          "mt-0.5 size-4",
                          value?.libraryId === i.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{i.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{i.origin}</div>
                      </div>
                      <span
                        className={cn(
                          "tabular text-xs",
                          isIngredientUsableForCalc(i)
                            ? "text-muted-foreground"
                            : "text-destructive",
                        )}
                      >
                        {formatPpg(i.ppg)} PPG
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
