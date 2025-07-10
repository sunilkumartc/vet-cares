import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Trash2, Package } from "lucide-react";

export default function CartItem({ item, onUpdateQuantity, onRemove }) {
  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg">
      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
        <Package className="w-5 h-5 text-blue-600" />
      </div>
      
      <div className="flex-1">
        <h4 className="font-medium text-sm">{item.product.name}</h4>
        <p className="text-xs text-gray-600">
          Batch: {item.batch.batch_id} • ₹{item.unitPrice}/unit
        </p>
        <Badge variant="outline" className="text-xs">
          Stock: {item.batch.quantity_on_hand}
        </Badge>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-6 w-6"
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
        >
          <Minus className="h-3 w-3" />
        </Button>
        
        <span className="w-8 text-center text-sm font-medium">
          {item.quantity}
        </span>
        
        <Button
          variant="outline"
          size="icon"
          className="h-6 w-6"
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      
      <div className="text-right">
        <p className="font-semibold">₹{item.total.toFixed(2)}</p>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-red-500"
          onClick={() => onRemove(item.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}