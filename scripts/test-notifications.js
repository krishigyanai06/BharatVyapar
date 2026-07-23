/**
 * Push Notification Mock Simulator & Payload Validator
 * 
 * Usage:
 *   node scripts/test-notifications.js
 */

const EVENT_PAYLOADS = {
  MARKETPLACE_LISTING: {
    title: '🌾 New Commodity Listing Alert',
    body: 'Shri Ram FPO posted 500 Quintal Sharbati Wheat at ₹2,200/Qtl.',
    data: {
      type: 'MARKETPLACE_LISTING',
      commodityId: 'COMM_MOCK_9901',
      title: '🌾 New Commodity Listing Alert',
      body: 'Shri Ram FPO posted 500 Quintal Sharbati Wheat at ₹2,200/Qtl.',
    },
  },
  BUYER_REQUIREMENT: {
    title: '📋 New Buyer Requirement Created',
    body: 'Corporate Buyer requested 200 Qtl Yellow Mustard in Kota mandi.',
    data: {
      type: 'BUYER_REQUIREMENT',
      requirementId: 'REQ_MOCK_5012',
      title: '📋 New Buyer Requirement Created',
      body: 'Corporate Buyer requested 200 Qtl Yellow Mustard in Kota mandi.',
    },
  },
  NEW_QUOTATION: {
    title: '💼 New Seller Quotation Received',
    body: 'Kisan Producer Co. submitted a quote of ₹5,400/Qtl for your Mustard requirement.',
    data: {
      type: 'NEW_QUOTATION',
      requirementId: 'REQ_MOCK_5012',
      quotationId: 'QUOTE_MOCK_7044',
      title: '💼 New Seller Quotation Received',
      body: 'Kisan Producer Co. submitted a quote of ₹5,400/Qtl for your Mustard requirement.',
    },
  },
  BIDDING_OFFER: {
    title: '🤝 Counter Offer Received',
    body: 'Buyer sent a counter offer of ₹2,150/Qtl for your Wheat listing.',
    data: {
      type: 'BIDDING_OFFER',
      offerId: 'OFFER_MOCK_3099',
      commodityId: 'COMM_MOCK_9901',
      title: '🤝 Counter Offer Received',
      body: 'Buyer sent a counter offer of ₹2,150/Qtl for your Wheat listing.',
    },
  },
  DEAL_DONE: {
    title: '🎉 Deal Finalized!',
    body: 'Congratulations! Your deal for 500 Qtl Sharbati Wheat has been locked.',
    data: {
      type: 'DEAL_DONE',
      dealId: 'DEAL_MOCK_8820',
      offerId: 'OFFER_MOCK_3099',
      title: '🎉 Deal Finalized!',
      body: 'Congratulations! Your deal for 500 Qtl Sharbati Wheat has been locked.',
    },
  },
  PO_SENT: {
    title: '📄 Purchase Order Issued',
    body: 'Buyer has generated Purchase Order #PO_MOCK_1044 for Deal #DEAL_MOCK_8820.',
    data: {
      type: 'PO_SENT',
      dealId: 'DEAL_MOCK_8820',
      poId: 'PO_MOCK_1044',
      title: '📄 Purchase Order Issued',
      body: 'Buyer has generated Purchase Order #PO_MOCK_1044 for Deal #DEAL_MOCK_8820.',
    },
  },
  PO_STATUS_UPDATED: {
    title: '🚚 PO Status Update: DISPATCHED',
    body: 'Seller updated Purchase Order #PO_MOCK_1044 status to DISPATCHED.',
    data: {
      type: 'PO_STATUS_UPDATED',
      poId: 'PO_MOCK_1044',
      dealId: 'DEAL_MOCK_8820',
      status: 'DISPATCHED',
      title: '🚚 PO Status Update: DISPATCHED',
      body: 'Seller updated Purchase Order #PO_MOCK_1044 status to DISPATCHED.',
    },
  },
};

