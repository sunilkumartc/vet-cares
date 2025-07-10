#!/bin/bash

# New Tenant Configuration Script
# This script creates and configures a new tenant with all necessary settings

BASE_URL="http://localhost:3001"

echo "🏥 Vet Cares - New Tenant Configuration"
echo "======================================="
echo ""

# Function to create a new tenant
create_tenant() {
    local tenant_name="$1"
    local tenant_slug="$2"
    local domain="$3"
    local email="$4"
    local phone="$5"
    local address="$6"
    local billing_plan="$7"
    
    echo "Creating tenant: $tenant_name"
    echo "Slug: $tenant_slug"
    echo "Domain: $domain"
    echo "Billing Plan: $billing_plan"
    echo ""
    
    # Create the tenant
    local response=$(curl -s -X POST "$BASE_URL/api/admin/tenants" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "'"$tenant_name"'",
            "slug": "'"$tenant_slug"'",
            "domain": "'"$domain"'",
            "contact_email": "'"$email"'",
            "contact_phone": "'"$phone"'",
            "address": "'"$address"'",
            "timezone": "America/New_York",
            "currency": "USD",
            "language": "en",
            "billing_plan": "'"$billing_plan"'",
            "status": "active",
            "max_staff": 20,
            "max_clients": 2000,
            "max_storage_gb": 50,
            "custom_branding": true,
            "sso_enabled": false,
            "api_access": true,
            "features_json": "{\"appointments\": true, \"billing\": true, \"inventory\": true, \"analytics\": true, \"staffManagement\": true, \"clientPortal\": true, \"telemedicine\": false, \"labIntegration\": false, \"pharmacyIntegration\": false}",
            "theme_json": "{\"primary_color\": \"#3B82F6\", \"secondary_color\": \"#1E40AF\", \"accent_color\": \"#F59E0B\", \"logo_url\": \"\", \"custom_css\": \"\"}"
        }')
    
    echo "Response: $response"
    echo ""
    
    # Extract tenant ID from response
    local tenant_id=$(echo "$response" | jq -r '._id // .id')
    
    if [ "$tenant_id" != "null" ] && [ "$tenant_id" != "" ]; then
        echo "✅ Tenant created successfully!"
        echo "Tenant ID: $tenant_id"
        echo ""
        
        # Configure additional settings
        configure_tenant_settings "$tenant_id" "$tenant_name"
        
        return 0
    else
        echo "❌ Failed to create tenant"
        return 1
    fi
}

# Function to configure tenant settings
configure_tenant_settings() {
    local tenant_id="$1"
    local tenant_name="$2"
    
    echo "🔧 Configuring tenant settings for: $tenant_name"
    echo ""
    
    # 1. Create admin user for the tenant
    echo "Creating admin user..."
    local admin_response=$(curl -s -X POST "$BASE_URL/api/admin/tenants/$tenant_id/staff" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "Admin User",
            "email": "admin@'"$tenant_name"'.com",
            "phone": "+1234567890",
            "role": "admin",
            "permissions": ["all"],
            "status": "active"
        }')
    
    echo "Admin user response: $admin_response"
    echo ""
    
    # 2. Create sample staff members
    echo "Creating sample staff members..."
    local staff_response=$(curl -s -X POST "$BASE_URL/api/admin/tenants/$tenant_id/staff" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "Dr. Sarah Johnson",
            "email": "sarah.johnson@'"$tenant_name"'.com",
            "phone": "+1234567891",
            "role": "veterinarian",
            "permissions": ["appointments", "medical_records", "billing"],
            "status": "active"
        }')
    
    echo "Staff response: $staff_response"
    echo ""
    
    # 3. Create sample services
    echo "Creating sample services..."
    local services_response=$(curl -s -X POST "$BASE_URL/api/admin/tenants/$tenant_id/services" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "General Checkup",
            "description": "Routine health examination",
            "price": 75.00,
            "duration": 30,
            "category": "examination"
        }')
    
    echo "Services response: $services_response"
    echo ""
    
    # 4. Create sample vaccinations
    echo "Creating sample vaccinations..."
    local vaccines_response=$(curl -s -X POST "$BASE_URL/api/admin/tenants/$tenant_id/vaccinations" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "Rabies Vaccine",
            "description": "Annual rabies vaccination",
            "price": 45.00,
            "duration": 15,
            "category": "vaccination"
        }')
    
    echo "Vaccinations response: $vaccines_response"
    echo ""
    
    echo "✅ Tenant configuration completed!"
    echo ""
}

