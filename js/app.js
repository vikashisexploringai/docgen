// Main Application - Orchestrates all modules

class GSTDocumentApp {
    constructor() {
        this.currentDocument = null;
        this.formBuilder = new FormBuilder();
        this.templateEngine = new TemplateEngine();
        this.init();
    }
    
    init() {
        this.renderDocumentList();
        this.setupEventListeners();
        window.gstApp = this; // Make app globally accessible for dynamic registration
    }
    
    renderDocumentList() {
        const container = document.getElementById('document-list');
        container.innerHTML = '';
        
        Object.keys(documentRegistry).forEach(docKey => {
            const doc = documentRegistry[docKey];
            const card = document.createElement('div');
            card.className = 'document-card';
            card.dataset.docKey = docKey;
            
            card.innerHTML = `
                <div class="document-name">${doc.name}</div>
                <div class="document-desc">${doc.description}</div>
            `;
            
            card.addEventListener('click', () => this.selectDocument(docKey));
            container.appendChild(card);
        });
    }
    
    selectDocument(docKey) {
        // Update UI
        document.querySelectorAll('.document-card').forEach(card => {
            card.classList.remove('active');
        });
        document.querySelector(`[data-doc-key="${docKey}"]`).classList.add('active');
        
        this.currentDocument = docKey;
        this.renderForm(docKey);
        document.getElementById('action-section').classList.remove('hidden');
    }
    
    renderForm(docKey) {
        try {
            const formHtml = this.formBuilder.renderForm(docKey);
            document.getElementById('form-container').innerHTML = formHtml;
            
            // Set up any document-specific behaviors
            this.setupDocumentSpecificBehaviors(docKey);
            
        } catch (error) {
            console.error('Error rendering form:', error);
            Utils.showMessage(`Error loading form: ${error.message}`, 'error');
        }
    }
    
    setupDocumentSpecificBehaviors(docKey) {
        // Auto-calculate total for DRC-13
        if (docKey === 'DRC-13') {
            this.setupDRC13Calculations();
        }
    }
    
    setupDRC13Calculations() {
        const calculateTotal = Utils.debounce(() => {
            const tax = parseFloat(document.getElementById('TAX')?.value) || 0;
            const penalty = parseFloat(document.getElementById('PENALTY')?.value) || 0;
            const interest = parseFloat(document.getElementById('INTEREST')?.value) || 0;
            
            const total = tax + penalty + interest;
            const totalElement = document.getElementById('TOTAL');
            if (totalElement) {
                totalElement.value = total.toFixed(2);
            }
        }, 300);
        
        document.addEventListener('input', (e) => {
            if (['TAX', 'PENALTY', 'INTEREST'].includes(e.target.name)) {
                calculateTotal();
            }
        });
    }
    
    setupEventListeners() {
        document.getElementById('generate-btn').addEventListener('click', () => {
            this.generateDocument();
        });
    }
    
 async generateDocument() {
    if (!this.currentDocument) {
        Utils.showMessage('Please select a document type first.', 'error');
        return;
    }
    
    const docConfig = documentRegistry[this.currentDocument];
    const formData = this.formBuilder.collectFormData();
    
    // Clear previous errors
    this.formBuilder.clearFieldErrors();
    
    // Validate form
    if (!this.formBuilder.validateForm(formData)) {
        return;
    }
    
    // 🚨 TEMPORARY: Test template access first
    console.log('=== DEBUG: Testing template access ===');
    const canAccess = await this.templateEngine.testGeneration(docConfig, formData);
    
    if (!canAccess) {
        Utils.showMessage('Cannot access template file. Please check template path.', 'error');
        return;
    }
    
    Utils.showLoading('Generating document...');
    
    try {
        const result = await this.templateEngine.generateDocument(docConfig, formData);
        
        // Download the file
        saveAs(result.blob, result.filename);
        
        Utils.showMessage('Document generated successfully! Check your downloads.');
        
    } catch (error) {
        console.error('Generation error:', error);
        Utils.showMessage(`Error: ${error.message}`, 'error');
    }
}
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GSTDocumentApp();
});

// Example of adding a new document type dynamically:
/*
registerDocumentType("SCN", {
    name: "Show Cause Notice",
    description: "Notice for tax default under Section 73/74",
    template: "templates/SCN-Template.docx",
    fields: {
        NOTICE_NO: { 
            type: "text", 
            label: "Notice Number", 
            required: true,
            group: "notice"
        },
        GSTIN: { 
            type: "text", 
            label: "GSTIN Number", 
            required: true,
            group: "taxpayer"
        },
        // ... more fields
    },
    fieldGroups: {
        notice: { name: "Notice Details", order: 1 },
        taxpayer: { name: "Taxpayer Details", order: 2 }
    }
});
*/