// Aliases Mapper mirror from notificationService.js
const EVENT_TYPE_ALIASES = {
  'NEW_LISTING': 'MARKETPLACE_LISTING',
  'COMMODITY_LISTED': 'MARKETPLACE_LISTING',
  'SELL_COMMODITY': 'MARKETPLACE_LISTING',
  'NEW_REQUIREMENT': 'BUYER_REQUIREMENT',
  'REQUIREMENT_POSTED': 'BUYER_REQUIREMENT',
  'COUNTER_OFFER': 'BIDDING_OFFER',
  'OFFER_RECEIVED': 'BIDDING_OFFER',
  'NEW_BID': 'BIDDING_OFFER',
  'DEAL_CONFIRMED': 'DEAL_DONE',
  'ORDER_COMPLETED': 'DEAL_DONE',
  'PURCHASE_ORDER_SENT': 'PO_SENT',
  'PO_ISSUED': 'PO_SENT',
  'PO_STATUS_CHANGE': 'PO_STATUS_UPDATED',
};

// Routing Map mirror from notificationService.js
const NOTIFICATION_ROUTING_MAP = {
  MARKETPLACE_LISTING: {
    screen: 'CommodityDetails',
    paramMapper: (data) => ({
      item: { id: data.commodityId || data.id || data.entityId || data._id },
    }),
  },
  BUYER_REQUIREMENT: {
    screen: 'MyRequirements',
    paramMapper: (data) => ({
      requirementId: data.requirementId || data.id || data.entityId || data._id,
    }),
  },
  NEW_QUOTATION: {
    screen: 'BuyerQuoteDashboard',
    paramMapper: (data) => ({
      requirement: { id: data.requirementId || data.id || data._id },
      quotationId: data.quotationId,
    }),
  },
  BIDDING_OFFER: {
    screen: 'NegotiationDetails',
    paramMapper: (data) => ({
      offerId: data.offerId || data.id || data._id,
      commodityId: data.commodityId,
    }),
  },
  DEAL_DONE: {
    screen: 'DealDetails',
    paramMapper: (data) => ({
      dealId: data.dealId || data.id || data._id,
      offerId: data.offerId,
    }),
  },
  PO_SENT: {
    screen: 'DealDetails',
    paramMapper: (data) => ({
      dealId: data.dealId || data.id || data._id,
      poId: data.poId,
    }),
  },
  PO_STATUS_UPDATED: {
    screen: 'DealDetails',
    paramMapper: (data) => ({
      dealId: data.dealId || data.id || data._id,
      poId: data.poId,
      status: data.status,
    }),
  },
};

function resolveRoute(payloadData) {
  const rawType = (payloadData.type || payloadData.eventType || '').toString().toUpperCase().trim();
  const eventType = EVENT_TYPE_ALIASES[rawType] || rawType;
  const routeConfig = NOTIFICATION_ROUTING_MAP[eventType];

  if (!routeConfig) {
    return { success: false, error: `Unmapped event type: "${rawType}"` };
  }

  return {
    success: true,
    eventType,
    screen: routeConfig.screen,
    params: routeConfig.paramMapper(payloadData),
  };
}

function runSimulator() {
  console.log('===============================================================');
  console.log('🚀 BHARAT FPO VYAPAR - FCM PUSH NOTIFICATION SIMULATOR & AUDIT');
  console.log('===============================================================\n');

  let passed = 0;
  let total = Object.keys(EVENT_PAYLOADS).length;

  for (const [key, payload] of Object.entries(EVENT_PAYLOADS)) {
    console.log(`📌 Testing Event: [${key}]`);
    console.log(`   Notification: "${payload.title}"`);
    console.log(`   Data Payload:`, JSON.stringify(payload.data));

    const result = resolveRoute(payload.data);
    if (result.success) {
      console.log(`   ✅ Target Navigation Route: ${result.screen}`);
      console.log(`   ✅ Route Parameters:       `, JSON.stringify(result.params));
      passed++;
    } else {
      console.error(`   ❌ Failed:`, result.error);
    }
    console.log('---------------------------------------------------------------');
  }

  console.log(`\n🎉 Test Results: ${passed}/${total} Push Event Triggers Verified Successfully!`);
  console.log('===============================================================\n');
}

// Execute
runSimulator();

module.exports = { EVENT_PAYLOADS, resolveRoute };
