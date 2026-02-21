const TARIFE = {
    ewb: {
        tarife: {
            ewb_basis: { name: 'ewb.basis.STROM', sp: 33.06, ev: 10.96, zt: 26.45, zm: 7.00 }
        }
    },
    bkw: {
        tarife: {
            bkw_grund: { name: 'BKW Grundversorgung', sp: 27.70, ev: 9.00, zt: 22.16, zm: 6.58 }
        }
    },
    ckw: {
        tarife: {
            ckw_haushalt: { name: 'CKW Haushalt', sp: 25.20, ev: 8.00, zt: 20.16, zm: 6.50 }
        }
    },
    iwb: {
        tarife: {
            iwb_basis: { name: 'IWB Basistarif', sp: 37.91, ev: 12.00, zt: 30.33, zm: 4.86 }
        }
    }
};

const OPERATOR_MAP = {
    'energie wasser bern': 'ewb',
    'bkw energie': 'bkw', 'bkw': 'bkw',
    'centralschweizerische kraftwerke': 'ckw', 'ckw ag': 'ckw',
    'industrielle werke basel': 'iwb', 'iwb': 'iwb'
};
