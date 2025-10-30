// Form Builder Module - Dynamically creates forms based on document configuration

class FormBuilder {
    constructor() {
        this.currentDocument = null;
    }
    
    renderForm(docKey) {
        const docConfig = documentRegistry[docKey];
        if (!docConfig) {
            throw new Error(`Document configuration not found for: ${docKey}`);
        }
        
        this.currentDocument = docKey;
        
        let html = `
            <div class="form-section">
                <h2>${docConfig.name}</h2>
                <p>${docConfig.description}</p>
            </div>
        `;
        
        // Group fields by their groups
        const groupedFields = this.groupFields(docConfig);
        
        // Sort groups by order and render each group
        const sortedGroups = this.getSortedGroups(docConfig, groupedFields);
        
        sortedGroups.forEach(groupKey => {
            html += this.renderFieldGroup(groupKey, docConfig, groupedFields[groupKey]);
        });
        
        return html;
    }
    
    groupFields(docConfig) {
        const groupedFields = {};
        
        Object.keys(docConfig.fields).forEach(fieldKey => {
            const field = docConfig.fields[fieldKey];
            const group = field.group || 'general';
            
            if (!groupedFields[group]) {
                groupedFields[group] = [];
            }
            
            groupedFields[group].push({ key: fieldKey, ...field });
        });
        
        return groupedFields;
    }
    
    getSortedGroups(docConfig, groupedFields) {
        return Object.keys(groupedFields).sort((a, b) => {
            const orderA = docConfig.fieldGroups?.[a]?.order || 999;
            const orderB = docConfig.fieldGroups?.[b]?.order || 999;
            return orderA - orderB;
        });
    }
    
    renderFieldGroup(groupKey, docConfig, fields) {
        const groupName = docConfig.fieldGroups?.[groupKey]?.name || 'Details';
        
        let html = `
            <div class="form-section">
                <h2>${groupName}</h2>
                <div class="field-group">
        `;
        
        fields.forEach(field => {
            html += this.renderField(field);
        });
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    }
    
    renderField(field) {
        const requiredAttr = field.required ? 'required' : '';
        const patternAttr = field.pattern ? `pattern="${field.pattern}"` : '';
        const placeholderAttr = field.placeholder ? `placeholder="${field.placeholder}"` : '';
        const minAttr = field.min !== undefined ? `min="${field.min}"` : '';
        
        return `
            <div class="form-group ${field.fullWidth ? 'full-width' : ''}">
                <label for="${field.key}">
                    ${field.label} 
                    ${field.required ? '<span style="color:red">*</span>' : ''}
                </label>
                <input type="${field.type}" 
                       id="${field.key}" 
                       name="${field.key}"
                       ${requiredAttr}
                       ${patternAttr}
                       ${placeholderAttr}
                       ${minAttr}>
            </div>
        `;
    }
    
    collectFormData() {
        const docConfig = documentRegistry[this.currentDocument];
        const formData = {};
        
        Object.keys(docConfig.fields).forEach(fieldKey => {
            const element = document.getElementById(fieldKey);
            if (element) {
                formData[fieldKey] = element.value;
            }
        });
        
        return formData;
    }
    
    validateForm(formData) {
        const docConfig = documentRegistry[this.currentDocument];
        
        for (const [fieldKey, field] of Object.entries(docConfig.fields)) {
            if (field.required && (!formData[fieldKey] || formData[fieldKey].trim() === '')) {
                this.showFieldError(fieldKey, `Please fill in the required field: ${field.label}`);
                return false;
            }
            
            if (field.pattern && formData[fieldKey]) {
                const regex = new RegExp(field.pattern);
                if (!regex.test(formData[fieldKey])) {
                    this.showFieldError(fieldKey, `Please enter a valid ${field.label}`);
                    return false;
                }
            }
        }
        
        return true;
    }
    
    showFieldError(fieldKey, message) {
        const element = document.getElementById(fieldKey);
        element.focus();
        element.style.borderColor = 'red';
        
        // Remove existing error message
        const existingError = element.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Add error message
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.style.color = 'red';
        errorElement.style.fontSize = '12px';
        errorElement.style.marginTop = '5px';
        errorElement.textContent = message;
        
        element.parentNode.appendChild(errorElement);
    }
    
    clearFieldErrors() {
        document.querySelectorAll('.field-error').forEach(error => error.remove());
        document.querySelectorAll('input').forEach(input => {
            input.style.borderColor = '';
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormBuilder;
}
