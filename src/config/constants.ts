export const COMPANY_DETAILS = {
  name: 'KALYANI ENTERPRISES',
  addressLine1: 'D NO 843/1 WARD NO 03.,',
  addressLine2: 'BALLARI, KARNATAKA - 583101',
  phone: '9980723548',
  gstin: '29EMLPM3821E1ZW',
  fssai: '20250930107794088',
  placeOfSupply: 'KARNATAKA',
  stateCode: '29',
  jurisdiction: 'BALLARI',
  terms: [
    '(1) Check out the Goods.',
    '(2) Tax payable on RCM basis : NO.',
    '(3) Subject to BALLARI city Jurisdiction.',
  ],
  bankDetails: {
    bankName: 'SBI',
    accountNo: '44483491251',
    ifscCode: 'SBIN0000817',
  },
  defaultGstRate: 5.0, // Fixed 5% GST across items
};

export const DEFAULT_USERS = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    phone: '9900426623',
    password: 'kalyani1975',
    full_name: 'Kalyani Enterprises Owner',
    role: 'owner' as const,
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    phone: '9980989148',
    password: 'exec123',
    full_name: 'Bharath Kumar',
    role: 'executive' as const,
  },
];
