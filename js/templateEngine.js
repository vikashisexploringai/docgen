// Template Engine Module - Handles DOCX template processing

class TemplateEngine {
    constructor() {
        this.initialized = false;
    }
    
    async init() {
        // Load any required resources
        this.initialized = true;
    }
    
    async generateDocument(docConfig, formData) {
        if (!this.initialized) {
            await this.init();
        }
        
        try {
            // Fetch and process the actual DOCX template
            const result = await this.processDocxTemplate(docConfig.template, formData);
            
            return {
                blob: result,
                filename: `${docConfig.name.replace(/\s+/g, '_')}_${this.getTimestamp()}.docx`
            };
            
        } catch (error) {
            console.error('Template generation error:', error);
            throw new Error(`Failed to generate document: ${error.message}`);
        }
    }
    
    async processDocxTemplate(templateUrl, formData) {
        try {
            // Fetch the template from your GitHub repository
            const response = await fetch(templateUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch template: ${response.statusText}`);
            }
            
            const templateBuffer = await response.arrayBuffer();
            
            // Initialize docxtemplater
            const zip = new JSZip();
            const doc = new docxtemplater();
            
            // Load the template
            await zip.loadAsync(templateBuffer);
            doc.loadZip(zip);
            
            // Prepare data for template (convert dates, format numbers, etc.)
            const templateData = this.prepareTemplateData(formData);
            
            // Set template data
            doc.setData(templateData);
            
            try {
                // Render the document
                doc.render();
            } catch (renderError) {
                console.error('Template rendering error:', renderError);
                throw new Error(`Template rendering failed: ${renderError.message}`);
            }
            
            // Generate the output DOCX
            const outBuffer = doc.getZip().generate({ 
                type: 'blob',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });
            
            return outBuffer;
            
        } catch (error) {
            console.error('DOCX processing error:', error);
            throw new Error(`Document processing failed: ${error.message}`);
        }
    }
    
    prepareTemplateData(formData) {
        // Clone the form data to avoid modifying the original
        const templateData = { ...formData };
        
        // Format dates for display
        Object.keys(templateData).forEach(key => {
            if (key.includes('DATE') || key.includes('_DATE')) {
                templateData[key] = this.formatDateForDisplay(templateData[key]);
            }
            
            // Format currency fields
            if (['TAX', 'PENALTY', 'INTEREST', 'TOTAL'].includes(key)) {
                templateData[key] = this.formatCurrencyForDisplay(templateData[key]);
            }
        });
        
        return templateData;
    }
    
    formatDateForDisplay(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    }
    
    formatCurrencyForDisplay(amount) {
        if (!amount) return '0.00';
        
        const num = parseFloat(amount);
        if (isNaN(num)) return '0.00';
        
        return num.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
    
    getTimestamp() {
        const now = new Date();
        return now.getFullYear() + 
               String(now.getMonth() + 1).padStart(2, '0') + 
               String(now.getDate()).padStart(2, '0') + 
               String(now.getHours()).padStart(2, '0') + 
               String(now.getMinutes()).padStart(2, '0');
    }
    
    // Utility method to test template connectivity
    async testTemplateConnection(templateUrl) {
        try {
            const response = await fetch(templateUrl, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            return false;
        }
    }
}
