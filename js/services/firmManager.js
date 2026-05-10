/* ============================================
   FirmManager — Multi-Firm Logic for Khatashop
   ============================================ */
const FirmManager = (() => {

    const FIRM_COLORS = [
        { bg: '#d4af37', text: '#1a1a2e', label: 'gold' },
        { bg: '#6366f1', text: '#ffffff', label: 'indigo' },
        { bg: '#10b981', text: '#ffffff', label: 'emerald' },
        { bg: '#f59e0b', text: '#1a1a2e', label: 'amber' },
        { bg: '#ef4444', text: '#ffffff', label: 'red' },
        { bg: '#8b5cf6', text: '#ffffff', label: 'violet' },
        { bg: '#06b6d4', text: '#ffffff', label: 'cyan' },
        { bg: '#f97316', text: '#ffffff', label: 'orange' }
    ];

    /**
     * Seeds the default "Main Branch" on first run.
     * Idempotent.
     */
    function seedDefaultFirm() {
        try {
            const firms = DB.getFirms();
            if (firms.length > 0) return; // already seeded

            const shop = DB.getShop();
            const mainName = (shop.name && shop.name.trim()) ? shop.name.trim() : 'Main Branch';

            const mainFirm = {
                id: 'firm_' + Date.now(),
                name: mainName,
                isMain: true,
                colorIndex: 0,
                tagline: shop.tagline || '',
                phone: shop.phone || '',
                address: shop.address || '',
                createdAt: new Date().toISOString()
            };
            
            DB.addFirm(mainFirm);

            // Migrate all existing loans & customers to main firm
            const entries = DB.getEntries();
            entries.forEach(e => {
                if (!e.firmId) {
                    e.firmId = mainFirm.id;
                    DB.updateEntry(e);
                }
            });

            const customers = DB.getCustomers();
            customers.forEach(c => {
                if (!c.firmId) {
                    c.firmId = mainFirm.id;
                    DB.updateCustomer(c);
                }
            });
        } catch (e) {
            console.warn('[FirmManager] seedDefaultFirm error:', e);
        }
    }

    function getAll() {
        return DB.getFirms() || [];
    }

    function getById(firmId) {
        if (!firmId) return null;
        return getAll().find(f => f.id === firmId) || null;
    }

    function getMainFirm() {
        return getAll().find(f => f.isMain) || null;
    }

    function getSelected() {
        const firmId = DB.getActiveFirm();
        if (!firmId) return null;
        const firm = getById(firmId);
        if (!firm) {
            DB.setActiveFirm(null);
            return null;
        }
        return firm;
    }
    
    function getActiveFirmId() {
        const firm = getSelected();
        return firm ? firm.id : null;
    }

    function filterEntries(entries) {
        try {
            const firmId = DB.getActiveFirm();
            if (!firmId) return entries || [];
            const mainFirm = getMainFirm();
            return (entries || []).filter(e => {
                const eFirmId = e?.firmId;
                if (!eFirmId && mainFirm) return mainFirm.id === firmId;
                return eFirmId === firmId;
            });
        } catch (e) {
            return entries || [];
        }
    }

    function filterCustomers(customers) {
        try {
            const firmId = DB.getActiveFirm();
            if (!firmId) return customers || [];
            const mainFirm = getMainFirm();
            return (customers || []).filter(c => {
                const cFirmId = c?.firmId;
                if (!cFirmId && mainFirm) return mainFirm.id === firmId;
                return cFirmId === firmId;
            });
        } catch (e) {
            return customers || [];
        }
    }

    function getColor(firm) {
        if (!firm) return FIRM_COLORS[0];
        const idx = (firm.colorIndex || 0) % FIRM_COLORS.length;
        return FIRM_COLORS[idx];
    }

    function buildSelectOptions(selectedFirmId) {
        const firms = getAll();
        let html = `<option value="">🌐 All Firms</option>`;
        firms.forEach(f => {
            const sel = f.id === selectedFirmId ? 'selected' : '';
            html += `<option value="${f.id}" ${sel}>${f.name}${f.isMain ? ' (Main)' : ''}</option>`;
        });
        return html;
    }

    function getDefaultFirmId() {
        const firmId = DB.getActiveFirm();
        if (firmId) return firmId;
        const main = getMainFirm();
        return main ? main.id : null;
    }

    return {
        seedDefaultFirm,
        getAll, getById, getMainFirm, getSelected, getActiveFirmId,
        filterEntries, filterCustomers,
        getColor, buildSelectOptions,
        getDefaultFirmId,
        FIRM_COLORS
    };
})();
