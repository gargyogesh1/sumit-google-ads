/**
 * ============================================================================
 * SKYLO by Central Park - Analytics & Conversion Tracking Module
 * ============================================================================
 * Handles Google Analytics 4 (GA4), Google Tag Manager (GTM), Google Ads
 * conversion tracking, campaign attribution (UTMs & Click IDs), and conversion events.
 *
 * NOTE FOR MARKETING / AD OPS TEAM:
 * Replace CONFIGURE_LATER placeholders with actual production IDs when ready.
 * Existing Google Ads tag AW-18353196610 and conversion label IKNoCMzat9gcEMKcvq9E
 * have been preserved and mapped to the conversion triggers.
 * ============================================================================
 */

(function (window, document) {
    'use strict';

    // ── 1. Configuration Placeholders ─────────────────────────────────────────
    const TRACKING_CONFIG = {
        ga4MeasurementId: 'CONFIGURE_LATER',       // e.g. 'G-XXXXXXXXXX'
        gtmContainerId: 'CONFIGURE_LATER',         // e.g. 'GTM-XXXXXXX'
        gadsConversionId: 'AW-18353196610',        // Existing configured Ads Account ID
        gadsConversionLabel: 'IKNoCMzat9gcEMKcvq9E', // Existing conversion label
        projectName: 'SKYLO by Central Park'
    };

    // Ensure dataLayer exists
    window.dataLayer = window.dataLayer || [];

    // Helper: Push to Google Tag / GA4 safely
    function gtagPush() {
        if (typeof window.gtag === 'function') {
            window.gtag.apply(null, arguments);
        } else {
            window.dataLayer.push(arguments);
        }
    }

    // Initialize GA4 if ID is configured
    if (TRACKING_CONFIG.ga4MeasurementId && TRACKING_CONFIG.ga4MeasurementId !== 'CONFIGURE_LATER') {
        gtagPush('config', TRACKING_CONFIG.ga4MeasurementId, {
            send_page_view: true
        });
    }

    // ── 2. Campaign & Click Attribution Capture ──────────────────────────────
    // Captures utm_source, utm_medium, utm_campaign, utm_term, utm_content, gclid, gbraid, wbraid
    const ATTRIBUTION_KEYS = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'gclid',
        'gbraid',
        'wbraid'
    ];

    function captureAttribution() {
        const attribution = {};
        const urlParams = new URLSearchParams(window.location.search);

        ATTRIBUTION_KEYS.forEach(key => {
            const val = urlParams.get(key);
            if (val) {
                attribution[key] = val.trim();
                try {
                    sessionStorage.setItem('skylo_' + key, val.trim());
                } catch (e) {
                    /* storage disabled / private mode */
                }
            } else {
                try {
                    const stored = sessionStorage.getItem('skylo_' + key);
                    if (stored) attribution[key] = stored;
                } catch (e) {}
            }
        });

        // Add referrer and landing page context
        attribution['landing_page'] = window.location.href.split('?')[0];
        attribution['referrer'] = document.referrer || 'direct';
        return attribution;
    }

    const currentAttribution = captureAttribution();

    // ── 3. Core Event Tracking Wrapper ───────────────────────────────────────
    function sendTrackingEvent(eventName, eventParams) {
        const payload = Object.assign({
            project: TRACKING_CONFIG.projectName,
            utm_source: currentAttribution.utm_source || '',
            utm_medium: currentAttribution.utm_medium || '',
            utm_campaign: currentAttribution.utm_campaign || '',
            timestamp: new Date().toISOString()
        }, eventParams || {});

        // 1. GA4 / gtag event
        gtagPush('event', eventName, payload);

        // 2. GTM dataLayer event
        window.dataLayer.push({
            event: eventName,
            conversion_data: payload
        });
    }

    // Helper: Trigger Google Ads conversion safely
    function triggerGoogleAdsConversion(customLabel) {
        const label = customLabel || TRACKING_CONFIG.gadsConversionLabel;
        const convId = TRACKING_CONFIG.gadsConversionId;

        if (convId && label && convId !== 'CONFIGURE_LATER' && label !== 'CONFIGURE_LATER') {
            const sendTo = convId + '/' + label;
            gtagPush('event', 'conversion', {
                send_to: sendTo,
                value: 1.0,
                currency: 'INR'
            });
        }
    }

    // ── 4. Dedicated Conversion Event Functions ──────────────────────────────

    /**
     * 1. generate_lead: Trigger ONLY after backend confirms successful enquiry
     */
    function trackLeadGenerated(details) {
        sendTrackingEvent('generate_lead', {
            lead_type: details && details.enquiry_type ? details.enquiry_type : 'general_enquiry',
            form_id: details && details.form_id ? details.form_id : 'enquiry_form'
        });
        triggerGoogleAdsConversion();
    }

    /**
     * 2. click_to_call: Trigger when visitor clicks phone links
     */
    function trackClickToCall(phoneNumber, placement) {
        sendTrackingEvent('click_to_call', {
            phone_number: phoneNumber || '+919971463242',
            placement: placement || 'header_or_mobile_bar'
        });
    }

    /**
     * 3. whatsapp_click: Trigger when visitor clicks WhatsApp chat link
     */
    function trackWhatsAppClick(placement) {
        sendTrackingEvent('whatsapp_click', {
            placement: placement || 'mobile_sticky_or_floating'
        });
    }

    /**
     * 4. site_visit_request: Trigger ONLY after successful site visit form submission
     */
    function trackSiteVisitRequest(details) {
        sendTrackingEvent('site_visit_request', {
            visit_type: 'free_site_visit',
            project: TRACKING_CONFIG.projectName
        });
        // Also trigger master lead event & ads conversion
        trackLeadGenerated(Object.assign({ enquiry_type: 'site_visit' }, details || {}));
    }

    /**
     * 5. brochure_download: Trigger only when genuine brochure is downloaded
     */
    function trackBrochureDownload(brochureTitle) {
        sendTrackingEvent('brochure_download', {
            brochure_name: brochureTitle || 'SKYLO_Central_Park_Brochure'
        });
    }

    /**
     * 6. price_enquiry: Trigger when visitor submits price-related enquiry
     */
    function trackPriceEnquiry(details) {
        sendTrackingEvent('price_enquiry', {
            enquiry_type: 'price_request',
            unit_type: details && details.unit ? details.unit : 'all_typologies'
        });
        // Also count as lead generated
        trackLeadGenerated(Object.assign({ enquiry_type: 'price_enquiry' }, details || {}));
    }

    // ── 5. Auto-bind Telephone and WhatsApp Click Listeners ───────────────────
    document.addEventListener('DOMContentLoaded', function () {
        // Phone links
        document.querySelectorAll('a[href^="tel:"]').forEach(function (el) {
            el.addEventListener('click', function () {
                const phone = this.getAttribute('href').replace('tel:', '').trim();
                const placement = this.closest('.mobile-section') ? 'mobile_sticky_bar' :
                                  this.closest('.header-section') ? 'header_navbar' : 'page_body';
                trackClickToCall(phone, placement);
            });
        });

        // WhatsApp links
        document.querySelectorAll('a[href*="whatsapp.com"], a[href*="wa.me"]').forEach(function (el) {
            el.addEventListener('click', function () {
                const placement = this.closest('.mobile-section') ? 'mobile_sticky_bar' :
                                  this.classList.contains('floating-whatsapp') ? 'floating_button' : 'page_body';
                trackWhatsAppClick(placement);
            });
        });
    });

    // ── 6. Public API Export ──────────────────────────────────────────────────
    window.SkyloTracking = {
        config: TRACKING_CONFIG,
        attribution: currentAttribution,
        trackLeadGenerated: trackLeadGenerated,
        trackClickToCall: trackClickToCall,
        trackWhatsAppClick: trackWhatsAppClick,
        trackSiteVisitRequest: trackSiteVisitRequest,
        trackBrochureDownload: trackBrochureDownload,
        trackPriceEnquiry: trackPriceEnquiry,
        sendTrackingEvent: sendTrackingEvent
    };

})(window, document);
