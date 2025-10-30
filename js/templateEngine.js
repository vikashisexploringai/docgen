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
        
        return new Promise((resolve, reject) => {
            // Load the template using fetch
            fetch(templateUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to fetch template: ${response.status} ${response.statusText}`);
                    }
                    return response.arrayBuffer();
                })
                .then(arrayBuffer => {
                    console.log('Template fetched, size:', arrayBuffer.byteLength, 'bytes');
                    
                    try {
                        // Convert to Uint8Array for JSZip 2.6.1
                        const uint8Array = new Uint8Array(arrayBuffer);
                        
                        // Load with JSZip 2.6.1 - use the constructor directly
                        const zip = new JSZip(uint8Array);
                        
                        // Initialize docxtemplater
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
                        
                        // Generate output
                        console.log('Generating output DOCX...');
                        const outBuffer = doc.getZip().generate({ 
                            type: 'blob',
                            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                        });
                        
                        console.log('DOCX generated successfully');
                        resolve(outBuffer);
                        
                    } catch (processingError) {
                        console.error('DOCX processing error:', processingError);
                        reject(new Error(`Document processing failed: ${processingError.message}`));
                    }
                })
                .catch(error => {
                    console.error('Failed to load template:', error);
                    reject(new Error(`Failed to load template: ${error.message}`));
                });
        });
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
