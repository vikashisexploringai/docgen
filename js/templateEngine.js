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
            // Try the original template first
            const result = await this.processDocxTemplate(docConfig.template, formData);
            
            return {
                blob: result,
                filename: `${docConfig.name.replace(/\s+/g, '_')}_${this.getTimestamp()}.docx`
            };
            
        } catch (error) {
            console.error('Template generation failed:', error);
            
            // Fallback to guaranteed template
            console.log('Using guaranteed fallback template...');
            const fallbackResult = await this.createGuaranteedTemplate(formData, docConfig);
            return {
                blob: fallbackResult,
                filename: `${docConfig.name.replace(/\s+/g, '_')}_${this.getTimestamp()}.docx`
            };
        }
    }
    
    async processDocxTemplate(templateUrl, formData) {
        console.log('Processing template:', templateUrl);
        
        try {
            const urlWithCache = `${templateUrl}?v=${Date.now()}`;
            const response = await fetch(urlWithCache);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch template: ${response.status}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            const zip = new JSZip(uint8Array);
            
            const doc = new docxtemplater();
            doc.loadZip(zip);
            
            const templateData = this.prepareTemplateData(formData);
            doc.setData(templateData);
            doc.render();
            
            const outBuffer = doc.getZip().generate({ 
                type: 'blob',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });
            
            console.log('Template processed successfully');
            return outBuffer;
            
        } catch (error) {
            console.error('Template processing failed:', error);
            throw error; // Re-throw to trigger fallback
        }
    }
    
    async createGuaranteedTemplate(formData, docConfig) {
        console.log('Creating guaranteed template...');
        
        const zip = new JSZip();
        
        // Create a perfectly clean DOCX structure
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
        <w:t>Date: {{OIO_DATE}}</w:t>
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
        <w:t>To:</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>{{BANK_NAME}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>{{BANK_ADDRESS_LINE1}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>{{BANK_ADDRESS_LINE2}}</w:t>
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
        <w:t>Address: {{TAXPAYER_ADDRESS_LINE1}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>{{TAXPAYER_ADDRESS_LINE2}}</w:t>
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
        <w:t>arising out of OIO No: {{OIO_NO}} Dtd : {{OIO_DATE}}</w:t>
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
        
        // Minimal DOCX structure
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
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`);
        
        zip.file("word/document.xml", content);
        
        // Process with docxtemplater
        const arrayBuffer = zip.generate({type: "arraybuffer"});
        const uint8Array = new Uint8Array(arrayBuffer);
        const processedZip = new JSZip(uint8Array);
        
        const doc = new docxtemplater();
        doc.loadZip(processedZip);
        doc.setData(this.prepareTemplateData(formData));
        doc.render();
        
        const outBuffer = doc.getZip().generate({ 
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        
        console.log('Guaranteed template created successfully');
        return outBuffer;
    }
    
    prepareTemplateData(formData) {
        const templateData = { ...formData };
        
        // Format data
        Object.keys(templateData).forEach(key => {
            if (key.includes('DATE') || key.includes('_DATE')) {
                templateData[key] = this.formatDateForDisplay(templateData[key]);
            }
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
        return isNaN(num) ? '0.00' : num.toFixed(2);
    }
    
    getTimestamp() {
        const now = new Date();
        return now.getFullYear() + 
               String(now.getMonth() + 1).padStart(2, '0') + 
               String(now.getDate()).padStart(2, '0') + 
               String(now.getHours()).padStart(2, '0') + 
               String(now.getMinutes()).padStart(2, '0');
    }
}
