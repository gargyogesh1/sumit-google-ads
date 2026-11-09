/**
 * ============================================================================
 * SKYLO by Central Park - Lead Form Handler & Validation Module
 * ============================================================================
 * Handles input validation (including Indian mobile validation), spam protection,
 * duplicate submission blocking, campaign attribution enrichment, and FormSubmit backend API.
 * ============================================================================
 */

(function (window, document) {
    'use strict';

    // Store recent submissions to prevent duplicate spam within session
    const recentSubmissions = new Set();

    /**
     * Clean Indian phone number input:
     * - Strips spaces, hyphens, and leading +91 or 0
     * - Checks if the resulting number is 10 digits starting with 6, 7, 8, or 9
     */
    function cleanIndianPhone(phoneStr) {
        if (!phoneStr) return '';
        let cleaned = phoneStr.replace(/[\s\-\(\)]/g, '');
        if (cleaned.startsWith('+91')) cleaned = cleaned.substring(3);
        else if (cleaned.startsWith('91') && cleaned.length === 12) cleaned = cleaned.substring(2);
        else if (cleaned.startsWith('0') && cleaned.length === 11) cleaned = cleaned.substring(1);
        return cleaned;
    }

    function isValidIndianPhone(cleanedPhone) {
        return /^[6-9]\d{9}$/.test(cleanedPhone);
    }

    /**
     * Display floating Toast Notification
     */
    function showNotification(message, type) {
        let toast = document.getElementById('skyloNotificationToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'skyloNotificationToast';
            document.body.appendChild(toast);
        }

        const isSuccess = type === 'success';
        toast.className = 'skylo-toast ' + (isSuccess ? 'skylo-toast-success' : 'skylo-toast-error') + ' skylo-toast-visible';
        toast.innerHTML = `
            <div class="skylo-toast-icon">
                ${isSuccess ? '✓' : '⚠'}
            </div>
            <div class="skylo-toast-body">
                <strong>${isSuccess ? 'Enquiry Received' : 'Submission Notice'}</strong>
                <span>${message}</span>
            </div>
            <button type="button" class="skylo-toast-close" onclick="this.parentElement.classList.remove('skylo-toast-visible')">&times;</button>
        `;

        setTimeout(() => {
            toast.classList.remove('skylo-toast-visible');
        }, 6000);
    }

    /**
     * Master Form Submission Handler
     */
    window.submitSkyloForm = function (event, enquiryType) {
        event.preventDefault();
        const form = event.target;
        const submitBtn = form.querySelector('[type="submit"]') || form.querySelector('button.submit_btn');

        // Honeypot spam check: If honeypot is filled, silent discard
        const honeypot = form.querySelector('input[name="_honey"]');
        if (honeypot && honeypot.value.trim() !== '') {
            console.warn('Spam detected via honeypot.');
            return false;
        }

        // Field extraction
        const nameInput = form.querySelector('input[name="name"]');
        const phoneInput = form.querySelector('input[name="phone"]');
        const emailInput = form.querySelector('input[name="email"]');
        const unitInput = form.querySelector('select[name="unit_preference"]') || form.querySelector('input[name="unit"]');

        const rawName = nameInput ? nameInput.value.trim() : '';
        const rawPhone = phoneInput ? phoneInput.value.trim() : '';
        const rawEmail = emailInput ? emailInput.value.trim() : '';
        const rawUnit = unitInput ? unitInput.value.trim() : '';

        // Name Validation
        if (!rawName || rawName.length < 2) {
            showNotification('Please enter your full name (minimum 2 characters).', 'error');
            if (nameInput) nameInput.focus();
            return false;
        }

        // Indian Mobile Number Validation
        const cleanedPhone = cleanIndianPhone(rawPhone);
        if (!isValidIndianPhone(cleanedPhone)) {
            showNotification('Please enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).', 'error');
            if (phoneInput) {
                phoneInput.focus();
                phoneInput.classList.add('is-invalid');
            }
            return false;
        }
        if (phoneInput) phoneInput.classList.remove('is-invalid');

        // Duplicate Submission Check
        const submissionKey = cleanedPhone + '_' + (enquiryType || 'general');
        if (recentSubmissions.has(submissionKey)) {
            showNotification('You have already submitted an enquiry recently. Our property team will contact you shortly.', 'success');
            return false;
        }

        // Loading State: Disable button & show spinner
        const originalBtnHtml = submitBtn ? (submitBtn.tagName === 'INPUT' ? submitBtn.value : submitBtn.innerHTML) : 'Submit';
        if (submitBtn) {
            submitBtn.disabled = true;
            if (submitBtn.tagName === 'INPUT') {
                submitBtn.value = 'Submitting Enquiry…';
            } else {
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Submitting…';
            }
        }

        // Gather attribution from SkyloTracking or URL
        const attribution = (window.SkyloTracking && window.SkyloTracking.attribution) ?
            window.SkyloTracking.attribution : {};

        // Prepare FormSubmit payload
        const payload = {
            name: rawName,
            phone: cleanedPhone,
            email: rawEmail || 'Not Provided',
            unit_preference: rawUnit || 'Not Specified',
            project_name: 'SKYLO by Central Park',
            enquiry_type: enquiryType || form.getAttribute('data-enquiry-type') || 'Google Ads Enquiry',
            utm_source: attribution.utm_source || '',
            utm_medium: attribution.utm_medium || '',
            utm_campaign: attribution.utm_campaign || '',
            utm_term: attribution.utm_term || '',
            utm_content: attribution.utm_content || '',
            gclid: attribution.gclid || '',
            gbraid: attribution.gbraid || '',
            wbraid: attribution.wbraid || '',
            landing_page: window.location.href,
            submission_time: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            _subject: 'New Lead: SKYLO by Central Park (' + (enquiryType || 'Lead Form') + ') - ' + cleanedPhone,
            _cc: 'gargy5703@gmail.com',
            _captcha: 'false',
            _template: 'table'
        };

        // Submit to FormSubmit.co backend endpoint
        fetch('https://formsubmit.co/ajax/Sumitrohilla375@gmail.com', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(function (response) {
            if (!response.ok) {
                throw new Error('Server responded with HTTP ' + response.status);
            }
            return response.json();
        })
        .then(function (result) {
            // Check for FormSubmit success flag
            if (result && (result.success === 'true' || result.success === true || result.message)) {
                // Mark submission to prevent duplicate
                recentSubmissions.add(submissionKey);

                // Reset form
                form.reset();

                // Close any open Bootstrap modal
                const modalEl = form.closest('.modal');
                if (modalEl && window.bootstrap && window.bootstrap.Modal) {
                    const bsModal = window.bootstrap.Modal.getInstance(modalEl);
                    if (bsModal) bsModal.hide();
                }

                // Fire Tracking Conversion Events
                if (window.SkyloTracking) {
                    const eventType = enquiryType || form.getAttribute('data-enquiry-type') || '';
                    if (eventType.toLowerCase().includes('site_visit') || eventType.toLowerCase().includes('visit')) {
                        window.SkyloTracking.trackSiteVisitRequest({ form_id: form.id, phone: cleanedPhone });
                    } else if (eventType.toLowerCase().includes('price')) {
                        window.SkyloTracking.trackPriceEnquiry({ form_id: form.id, unit: rawUnit });
                    } else if (eventType.toLowerCase().includes('brochure')) {
                        window.SkyloTracking.trackBrochureDownload('SKYLO_Central_Park_Brochure');
                        window.SkyloTracking.trackLeadGenerated({ enquiry_type: 'brochure_enquiry', form_id: form.id });
                    } else {
                        window.SkyloTracking.trackLeadGenerated({ enquiry_type: eventType || 'general_lead', form_id: form.id });
                    }
                }

                // Display required exact message
                const successMsg = 'Thank you for your interest in SKYLO by Central Park. Our property advisory team will contact you shortly.';
                showNotification(successMsg, 'success');

                // Redirect to thanku page after 2 seconds
                setTimeout(function () {
                    const isSubDir = window.location.pathname.indexOf('central-park-gurugram') !== -1;
                    const thankuUrl = isSubDir ? '../thanku/index.html' : 'thanku/index.html';
                    window.location.href = thankuUrl;
                }, 2000);
            } else {
                throw new Error('Backend failed to confirm submission');
            }
        })
        .catch(function (error) {
            console.error('Lead form submission error:', error);
            // DO NOT show success if submission fails!
            showNotification('We could not submit your enquiry at this moment. Please call our team directly at +91 9971463242 or try again.', 'error');
        })
        .finally(function () {
            // Re-enable button
            if (submitBtn) {
                submitBtn.disabled = false;
                if (submitBtn.tagName === 'INPUT') {
                    submitBtn.value = originalBtnHtml;
                } else {
                    submitBtn.innerHTML = originalBtnHtml;
                }
            }
        });

        return false;
    };

    // Backward compatibility wrapper for existing forms with onsubmit="submitForm(event)"
    window.submitForm = function (event) {
        return window.submitSkyloForm(event, 'General Enquiry');
    };

})(window, document);
