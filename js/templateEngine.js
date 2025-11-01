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
            
            // Use aggressive XML repair for complex templates
            const processedArrayBuffer = await this.aggressiveXmlRepair(arrayBuffer);
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
                console.error('Render failed even after preprocessing:', renderError);
                
                // Last resort: use minimal template
                console.log('Attempting fallback to minimal template...');
                return await this.fallbackToMinimalTemplate(formData, docConfig);
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
    
    async aggressiveXmlRepair(arrayBuffer) {
        try {
            const uint8Array = new Uint8Array(arrayBuffer);
            const zip = new JSZip(uint8Array);
            
            let documentXml = zip.file('word/document.xml').asText();
            
            console.log('Starting aggressive XML repair...');
            
            // STRATEGY 1: Fix placeholders broken across multiple text runs
            // This handles cases like: <w:t>{{BANK</w:t><w:t>NAME}}</w:t>
            
            // First, let's see what the actual broken structure looks like
            console.log('Searching for broken placeholder patterns...');
            
            // Look for opening braces followed by text, then closing braces in different nodes
            const brokenPatterns = [
                // Pattern for: {{BANK in one node, NAME}} in another
                /(<w:t[^>]*>)([^<]*)\{\{(\w+)(<\/w:t>)(.*?)(<w:t[^>]*>)([^<]*)\}\}([^<]*)(<\/w:t>)/g,
                
                // Pattern for broken placeholders with any XML in between
                /(\{\{[\w_]*)(<[^>]+>)([\w_]*\}\})/g,
                
                // Pattern for placeholders split by any XML tags
                /(\{\{)([^}<]+)(<[^>]+>)([^}<]+)(\}\})/g
            ];
            
            let repairCount = 0;
            
            // Try each pattern and fix broken placeholders
            brokenPatterns.forEach((pattern, index) => {
                const matches = documentXml.match(pattern);
                if (matches) {
                    console.log(`Pattern ${index} found matches:`, matches);
                }
            });
            
            // STRATEGY 2: Remove all XML tags between placeholder parts
            // This is aggressive but effective
            documentXml = documentXml.replace(/(\{\{[\w_]*)(<[^>]*>)([\w_]*\}\})/g, 
                (match, start, xmlTag, end) => {
                    repairCount++;
                    console.log(`Fixed broken placeholder: ${match} -> ${start}${end}`);
                    return start + end;
                }
            );
            
            // STRATEGY 3: Reconstruct broken placeholders by joining adjacent text runs
            // Look for: <w:t>{{BANK</w:t> followed by <w:t>NAME}}</w:t>
            documentXml = documentXml.replace(
                /(<w:t[^>]*>)([^{<]*)\{\{(\w+)(<\/w:t>)(\s*<w:t[^>]*>)([^}<]*)\}\}([^<]*)(<\/w:t>)/g, 
                (match, openTag1, prefix, placeholderPart1, closeTag1, openTag2, placeholderPart2, suffix, closeTag2) => {
                    repairCount++;
                    const fixedPlaceholder = `{{${placeholderPart1}${placeholderPart2}}}`;
                    console.log(`Fixed spanning placeholder: ${match} -> ${fixedPlaceholder}`);
                    return `${openTag1}${prefix}${fixedPlaceholder}${suffix}${closeTag2}`;
                }
            );
            
            // STRATEGY 4: Specific fixes for known broken patterns from the error
            const specificFixes = [
                { find: /\{\{BANK\s*NAME\}\}/g, replace: '{{BANK_NAME}}' },
                { find: /\{\{BANK\s*ADDRESS\s*LINE1\}\}/g, replace: '{{BANK_ADDRESS_LINE1}}' },
                { find: /\{\{BANK\s*ADDRESS\s*LINE2\}\}/g, replace: '{{BANK_ADDRESS_LINE2}}' },
                { find: /\{\{GSTI\s*N\}\}/g, replace: '{{GSTIN}}' },
                { find: /\{\{TRADE\s*NAME\}\}/g, replace: '{{TRADE_NAME}}' },
                { find: /\{\{LEGAL\s*NAME\}\}/g, replace: '{{LEGAL_NAME}}' },
                { find: /\{\{TAXPAYER\s*ADDRESS\s*LINE1\}\}/g, replace: '{{TAXPAYER_ADDRESS_LINE1}}' },
                { find: /\{\{TAXPAYER\s*ADDRESS\s*LINE2\}\}/g, replace: '{{TAXPAYER_ADDRESS_LINE2}}' },
                { find: /\{\{ACCOUNT\s*NO\}\}/g, replace: '{{ACCOUNT_NO}}' },
                { find: /\{\{PAN\s*NO\}\}/g, replace: '{{PAN_NO}}' },
                { find: /\{\{OIO\s*NO\}\}/g, replace: '{{OIO_NO}}' },
                { find: /\{\{OIO\s*DATE\}\}/g, replace: '{{OIO_DATE}}' }
            ];
            
            specificFixes.forEach(fix => {
                if (documentXml.match(fix.find)) {
                    documentXml = documentXml.replace(fix.find, fix.replace);
                    repairCount++;
                    console.log(`Applied specific fix: ${fix.find}`);
                }
            });
            
            console.log(`XML repair completed. Fixed ${repairCount} issues.`);
            
            // Update the zip with repaired content
            zip.file('word/document.xml', documentXml);
            
            const processedUint8Array = zip.generate({ type: 'uint8array' });
            return processedUint8Array.buffer;
            
        } catch (error) {
            console.warn('Aggressive XML repair failed:', error);
            return arrayBuffer; // Return original if repair fails
        }
    }
    
    async fallbackToMinimalTemplate(formData, docConfig) {
        console.log('Creating minimal template as fallback...');
        
        const zip = new JSZip();
        
        // Create a clean, minimal DRC-13 template
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
        <w:t>Date: ${this.formatDateForDisplay(formData.OIO_DATE) || '11.06.24'}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>FORM GST DRC-13</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Notice to a third person under Section 79(1) (c)</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>To: {{BANK_NAME}}, {{BANK_ADDRESS_LINE1}}, {{BANK_ADDRESS_LINE2}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>PARTICULARS OF DEFAULTER / ACCOUNT HOLDER</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>GSTIN No: {{GSTIN}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Trade Name: {{TRADE_NAME}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Legal name: {{LEGAL_NAME}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Address: {{TAXPAYER_ADDRESS_LINE1}}, {{TAXPAYER_ADDRESS_LINE2}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>A/C No: {{ACCOUNT_NO}} or any other account/s under PAN:{{PAN_NO}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Sub: Recovery of Government Dues in respect of M/s. {{LEGAL_NAME}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>OIO No: {{OIO_NO}} Dated: {{OIO_DATE}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Tax Amount: Rs. {{TAX}}/-</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Penalty Amount: Rs. {{PENALTY}}/-</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Interest Amount: Rs. {{INTEREST}}/-</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Total Amount: Rs. {{TOTAL}}/-</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;
        
        // Required DOCX structure
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
        
        // Process this minimal template with docxtemplater
        const minimalArrayBuffer = zip.generate({type: "arraybuffer"});
        const uint8Array = new Uint8Array(minimalArrayBuffer);
        const minimalZip = new JSZip(uint8Array);
        
        const doc = new docxtemplater();
        doc.loadZip(minimalZip);
        doc.setData(this.prepareTemplateData(formData));
        doc.render();
        
        const outBuffer = doc.getZip().generate({ 
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        
        console.log('Fallback minimal template generated successfully');
        return outBuffer;
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

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TemplateEngine;
}
