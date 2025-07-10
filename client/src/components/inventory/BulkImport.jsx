import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertTriangle, X } from "lucide-react";
import { TenantProduct, TenantProductBatch } from "@/api/tenant-entities";
import { ExtractDataFromUploadedFile, UploadFile } from "@/api/integrations";

export default function BulkImport() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewData(null);
      setImportResults(null);
    }
  };

  const downloadTemplate = () => {
    // Create CSV template
    const template = [
      'product_name,category,unit,selling_price,cost_price,reorder_point,manufacturer,barcode,description',
      'Amoxicillin 500mg,medicine,tablet,25.00,18.00,50,Cipla,1234567890123,Antibiotic for bacterial infections',
      'Royal Canin Adult,food,kg,850.00,720.00,10,Royal Canin,9876543210123,Premium adult dog food',
      'Flea Spray,supplies,bottle,280.00,220.00,20,Bayer,5555666677778,Effective flea and tick spray'
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_import_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const previewImport = async () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      
      const jsonSchema = {
        type: "object",
        properties: {
          products: {
            type: "array",
            items: {
              type: "object",
              properties: {
                product_name: { type: "string" },
                category: { type: "string" },
                unit: { type: "string" },
                selling_price: { type: "number" },
                cost_price: { type: "number" },
                reorder_point: { type: "number" },
                manufacturer: { type: "string" },
                barcode: { type: "string" },
                description: { type: "string" }
              }
            }
          }
        }
      };

      const result = await ExtractDataFromUploadedFile({
        file_url,
        json_schema: jsonSchema
      });

      if (result.status === 'success') {
        setPreviewData(result.output.products || []);
      } else {
        alert(`Error processing file: ${result.details}`);
      }
    } catch (error) {
      console.error('Error previewing import:', error);
      alert('Failed to preview import. Please check file format.');
    } finally {
      setUploading(false);
    }
  };

  const processImport = async () => {
    if (!previewData || previewData.length === 0) {
      alert('No data to import');
      return;
    }

    setProcessing(true);
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    try {
      for (const [index, productData] of previewData.entries()) {
        try {
          // Validate required fields
          if (!productData.product_name || !productData.category || !productData.unit || !productData.selling_price) {
            throw new Error('Missing required fields');
          }

          // Generate product ID
          const productId = `PRD-${Date.now().toString().slice(-6)}-${index}`;

          // Create product
          await TenantProduct.create({
            product_id: productId,
            name: productData.product_name,
            category: productData.category,
            unit: productData.unit,
            selling_price: parseFloat(productData.selling_price),
            cost_price: parseFloat(productData.cost_price) || 0,
            reorder_point: parseInt(productData.reorder_point) || 10,
            manufacturer: productData.manufacturer || '',
            barcode: productData.barcode || '',
            description: productData.description || '',
            is_active: true,
            total_stock: 0
          });

          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Row ${index + 1}: ${error.message}`);
        }
      }

      setImportResults(results);
      setPreviewData(null);
      setFile(null);
      
    } catch (error) {
      console.error('Error processing import:', error);
      alert('Failed to process import. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bulk Import</h2>
          <p className="text-gray-600">Import multiple products from CSV file</p>
        </div>
        <Button onClick={downloadTemplate} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Download Template
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload File
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select CSV File</Label>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
              <p className="text-xs text-gray-500">
                Supported formats: CSV, Excel (.xlsx, .xls)
              </p>
            </div>

            {file && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <Badge variant="outline" className="ml-auto">
                    {(file.size / 1024).toFixed(1)} KB
                  </Badge>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={previewImport}
                disabled={!file || uploading}
                className="flex-1"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Preview Import
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Import Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">1</div>
                <div>
                  <p className="font-medium">Download Template</p>
                  <p className="text-sm text-gray-600">Get the CSV template with correct column headers</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">2</div>
                <div>
                  <p className="font-medium">Fill TenantProduct Data</p>
                  <p className="text-sm text-gray-600">Add your products with required information</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">3</div>
                <div>
                  <p className="font-medium">Upload & Preview</p>
                  <p className="text-sm text-gray-600">Upload your file and preview the data</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">4</div>
                <div>
                  <p className="font-medium">Import Products</p>
                  <p className="text-sm text-gray-600">Process the import and add products to inventory</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Required Columns:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• product_name</li>
                <li>• category (medicine, food, accessories, etc.)</li>
                <li>• unit (piece, bottle, kg, etc.)</li>
                <li>• selling_price</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Data */}
      {previewData && previewData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Preview Data ({previewData.length} products)</CardTitle>
              <Button
                onClick={processImport}
                disabled={processing}
                className="bg-green-600 hover:bg-green-700"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Importing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Import Products
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 p-2 text-left">TenantProduct Name</th>
                    <th className="border border-gray-200 p-2 text-left">Category</th>
                    <th className="border border-gray-200 p-2 text-left">Unit</th>
                    <th className="border border-gray-200 p-2 text-left">Selling Price</th>
                    <th className="border border-gray-200 p-2 text-left">Manufacturer</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 10).map((product, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-200 p-2">{product.product_name}</td>
                      <td className="border border-gray-200 p-2">{product.category}</td>
                      <td className="border border-gray-200 p-2">{product.unit}</td>
                      <td className="border border-gray-200 p-2">₹{product.selling_price}</td>
                      <td className="border border-gray-200 p-2">{product.manufacturer || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewData.length > 10 && (
                <p className="text-sm text-gray-500 mt-2">
                  Showing first 10 of {previewData.length} products
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{importResults.successful}</p>
                <p className="text-sm text-green-700">Successfully Imported</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{importResults.failed}</p>
                <p className="text-sm text-red-700">Failed</p>
              </div>
            </div>

            {importResults.errors.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  Import Errors
                </h4>
                <div className="bg-red-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {importResults.errors.map((error, index) => (
                    <p key={index} className="text-sm text-red-700 mb-1">{error}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end mt-4">
              <Button
                onClick={() => setImportResults(null)}
                variant="outline"
              >
                <X className="w-4 h-4 mr-2" />
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}