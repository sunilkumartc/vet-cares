# Vital Trends Feature

## Overview

The Vital Trends feature allows veterinarians to visually track a pet's vital signs over time using interactive charts. This provides valuable insights into a pet's health trends and helps identify patterns or concerning changes.

## Features

### 🎯 **Core Functionality**
- **Interactive Charts**: Line charts with zoom, tooltips, and trend indicators
- **Multiple Metrics**: Weight, Temperature, Heart Rate, Blood Pressure (Systolic/Diastolic)
- **Date Range Selection**: Customizable time periods with quick presets
- **Data Aggregation**: Daily, weekly, monthly, or raw data views
- **Trend Analysis**: Percentage change indicators and visual trends

### 📊 **Chart Components**
- **Responsive Design**: Adapts to different screen sizes
- **High-Contrast Colors**: Accessible color scheme from Tailwind theme
- **Interactive Elements**: Hover tooltips, zoom functionality, and legends
- **Real-time Updates**: Live data fetching with loading states

### 🔧 **Technical Implementation**

#### Backend API
- **Endpoint**: `GET /api/pets/:petId/vitals`
- **Query Parameters**:
  - `metric`: weight, temp, hr, bp_sys, bp_dia
  - `from`: Start date (ISO format)
  - `to`: End date (ISO format)
  - `resolution`: raw, day, week, month
  - `tenant_id`: For multi-tenant isolation

#### Database Schema
```javascript
// vital_entries collection
{
  _id: ObjectId,
  pet_id: ObjectId,
  tenant_id: ObjectId,
  metric: String,        // 'weight', 'temp', 'hr', 'bp_sys', 'bp_dia'
  value: Number,
  unit: String,          // 'kg', '°C', 'bpm', 'mmHg'
  recorded_at: Date,
  created_at: Date,
  updated_at: Date
}
```

#### Indexes
- `(pet_id, metric, recorded_at)` - Composite index for efficient queries
- `(tenant_id)` - Tenant isolation
- `(recorded_at)` - Date range queries

### 🎨 **Frontend Components**

#### VitalTrendChart.jsx
- Reusable chart component using Recharts
- Supports all vital metrics with appropriate formatting
- Includes trend indicators and change percentages
- Error handling and loading states

#### DateRangePicker.jsx
- Tailwind + Headless UI implementation
- Quick range presets (7 days, 30 days, 3 months, 6 months, 1 year)
- Custom date range selection
- URL query parameter persistence

#### PetProfile.jsx
- New page with tabbed interface
- Vitals tab as default with 2x2 grid layout
- Additional tabs for medications, notes, and history
- Links from existing pet detail pages

### 🚀 **Usage**

#### For Veterinarians
1. Navigate to any pet's details page
2. Click "View Vital Trends" button
3. Select desired date range
4. View trends across all vital metrics
5. Use zoom and hover for detailed analysis

#### API Usage Examples
```bash
# Get weight data for last 6 months (daily aggregation)
curl "http://localhost:3001/api/pets/{petId}/vitals?metric=weight&from=2024-01-01&to=2024-06-30&resolution=day"

# Get temperature data (raw values)
curl "http://localhost:3001/api/pets/{petId}/vitals?metric=temp&from=2024-01-01&to=2024-06-30&resolution=raw"

# Get heart rate data (weekly aggregation)
curl "http://localhost:3001/api/pets/{petId}/vitals?metric=hr&from=2024-01-01&to=2024-06-30&resolution=week"
```

### 📈 **Data Visualization**

#### Chart Features
- **Line Charts**: Smooth curves showing trends over time
- **Tooltips**: Detailed information on hover
- **Brush Component**: Zoom functionality for detailed analysis
- **Trend Badges**: Visual indicators for changes (up/down/stable)
- **Responsive Axes**: Automatic scaling based on data ranges

#### Color Scheme
- **Weight**: Blue (#3B82F6)
- **Temperature**: Red (#EF4444)
- **Heart Rate**: Green (#10B981)
- **Blood Pressure**: Purple (#8B5CF6)

### 🔒 **Accessibility**
- ARIA labels for screen readers
- High-contrast color scheme
- Keyboard navigation support
- Focus indicators for interactive elements

### 📱 **Mobile Responsiveness**
- Responsive grid layout (1 column on mobile, 2 on desktop)
- Touch-friendly interactive elements
- Optimized chart sizing for small screens

## Installation & Setup

### 1. Install Dependencies
```bash
npm install recharts
```

### 2. Run Database Migration
```bash
node scripts/create-vital-entries.js
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Access the Feature
- Navigate to any pet's details page
- Click "View Vital Trends" button
- Or directly visit `/PetProfile?id={petId}`

## Sample Data

The migration script creates 6 months of realistic sample data for existing pets:
- **Weight**: Seasonal variations with realistic ranges
- **Temperature**: Normal ranges with slight variations
- **Heart Rate**: Physiological ranges with activity-based changes
- **Blood Pressure**: Realistic systolic/diastolic values

## Future Enhancements

### Planned Features
- **Alert Thresholds**: Visual indicators for abnormal values
- **Comparative Analysis**: Compare multiple pets or time periods
- **Export Functionality**: PDF/CSV export of vital trends
- **Predictive Analytics**: Trend forecasting based on historical data
- **Integration**: Connect with medical devices for automatic data entry

### Technical Improvements
- **Caching**: Redis caching for frequently accessed data
- **Real-time Updates**: WebSocket integration for live data
- **Advanced Aggregations**: Statistical analysis (mean, median, percentiles)
- **Data Validation**: Enhanced input validation and error handling

## Troubleshooting

### Common Issues
1. **No Data Displayed**: Check if vital entries exist for the pet
2. **API Errors**: Verify pet ID format and date ranges
3. **Chart Not Loading**: Ensure Recharts is properly installed
4. **Performance Issues**: Check database indexes are created

### Debug Commands
```bash
# Check if vital entries exist
mongo vet-cares --eval "db.vital_entries.countDocuments()"

# Verify indexes
mongo vet-cares --eval "db.vital_entries.getIndexes()"

# Test API endpoint
curl "http://localhost:3001/api/pets/{petId}/vitals?metric=weight"
```

## Contributing

When adding new vital metrics:
1. Update the API validation in `server.js`
2. Add metric configuration in `VitalTrendChart.jsx`
3. Update the migration script for sample data
4. Add appropriate color scheme and formatting
5. Update documentation

---

**Note**: This feature is designed to work with the existing multi-tenant architecture and maintains data isolation between different veterinary clinics. 