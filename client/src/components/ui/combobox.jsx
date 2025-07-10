import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function Combobox({
  options = [],
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyPlaceholder = "No results found.",
  disabled = false,
  className,
}) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")

  // Ensure options is always an array
  const safeOptions = Array.isArray(options) ? options : []
  
  // Filter options based on search term (case-insensitive)
  const filteredOptions = React.useMemo(() => {
    if (!searchTerm) return safeOptions
    return safeOptions.filter(option => 
      option && 
      option.label && 
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [safeOptions, searchTerm])

  const selectedOption = safeOptions.find((option) => option && option.value === value)

  const handleSelect = (option) => {
    onValueChange(option.value === value ? "" : option.value)
    setOpen(false)
    setSearchTerm("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          {selectedOption?.label || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <div className="p-2">
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-2"
          />
          <div className="max-h-60 overflow-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    "flex items-center px-2 py-2 cursor-pointer hover:bg-gray-100 rounded",
                    value === option.value && "bg-blue-100"
                  )}
                  onClick={() => handleSelect(option)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </div>
              ))
            ) : (
              <div className="px-2 py-2 text-sm text-gray-500">
                {emptyPlaceholder}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}