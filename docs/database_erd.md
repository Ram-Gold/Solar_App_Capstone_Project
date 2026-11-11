# JD Solar Platform - Entity Relationship Diagram (ERD)

```erDiagram
    AUTH_USERS ||--o| ADMINS : "is (1:1 via id)"
    AUTH_USERS ||--o| STAFF : "is (1:1 via id)"
    
    CUSTOMERS ||--o| CUSTOMER_PASSWORDS : "authenticates (1:1 via customer_id)"
    CUSTOMERS ||--o{ CUSTOMER_PURCHASES : "owns (1:M via customer_id)"
    CUSTOMERS ||--o{ EMAIL_CONFIRMATION_QUEUE : "queues (1:M via customer_id)"
    PRODUCTS ||--o{ CUSTOMER_PURCHASES : "sold as (1:M via product_id)"
    CUSTOMER_PURCHASES ||--o{ WARRANTY_CLAIMS : "covers (1:M via purchase_id)"
    
    PRODUCTS ||--o{ QUOTE_TICKETS : "inquired (1:M via product_id)"

    AUTH_USERS {
        uuid id PK
        text email UK
    }
    ADMINS {
        uuid id PK
        text full_name
        text email
        text phone
        text position
        timestamptz created_at
    }
    STAFF {
        uuid id PK
        text full_name
        text email
        text phone
        text position
        timestamptz created_at
    }
    CATEGORIES {
        bigint id PK
        text name UK
        timestamptz created_at
    }
    PRODUCTS {
        integer id PK
        text name UK
        text type
        integer watt
        text size
        text image_url
        integer sales
        text battery
        boolean in_stock
        integer stock_quantity
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
        uuid id PK
        text phone_number UK
        text full_name
        text email
        boolean email_confirmed
        text email_confirmation_status
        uuid email_verification_token UK
        timestamptz email_confirmation_sent_at
        timestamptz email_confirmed_at
        uuid access_token UK
        text province
        text city
        text barangay
        text street_address
        text facebook
        timestamptz created_at
    }
    EMAIL_CONFIRMATION_QUEUE {
        uuid id PK
        uuid customer_id FK
        text recipient_email
        text subject
        text status
        uuid verification_token
        integer attempts
        text last_error
        timestamptz created_at
        timestamptz sent_at
        timestamptz confirmed_at
    }
    CUSTOMER_PASSWORDS {
        uuid id PK
        uuid customer_id FK
        text email UK
        text password_hash
        timestamptz created_at
        timestamptz updated_at
    }
    CUSTOMER_PURCHASES {
        uuid id PK
        uuid customer_id FK
        bigint product_id FK
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
        uuid id PK
        uuid purchase_id FK
        text issue_category
        text description
        json media_urls
        text status
        text staff_notes
        timestamptz created_at
        timestamptz updated_at
    }
    QUOTE_TICKETS {
        bigint id PK
        text ticket_code UK
        bigint product_id FK
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
```
