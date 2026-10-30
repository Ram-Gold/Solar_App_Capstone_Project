```erDiagram
    AUTH_USERS ||--o| ADMINS : "is"
    AUTH_USERS ||--o| STAFF : "is"
    AUTH_USERS |o..o| CUSTOMERS : "logs in as"
    CUSTOMERS ||--o| CUSTOMER_PASSWORDS : "authenticates"
    CUSTOMERS ||--o{ CUSTOMER_PURCHASES : "owns"
    PRODUCTS ||--o{ CUSTOMER_PURCHASES : "sold as"
    CUSTOMER_PURCHASES ||--o{ WARRANTY_CLAIMS : "covers"
    CATEGORIES ||..o{ PRODUCTS : "classifies"
    PRODUCTS |o--o{ QUOTE_TICKETS : "inquired"
    CUSTOMERS |o..o{ QUOTE_TICKETS : "submits"
    PRODUCTS |o..o{ ORDERS : "ordered"
    CUSTOMERS |o..o{ ORDERS : "places"
    AUTH_USERS {
        uuid id
        text email
    }
    ADMINS {
        uuid id
        text full_name
        text email
        text phone
        text position
        timestamptz created_at
    }
    STAFF {
        uuid id
        text full_name
        text email
        text phone
        text position
        timestamptz created_at
    }
    CATEGORIES {
        bigint id
        text name
        timestamptz created_at
    }
    PRODUCTS {
        integer id
        text name
        text type
        integer watt
        text size
        text image_url
        integer sales
        text battery
        boolean in_stock
        text waterproof_grade
        text method_control
        text material
        text solar_panel
        text charging_time
        text charging_type
        text smd_lamp_beads
        text lighting_time
        text price_range
        text recommended_usage
        text ideal_location
        integer default_warranty_months
        integer stock_quantity
        text beaming_angle
        text color_temperature
        text voltage
        text lamp_body_color
        text warranty
        text life_span
        text lumens
        text place_of_use
        text power_source
    }
    CUSTOMERS {
        uuid id
        text phone_number
        text full_name
        uuid access_token
        text province
        text city
        text barangay
        text street_address
        text facebook
        timestamptz created_at
    }
    CUSTOMER_PASSWORDS {
        uuid id
        uuid customer_id
        text email
        text password_hash
        timestamptz created_at
        timestamptz updated_at
    }
    CUSTOMER_PURCHASES {
        uuid id
        uuid customer_id
        bigint product_id
        text serial_number
        date purchase_date
        integer warranty_months
        date warranty_expires_at
        text branch_location
        boolean is_voided
        text void_reason
        timestamptz voided_at
        timestamptz created_at
    }
    WARRANTY_CLAIMS {
        uuid id
        uuid purchase_id
        text issue_category
        text description
        text_array media_urls
        text status
        text staff_notes
        timestamptz created_at
        timestamptz updated_at
    }
    QUOTE_TICKETS {
        bigint id
        text ticket_code
        bigint product_id
        text product_name
        integer product_watt
        text product_price_range
        text product_image_url
        integer quantity
        text customer_name
        text mobile_contact
        text email
        text province
        text city
        text barangay
        text street_address
        text postal_code
        text facebook
        text instagram
        text purpose_of_visitation
        boolean will_visit
        text store_branch
        date visit_date
        text visit_time_slot
        text preferred_channel
        text delivery_address
        text project_notes
        text status
        text staff_notes
        timestamptz created_at
        timestamptz updated_at
    }
    ORDERS {
        bigint id
        text customer_name
        text address
        text product_name
        integer quantity
        numeric price
        text status
        timestamptz created_at
    }```
