// Central registry for all document types
// Add new document types here without touching other files

const documentRegistry = {
    "DRC-13": {
        name: "FORM GST DRC-13",
        description: "Notice to third person under Section 79(1)(c)",
        template: "templates/DRC-13-Template.docx",
        fields: {
            BANK_NAME: { 
                type: "text", 
                label: "Bank Name", 
                required: true,
                group: "bank"
            },
            BANK_ADDRESS_LINE1: { 
                type: "text", 
                label: "Bank Address Line 1", 
                required: true,
                group: "bank"
            },
            BANK_ADDRESS_LINE2: { 
                type: "text", 
                label: "Bank Address Line 2", 
                required: false,
                group: "bank"
            },
            GSTIN: { 
                type: "text", 
                label: "GSTIN Number", 
                required: true,
                pattern: "\\d{2}[A-Z]{5}\\d{4}[A-Z]{1}[A-Z\\d]{1}[Z]{1}[A-Z\\d]{1}",
                placeholder: "e.g., 07AABCU9603R1ZM",
                group: "taxpayer"
            },
            TRADE_NAME: { 
                type: "text", 
                label: "Trade Name", 
                required: true,
                group: "taxpayer"
            },
            LEGAL_NAME: { 
                type: "text", 
                label: "Legal Name", 
                required: true,
                group: "taxpayer"
            },
            TAXPAYER_ADDRESS_LINE1: { 
                type: "text", 
                label: "Taxpayer Address Line 1", 
                required: true,
                group: "taxpayer"
            },
            TAXPAYER_ADDRESS_LINE2: { 
                type: "text", 
                label: "Taxpayer Address Line 2", 
                required: false,
                group: "taxpayer"
            },
            ACCOUNT_NO: { 
                type: "text", 
                label: "Account Number", 
                required: true,
                group: "bank"
            },
            PAN_NO: { 
                type: "text", 
                label: "PAN Number", 
                required: true,
                pattern: "[A-Z]{5}\\d{4}[A-Z]{1}",
                placeholder: "e.g., ABCDE1234F",
                group: "taxpayer"
            },
            OIO_NO: { 
                type: "text", 
                label: "OIO Number", 
                required: true,
                group: "case"
            },
            OIO_DATE: { 
                type: "date", 
                label: "OIO Date", 
                required: true,
                group: "case"
            },
            TAX: { 
                type: "number", 
                label: "Tax Amount (₹)", 
                required: true,
                min: 0,
                group: "amount"
            },
            PENALTY: { 
                type: "number", 
                label: "Penalty Amount (₹)", 
                required: true,
                min: 0,
                group: "amount"
            },
            INTEREST: { 
                type: "number", 
                label: "Interest Amount (₹)", 
                required: true,
                min: 0,
                group: "amount"
            },
            TOTAL: { 
                type: "number", 
                label: "Total Amount (₹)", 
                required: true,
                min: 0,
                group: "amount"
            }
        },
        fieldGroups: {
            bank: { name: "Bank Details", order: 1 },
            taxpayer: { name: "Taxpayer Details", order: 2 },
            case: { name: "Case Details", order: 3 },
            amount: { name: "Amount Details", order: 4 }
        }
    },
    "OIO": {
        name: "Order-in-Original (OIO)",
        description: "Adjudication order under GST",
        template: "templates/OIO-Template.docx",
        fields: {
            CASE_NO: { 
                type: "text", 
                label: "Case Number", 
                required: true,
                group: "case"
            },
            GSTIN: { 
                type: "text", 
                label: "GSTIN Number", 
                required: true,
                pattern: "\\d{2}[A-Z]{5}\\d{4}[A-Z]{1}[A-Z\\d]{1}[Z]{1}[A-Z\\d]{1}",
                group: "taxpayer"
            },
            TRADE_NAME: { 
                type: "text", 
                label: "Trade Name", 
                required: true,
                group: "taxpayer"
            },
            LEGAL_NAME: { 
                type: "text", 
                label: "Legal Name", 
                required: true,
                group: "taxpayer"
            },
            HEARING_DATE: { 
                type: "date", 
                label: "Hearing Date", 
                required: true,
                group: "case"
            },
            ORDER_DATE: { 
                type: "date", 
                label: "Order Date", 
                required: true,
                group: "case"
            },
            ISSUING_OFFICER: { 
                type: "text", 
                label: "Issuing Officer Name", 
                required: true,
                group: "officer"
            },
            DESIGNATION: { 
                type: "text", 
                label: "Designation", 
                required: true,
                group: "officer"
            }
        },
        fieldGroups: {
            case: { name: "Case Details", order: 1 },
            taxpayer: { name: "Taxpayer Details", order: 2 },
            officer: { name: "Officer Details", order: 3 }
        }
    }
};

// Function to add new document types dynamically
function registerDocumentType(key, config) {
    if (documentRegistry[key]) {
        console.warn(`Document type '${key}' already exists. Overwriting.`);
    }
    documentRegistry[key] = config;
    
    // If app is already running, refresh the document list
    if (window.gstApp) {
        window.gstApp.renderDocumentList();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { documentRegistry, registerDocumentType };
}