# Function to list available billing plans
show_billing_plans() {
    echo "📋 Available Billing Plans:"
    echo "1. basic - $29/month (10 staff, 1000 clients, 10GB storage)"
    echo "2. professional - $79/month (25 staff, 5000 clients, 100GB storage)"
    echo "3. premium - $149/month (50 staff, 10000 clients, 500GB storage)"
    echo "4. enterprise - $299/month (Unlimited staff, Unlimited clients, 1TB storage)"
    echo ""
}

# Function to validate input
validate_input() {
    local input="$1"
    local field_name="$2"
    
    if [ -z "$input" ]; then
        echo "❌ $field_name cannot be empty"
        return 1
    fi
    
    return 0
}

# Main configuration flow
main() {
    echo "Welcome to the New Tenant Configuration Wizard!"
    echo ""
    
    # Show billing plans
    show_billing_plans
    
    # Get tenant information
    read -p "Enter tenant name (e.g., 'Downtown Animal Hospital'): " tenant_name
    if ! validate_input "$tenant_name" "Tenant name"; then
        exit 1
    fi
    
    read -p "Enter tenant slug (e.g., 'downtown-animal-hospital'): " tenant_slug
    if ! validate_input "$tenant_slug" "Tenant slug"; then
        exit 1
    fi
    
    read -p "Enter domain (e.g., 'downtown.vetclinic.com'): " domain
    if ! validate_input "$domain" "Domain"; then
        exit 1
    fi
    
    read -p "Enter contact email: " email
    if ! validate_input "$email" "Contact email"; then
        exit 1
    fi
    
    read -p "Enter contact phone: " phone
    if ! validate_input "$phone" "Contact phone"; then
        exit 1
    fi
    
    read -p "Enter address: " address
    if ! validate_input "$address" "Address"; then
        exit 1
    fi
    
    echo ""
    show_billing_plans
    read -p "Enter billing plan (basic/professional/premium/enterprise): " billing_plan
    
    # Validate billing plan
    case $billing_plan in
        basic|professional|premium|enterprise)
            ;;
        *)
            echo "❌ Invalid billing plan. Using 'basic' as default."
            billing_plan="basic"
            ;;
    esac
    
    echo ""
    echo "📝 Configuration Summary:"
    echo "Name: $tenant_name"
    echo "Slug: $tenant_slug"
    echo "Domain: $domain"
    echo "Email: $email"
    echo "Phone: $phone"
    echo "Address: $address"
    echo "Billing Plan: $billing_plan"
    echo ""
    
    read -p "Proceed with tenant creation? (y/N): " confirm
    if [[ $confirm =~ ^[Yy]$ ]]; then
        create_tenant "$tenant_name" "$tenant_slug" "$domain" "$email" "$phone" "$address" "$billing_plan"
    else
        echo "❌ Tenant creation cancelled."
        exit 0
    fi
}

# Check if server is running
check_server() {
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/admin/tenants")
    if [ "$response" != "200" ]; then
        echo "❌ Server is not running or not accessible at $BASE_URL"
        echo "Please start the server first: node server.js"
        exit 1
    fi
    echo "✅ Server is running and accessible"
    echo ""
}

# Run the configuration
check_server
main

echo ""
echo "🎉 Tenant configuration completed!"
echo ""
echo "📋 Next Steps:"
echo "1. Access the frontend at: http://localhost:5173/"
echo "2. Navigate to Tenant Management to see your new tenant"
echo "3. Login with the admin credentials created"
echo "4. Configure additional settings as needed"
echo ""
echo "🔗 Useful URLs:"
echo "• Frontend: http://localhost:5173/"
echo "• API: http://localhost:3001/"
echo "• Tenant Management: http://localhost:5173/tenant-management"
echo "" 