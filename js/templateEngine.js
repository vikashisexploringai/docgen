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
            console.log('Fetching template from:', templateUrl);
            
            // Fetch the template from your GitHub repository
            const response = await fetch(templateUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch template: ${response.status} ${response.statusText}`);
            }
            
            const templateBuffer = await response.arrayBuffer();
            console.log('Template fetched successfully, size:', templateBuffer.byteLength, 'bytes');
            
            // Load the template directly with docxtemplater
            const doc = new docxtemplater();
            
            // Use the correct JSZip loading method
            const zip = new JSZip();
            await zip.loadAsync(templateBuffer);
            
            doc.loadZip(zip);
            
            // Prepare data for template (convert dates, format numbers, etc.)
            const templateData = this.prepareTemplateData(formData);
            console.log('Template data prepared:', templateData);
            
            // Set template data
            doc.setData(templateData);
            
            try {
                // Render the document
                console.log('Rendering document...');
                doc.render();
                console.log('Document rendered successfully');
            } catch (renderError) {
                console.error('Template rendering error:', renderError);
                throw new Error(`Template rendering failed: ${renderError.message}`);
            }
            
            // Generate the output DOCX
            console.log('Generating output DOCX...');
            const outBuffer = doc.getZip().generate({ 
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
    
    // Alternative method using JSZipUtils (more reliable)
    async processDocxTemplateAlternative(templateUrl, formData) {
        return new Promise((resolve, reject) => {
            // Use JSZipUtils for better compatibility
            JSZipUtils.getBinaryContent(templateUrl, (error, content) => {
                if (error) {
                    reject(new Error(`Failed to load template: ${error.message}`));
                    return;
                }
                
                try {
                    console.log('Template loaded via JSZipUtils, size:', content.byteLength, 'bytes');
                    
                    const zip = new JSZip(content);
                    const doc = new docxtemplater();
                    doc.loadZip(zip);
                    
                    const templateData = this.prepareTemplateData(formData);
                    doc.setData(templateData);
                    doc.render();
                    
                    const out = doc.getZip().generate({
                        type: 'blob',
                        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    });
                    
                    resolve(out);
                } catch (processingError) {
                    reject(new Error(`Template processing failed: ${processingError.message}`));
                }
            });
        });
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
