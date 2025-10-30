// Template Engine Module - Handles DOCX template processing

class TemplateEngine {
    constructor() {
        this.initialized = false;
    }
    
    async init() {
        this.initialized = true;
    }
    
    async generateDocument(docConfig, formData) {
        if (!this.initialized) {
            await this.init();
        }
        
        try {
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
        console.log('Starting DOCX processing for:', templateUrl);
        
        try {
            // Fetch template using modern fetch API
            console.log('Fetching template...');
            const response = await fetch(templateUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch template: ${response.status} ${response.statusText}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            console.log('Template fetched, size:', arrayBuffer.byteLength, 'bytes');
            
            // Load with JSZip 3.10.1 - CORRECT METHOD
            console.log('Loading with JSZip...');
            const zip = await JSZip.loadAsync(arrayBuffer);
            
            // Initialize docxtemplater
            console.log('Initializing docxtemplater...');
            const doc = new docxtemplater();
            doc.loadZip(zip);
            
            // Prepare and set data
            const templateData = this.prepareTemplateData(formData);
            console.log('Setting template data...');
            doc.setData(templateData);
            
            // Render the document
            console.log('Rendering document...');
            doc.render();
            console.log('Document rendered successfully');
            
            // Generate output - CORRECT METHOD for JSZip 3.10.1
            console.log('Generating output DOCX...');
            const outBuffer = await doc.getZip().generateAsync({ 
                type: 'blob',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });
            
            console.log('DOCX generated successfully');
            return outBuffer;
            
        } catch (error) {
            console.error('DOCX processing error:', error);
            throw new Error(`Document processing failed: ${error.message}`);
        }
    }
    
    prepareTemplateData(formData) {
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
    
    async testTemplateConnection(templateUrl) {
        try {
            const response = await fetch(templateUrl, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            return false;
        }
    }
}
