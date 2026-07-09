/**
 * User Normalizer
 * Migrated to features/auth/auth.normalizer.js
 */

const VALID_ROLES = ['FPO', 'Trader', 'Miller', 'Corporate'];

function runTests() {
  const testCases = [
    {
      label: 'Standard user object',
      input: {
        _id: 'user1',
        firstName: 'Ramesh',
        lastName: 'Patel',
        phone: '9876543210',
        role: 'FPO',
        shopName: 'Patel Agro',
        emailId: 'ramesh@example.com',
        state: 'Gujarat',
        isVerified: true,
        kycStatus: 'verified',
      },
      expect: {
        id: 'user1',
        firstName: 'Ramesh',
        lastName: 'Patel',
        phone: '9876543210',
        role: 'FPO',
        shopName: 'Patel Agro',
        emailId: 'ramesh@example.com',
        isVerified: true,
      },
    },
    {
      label: 'shopname (lowercase) remapped to shopName',
      input: {
        _id: 'user2',
        firstName: 'Suresh',
        phone: '9000000001',
        role: 'Trader',
        shopname: 'Suresh Traders',
      },
      expect: {
        id: 'user2',
        shopName: 'Suresh Traders',
      },
    },
    {
      label: 'email remapped to emailId',
      input: {
        _id: 'user3',
        firstName: 'Mohan',
        phone: '9000000002',
        role: 'Miller',
        email: 'mohan@example.com',
      },
      expect: {
        id: 'user3',
        emailId: 'mohan@example.com',
      },
    },
    {
      label: 'Both email and emailId present — emailId wins',
      input: {
        _id: 'user4',
        phone: '9000000003',
        email: 'old@example.com',
        emailId: 'new@example.com',
      },
      expect: {
        id: 'user4',
        emailId: 'new@example.com',
      },
    },
    {
      label: 'Invalid role defaults to FPO',
      input: {
        _id: 'user5',
        phone: '9000000004',
        role: 'SuperAdmin',
      },
      expect: { id: 'user5', role: 'FPO' },
    },
    {
      label: 'id field instead of _id',
      input: {
        id: 'user6',
        phone: '9000000005',
        role: 'Corporate',
      },
      expect: { id: 'user6', role: 'Corporate' },
    },
    {
      label: 'Null input → returns null',
      input: null,
      expect: null,
    },
  ];

  let passed = 0;
  let failed = 0;
  const results = [];

  for (const tc of testCases) {
    const result = normalizeUser(tc.input);
    let ok = true;
    const errors = [];

    if (tc.expect === null) {
      ok = result === null;
      if (!ok) errors.push(`Expected null but got: ${JSON.stringify(result)}`);
    } else {
      for (const [key, expectedVal] of Object.entries(tc.expect)) {
        if (result?.[key] !== expectedVal) {
          ok = false;
          errors.push(`${key}: expected "${expectedVal}" got "${result?.[key]}"`);
        }
      }
    }

    if (ok) passed++;
    else failed++;
    results.push({ label: tc.label, ok, errors });
  }

  if (__DEV__) {
    console.log(`\n🧪 [user.normalizer] Tests: ${passed} passed, ${failed} failed`);
  }

  return { passed, failed, results };
}

export function normalizeUser(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const id = raw._id || raw.id;
  if (!id && !raw.phone) return null;

  const emailId = raw.emailId || raw.email || '';
  const shopName = raw.shopName || raw.shopname || '';
  const role = VALID_ROLES.includes(raw.role) ? raw.role : 'FPO';

  return {
    id:          id ? String(id) : null,
    firstName:   raw.firstName   || '',
    lastName:    raw.lastName    || '',
    phone:       raw.phone       || raw.mobile || raw.phoneNumber || '',
    role,
    shopName,
    emailId,
    gender:      raw.gender      || '',
    village:     raw.village     || '',
    district:    raw.district    || '',
    state:       raw.state       || '',
    isVerified:  raw.isVerified  ?? false,
    kycStatus:   raw.kycStatus   || 'pending',
    rating:      typeof raw.rating === 'number' ? raw.rating : null,
    profileImage: raw.profileImage || null,
    shopLicense:  raw.shopLicense  || null,
    GSTCertificate: raw.GSTCertificate || raw.gstCertificate || null,
    PANCard:      raw.PANCard || raw.panCard || null,
    panDetails:   raw.panDetails || null,
    panName:      raw.panName || '',
    panNumber:    raw.panNumber || '',
  };
}

export function mergeWithLocalProfile(backendUser, localProfile) {
  if (!backendUser && !localProfile) return null;
  if (!backendUser) return normalizeUser(localProfile);
  if (!localProfile) return backendUser;

  const merged = { ...localProfile, ...backendUser };
  return normalizeUser(merged);
}

normalizeUser.runTests = runTests;
