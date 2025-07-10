import React, { useState } from "react";
import { Check, ChevronsUpDown, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export default function ProductSearchCombobox({ 
  products, 
  onProductSelect, 
  selectedProductId, 
  onCustomValue, 
  allowCustom = false, 
  initialValue = "" 
}) {
  const [open, setOpen] = useState(false);
  const selectedProduct = products.find(p => p.id === selectedProductId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between border-blue-200 focus:border-blue-500"
        >
          <span className="truncate">
            {selectedProduct ? selectedProduct.name : 
             initialValue ? initialValue : 
             "Search product/service..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search products or type custom service..." />
          <CommandList>
            <CommandEmpty>
              <div className="p-4 text-center">
                <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">No product found</p>
                {allowCustom && (
                  <p className="text-xs text-gray-500 mt-1">
                    Switch to manual entry to add custom services
                  </p>
                )}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {products.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.name}
                  onSelect={() => {
                    onProductSelect(product);
                    setOpen(false);
                  }}
                  className="flex flex-col items-start"
                >
                  <div className="flex items-center w-full">
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedProductId === product.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.category}</p>
                    </div>
                    <div className="text-right">
                       <p className="font-semibold text-green-600">₹{(product.selling_price || 0).toFixed(2)}</p>
                       <Badge variant={(product.total_stock || 0) > 0 ? "default" : "destructive"} className="text-xs">
                         Stock: {product.total_stock || 0}
                       </Badge>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}