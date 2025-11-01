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
            const urlWithCache = `${templateUrl}?v=${Date.now()}`;
            console.log('Fetching template from:', urlWithCache);
            
            const response = await fetch(urlWithCache);
            if (!response.ok) {
                throw new Error(`Failed to fetch template: ${response.status} ${response.statusText}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            console.log('Template fetched, size:', arrayBuffer.byteLength, 'bytes');
            
            // Pre-process the template to handle XML issues
            const processedArrayBuffer = await this.preprocessTemplate(arrayBuffer);
            const uint8Array = new Uint8Array(processedArrayBuffer);
            
            console.log('Loading with JSZip...');
            const zip = new JSZip(uint8Array);
            
            console.log('Initializing docxtemplater...');
            const doc = new docxtemplater();
            
            try {
                doc.loadZip(zip);
            } catch (loadError) {
                console.error('JSZip load error:', loadError);
                throw new Error(`Failed to load template file: ${loadError.message}`);
            }
            
            // Prepare and set data
            const templateData = this.prepareTemplateData(formData);
            console.log('Setting template data...');
            doc.setData(templateData);
            
            // Render the document with detailed error handling
            console.log('Rendering document...');
            try {
                doc.render();
                console.log('Document rendered successfully');
            } catch (renderError) {
                console.error('Render error details:', renderError);
                console.error('Error properties:', renderError.properties);
                
                // Try to get more context about the error
                if (renderError.properties && renderError.properties.errors) {
                    renderError.properties.errors.forEach((error, index) => {
                        console.error(`Error ${index + 1}:`, error);
                    });
                }
                
                throw new Error(`Template rendering failed: ${renderError.message}`);
            }
            
            // Generate output
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
    
    async preprocessTemplate(arrayBuffer) {
        try {
            const uint8Array = new Uint8Array(arrayBuffer);
            const zip = new JSZip(uint8Array);
            
            const documentXml = zip.file('word/document.xml').asText();
            
            console.log('Processing complex Word document...');
            
            // Fix for complex Word documents: ensure placeholders are in single text nodes
            let cleanedXml = documentXml;
            
            // Strategy: Find all placeholders and ensure they're not broken by XML tags
            const placeholderRegex = /\{\{([^}]+)\}\}/g;
            let match;
            const placeholders = [];
            
            while ((match = placeholderRegex.exec(documentXml)) !== null) {
                placeholders.push({
                    full: match[0],
                    name: match[1],
                    index: match.index
                });
            }
            
            console.log('Found placeholders:', placeholders);
            
            // Fix common Word document issues
            // 1. Ensure placeholders are within single <w:t> elements
            cleanedXml = cleanedXml.replace(/<w:t[^>]*>([^<]*)<\/w:t>/g, (match, text) => {
                // If this text node contains part of a placeholder, ensure it's complete
                if (text.includes('{{') || text.includes('}}')) {
                    // Remove any XML tags inside the placeholder
                    const fixedText = text.replace(/<[^>]*>/g, '');
                    return match.replace(text, fixedText);
                }
                return match;
            });
            
            // 2. Fix placeholders that span multiple text runs
            cleanedXml = cleanedXml.replace(/(<w:t[^>]*>[^<]*)\{\{([^<]*)<\/w:t><w:t[^>]*>([^<]*)\}\}([^<]*<\/w:t>)/g, 
                (match, before, part1, part2, after) => {
                    const fixed = `${before}{{${part1}${part2}}}${after}`;
                    console.log('Fixed spanning placeholder:', match, '→', fixed);
                    return fixed;
                }
            );
            
            // 3. Remove any formatting inside placeholders
            cleanedXml = cleanedXml.replace(/\{\{([^}<]*)<[^>]*>([^>]*)\}\}/g, '{{$1$2}}');
            
            // 4. Fix specific broken placeholder patterns
            const brokenPlaceholders = [
                { broken: /\{\{GSTI\s*N\}\}/g, fixed: '{{GSTIN}}' },
                { broken: /\{\{BANK\s*NAME\}\}/g, fixed: '{{BANK_NAME}}' },
                { broken: /\{\{BANK\s*ADDRESS\s*LINE1\}\}/g, fixed: '{{BANK_ADDRESS_LINE1}}' },
                { broken: /\{\{BANK\s*ADDRESS\s*LINE2\}\}/g, fixed: '{{BANK_ADDRESS_LINE2}}' },
                { broken: /\{\{TRADE\s*NAME\}\}/g, fixed: '{{TRADE_NAME}}' },
                { broken: /\{\{LEGAL\s*NAME\}\}/g, fixed: '{{LEGAL_NAME}}' },
                { broken: /\{\{TAXPAYER\s*ADDRESS\s*LINE1\}\}/g, fixed: '{{TAXPAYER_ADDRESS_LINE1}}' },
                { broken: /\{\{TAXPAYER\s*ADDRESS\s*LINE2\}\}/g, fixed: '{{TAXPAYER_ADDRESS_LINE2}}' },
                { broken: /\{\{ACCOUNT\s*NO\}\}/g, fixed: '{{ACCOUNT_NO}}' },
                { broken: /\{\{PAN\s*NO\}\}/g, fixed: '{{PAN_NO}}' },
                { broken: /\{\{OIO\s*NO\}\}/g, fixed: '{{OIO_NO}}' },
                { broken: /\{\{OIO\s*DATE\}\}/g, fixed: '{{OIO_DATE}}' }
            ];
            
            brokenPlaceholders.forEach(fix => {
                if (cleanedXml.match(fix.broken)) {
                    console.log(`Found and fixing: ${fix.broken}`);
                    cleanedXml = cleanedXml.replace(fix.broken, fix.fixed);
                }
            });
            
            console.log('XML preprocessing completed');
            
            // Update the zip with cleaned content
            zip.file('word/document.xml', cleanedXml);
            
            const processedUint8Array = zip.generate({ type: 'uint8array' });
            return processedUint8Array.buffer;
            
        } catch (error) {
            console.warn('Template preprocessing failed, using original template:', error);
            return arrayBuffer; // Return original if preprocessing fails
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
    
    // Fallback method for creating minimal templates
    async createMinimalTemplate(formData) {
        const zip = new JSZip();
        
        // Minimal valid DOCX structure
        const content = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>BY Hand Delivery</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>F.No. ARR/GST/190/2025-CGST-RANGE-NVSR-DIV-NVSR-COMMRTE-SURAT</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Date:11.06.24</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>FORM GST DRC-13</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>To: {{BANK_NAME}}, {{BANK_ADDRESS_LINE1}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>GSTIN: {{GSTIN}}, Trade Name: {{TRADE_NAME}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Tax: {{TAX}}, Penalty: {{PENALTY}}, Interest: {{INTEREST}}, Total: {{TOTAL}}</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;
        
        // Required DOCX files
        zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
        
        zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
        
        zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`);
        
        zip.file("word/document.xml", content);
        
        return zip.generate({type: "arraybuffer"});
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TemplateEngine;
}
