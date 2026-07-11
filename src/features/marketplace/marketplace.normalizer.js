/**
 * Marketplace Normalizers
 * Consolidates commodity.normalizer.js and offer.normalizer.js into one feature file.
 */

// ─── COMMODITY NORMALIZER HELPERS ─────────────────────────────────────────────

function getMoisture(qualityParameters) {
  if (!Array.isArray(qualityParameters) || qualityParameters.length === 0) return null;
  const found = qualityParameters.find(
    p => typeof p?.parameterName === 'string' && p.parameterName.toLowerCase().includes('moisture'),
  );
  return found?.parameterValue ?? null;
}

function normalizeQualityParams(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(p => p?.parameterName || p?.name)
    .map(p => ({
      name: String(p?.parameterName || p?.name || '').trim(),
      val:  String(p?.parameterValue || p?.val  || '').trim(),
    }))
    .filter(p => p.name && p.val);
}

function normalizeTradeType(raw) {
  const val = raw?.tradeType || raw?.deliveryType || null;
  if (!val) return null;
  if (val === 'EX_WAREHOUSE') return 'EX-Warehouse';
  if (['FOR', 'EX-Warehouse'].includes(val)) return val;
  return null;
}

function safeDate(dateStr) {
  if (!dateStr) return null;
  try { return String(dateStr).split('T')[0] || null; } catch { return null; }
}

// ─── OFFER NORMALIZER HELPERS ─────────────────────────────────────────────────

function extractId(val) {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (typeof val === 'object') return String(val._id || val.id || '');
  return null;
}

function buildUserName(userObj) {
  if (!userObj || typeof userObj !== 'object') return null;
  const first = userObj.firstName || '';
  const last  = userObj.lastName  || '';
  const full  = `${first} ${last}`.trim();
  return full || userObj.name?.trim() || null;
}

function normalizeRounds(raw, buyerId) {
  const rounds = raw?.negotiationHistory || raw?.rounds || [];
  if (!Array.isArray(rounds)) return [];

  return rounds.map((rd, index) => {
    const proposedBy =
      rd.proposedBy    ||
      rd.proposed_by   ||
      rd.role          ||
      (rd.offeredBy && buyerId && String(rd.offeredBy) === String(buyerId) ? 'buyer' : 'seller');

    return {
      roundNumber: rd.roundNumber ?? rd.round_number ?? (index + 1),
      proposedBy,
      price:       Number(rd.price)    || 0,
      quantity:    Number(rd.quantity) || 0,
      remarks:     rd.remarks          || '',
      tradeType:   rd.tradeType        || null,
      isFinal:     rd.isFinal ?? rd.is_final ?? rd.isFinalOffer ?? false,
      createdAt:   rd.createdAt ?? rd.created_at ?? null,
    };
  });
}

// ─── CORE EXPORTS ─────────────────────────────────────────────────────────────

/**
 * Normalize a raw backend commodity object into a clean UI-ready shape.
 */
export function normalizeCommodity(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const id = raw._id || raw.id;
  if (!id) return null;

  const seller =
    (raw.seller && typeof raw.seller === 'object')     ? raw.seller :
    (raw.sellerId && typeof raw.sellerId === 'object') ? raw.sellerId :
    {};

  const sellerId =
    seller._id || seller.id ||
    (typeof raw.sellerId === 'string' ? raw.sellerId : null) ||
    (typeof raw.seller   === 'string' ? raw.seller   : null) ||
    null;

  const sellerFirstName = seller.firstName || '';
  const sellerLastName  = seller.lastName  || '';
  const sellerName =
    (sellerFirstName || sellerLastName)
      ? `${sellerFirstName} ${sellerLastName}`.trim()
      : seller.name?.trim() || 'Unknown Seller';

  const shopName = seller.shopName || seller.shopname || raw.shopName || raw.shopname || '';

  const sellerRole =
    seller.role && ['FPO', 'Trader', 'Miller', 'Corporate'].includes(seller.role)
      ? seller.role
      : 'Trader';

  const qualityParams = normalizeQualityParams(raw.qualityParameters);
  const moisture      = getMoisture(raw.qualityParameters);
  const deliveryType = normalizeTradeType(raw);

  const card = {
    id:             String(id),
    sellerId:       sellerId ? String(sellerId) : null,
    name:           String(raw.commodityName || '').trim() || '—',
    variety:        String(raw.type           || '').trim() || null,
    quantityLabel:  `${raw.quantity ?? '?'} ${raw.unit || ''}`.trim(),
    price:          raw.sellingPrice != null ? Number(raw.sellingPrice) : null,
    priceUnit:      String(raw.sellingPriceUnit || 'Qt'),
    location:       String(raw.commodityLocation || '').trim() || '—',
    moisture:       moisture ? String(moisture) : '—',
    deliveryType,
    isNegotiable:   raw.isNegotiable !== false,
    status:         String(raw.status || 'active'),
    sellerName,
    sellerRole,
    shopName:       String(shopName),
    listingEndDate: safeDate(raw.listingEndDate),
    images:         Array.isArray(raw.commodityImages) ? raw.commodityImages : [],
    createdAt:      raw.createdAt || null,

    // Legacy support keys
    commodityName:          String(raw.commodityName || '').trim() || '—',
    type:                   String(raw.type || '').trim() || null,
    sellingPrice:           raw.sellingPrice != null ? Number(raw.sellingPrice) : null,
    sellingPriceUnit:       String(raw.sellingPriceUnit || 'Qt'),
    commodityLocation:      String(raw.commodityLocation || '').trim() || '—',
    commodityImages:        Array.isArray(raw.commodityImages) ? raw.commodityImages : [],
    quantity:               String(raw.quantity ?? ''),
    unit:                   String(raw.unit || ''),
    weightType:             String(raw.weightType || 'Net Weight'),
    weightTolerance:        String(raw.weightTolerance || '—'),
    billingAddress:         String(raw.billingAddress || '—'),
    exWarehouseAddress:     raw.exWarehouseAddress || null,
    paymentTimeline:        String(raw.paymentTimeline || '—'),
    remarks:                String(raw.remarks || ''),
    minimumAcceptablePrice: raw.minimumAcceptablePrice ?? null,
    maxNegotiationRounds:   raw.maxNegotiationRounds ?? 5,
    offerExpiryHours:       raw.offerExpiryHours ?? 24,
    escrowEnabled:          raw.escrowEnabled ?? false,
    buyerTransportAllowed:  raw.buyerTransportAllowed ?? false,
    grade:                  raw.grade || null,
    qualityParameters:      qualityParams,
    sellerRating:           typeof seller.rating === 'number' ? seller.rating : null,
    sellerCompletedTrades:  typeof seller.completedTrades === 'number' ? seller.completedTrades : null,
    isSellerVerified:       seller.isVerified ?? false,
    qualityReport:          Array.isArray(raw.qualityReport) ? raw.qualityReport : [],

    detail: {
      id:                    String(id),
      commodityName:         String(raw.commodityName   || '—'),
      type:                  String(raw.type            || '—'),
      quantity:              String(raw.quantity        ?? ''),
      unit:                  String(raw.unit            || ''),
      sellingPrice:          Number(raw.sellingPrice)   || 0,
      sellingPriceUnit:      String(raw.sellingPriceUnit || 'Qt'),
      weightType:            String(raw.weightType      || 'Net Weight'),
      listingEndDate:        safeDate(raw.listingEndDate) || '—',
      weightTolerance:       String(raw.weightTolerance  || '—'),
      billingAddress:        String(raw.billingAddress   || '—'),
      exWarehouseAddress:    raw.exWarehouseAddress      || null,
      paymentTimeline:       String(raw.paymentTimeline  || '—'),
      remarks:               String(raw.remarks          || ''),
      deliveryType,
      isNegotiable:          raw.isNegotiable !== false,
      minimumAcceptablePrice: raw.minimumAcceptablePrice ?? null,
      maxNegotiationRounds:  raw.maxNegotiationRounds   ?? 5,
      offerExpiryHours:      raw.offerExpiryHours       ?? 24,
      commodityLocation:     String(raw.commodityLocation || '—'),
      escrowEnabled:         raw.escrowEnabled           ?? false,
      buyerTransportAllowed: raw.buyerTransportAllowed   ?? false,
      grade:                 raw.grade                   || null,
      moisture:              moisture ? String(moisture) : '—',
      qualityParameters:     qualityParams,
      sellerId:              sellerId ? String(sellerId) : null,
      sellerName,
      shopName:              String(shopName),
      sellerRating:          typeof seller.rating          === 'number' ? seller.rating          : null,
      sellerCompletedTrades: typeof seller.completedTrades === 'number' ? seller.completedTrades : null,
      isSellerVerified:      seller.isVerified             ?? false,
      images:                Array.isArray(raw.commodityImages) ? raw.commodityImages : [],
      qualityReport:         Array.isArray(raw.qualityReport)  ? raw.qualityReport  : [],
    },
  };

  return card;
}

export function normalizeCommodityList(rawResponse) {
  const list =
    rawResponse?.data?.commodities ||
    rawResponse?.commodities       ||
    rawResponse?.data?.docs        ||
    rawResponse?.docs              ||
    (Array.isArray(rawResponse?.data) ? rawResponse.data : null) ||
    (Array.isArray(rawResponse)       ? rawResponse      : []);

  return list.map(normalizeCommodity).filter(Boolean);
}

/**
 * Normalize a raw backend offer object into a clean UI-ready shape.
 */
export function normalizeOffer(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const id = raw._id || raw.id;
  if (!id) return null;

  const buyerObj  = (raw.buyerId  && typeof raw.buyerId  === 'object') ? raw.buyerId  :
                    (raw.buyer    && typeof raw.buyer    === 'object') ? raw.buyer    : null;
  const buyerIdStr = buyerObj ? extractId(buyerObj) : extractId(raw.buyerId || raw.buyer);
  const buyerId   = buyerObj ? { ...buyerObj, _id: buyerIdStr, id: buyerIdStr } : buyerIdStr;

  const buyerFullName = buildUserName(buyerObj);
  const shopName      = buyerObj?.shopName || buyerObj?.shopname || '';
  const buyerName     = shopName && buyerFullName
    ? `${shopName} (${buyerFullName})`
    : buyerFullName || shopName || 'Buyer';

  const sellerObj = (raw.sellerId && typeof raw.sellerId === 'object') ? raw.sellerId :
                    (raw.seller   && typeof raw.seller   === 'object') ? raw.seller   : null;
  const sellerIdStr = sellerObj ? extractId(sellerObj) : extractId(raw.sellerId || raw.seller);
  const sellerId  = sellerObj ? { ...sellerObj, _id: sellerIdStr, id: sellerIdStr } : sellerIdStr;

  const commObj      = (raw.commodityId && typeof raw.commodityId === 'object') ? raw.commodityId :
                       (raw.commodity   && typeof raw.commodity   === 'object') ? raw.commodity   : null;
  const commodityId  = commObj ? extractId(commObj) : extractId(raw.commodityId || raw.commodity);

  const rounds = normalizeRounds(raw, buyerIdStr);

  let resolvedTurn = raw.currentTurn || raw.current_turn || null;
  if (!resolvedTurn) {
    if (rounds.length === 0) {
      resolvedTurn = 'seller';
    } else {
      const lastRound = rounds[rounds.length - 1];
      const lastSender = lastRound.proposedBy || lastRound.role;
      if (lastSender === 'buyer') {
        resolvedTurn = 'seller';
      } else if (lastSender === 'seller') {
        resolvedTurn = 'buyer';
      } else {
        resolvedTurn = 'seller';
      }
    }
  }

  return {
    id:            String(id),
    price:         Number(raw.price)    || 0,
    quantity:      Number(raw.quantity) || 0,
    status:        String(raw.status    || 'pending').toLowerCase(),
    currentTurn:   resolvedTurn,
    roundCount:    raw.roundCount       ?? 0,
    maxRounds:     raw.maxNegotiationRounds ?? 5,
    tradeType:     raw.tradeType        || 'FOR',
    remarks:       raw.remarks          || '',
    isNegotiable:  raw.isNegotiable !== false,
    isFinalOffer:  raw.isFinalOffer     ?? false,
    dealId:        extractId(raw.dealId || raw.deal),
    createdAt:     raw.createdAt        || null,
    expiresAt:     raw.expiresAt        || raw.expiry || null,

    buyerId,
    buyerName,
    buyerRating:   buyerObj?.rating  ?? null,
    buyerState:    buyerObj?.state   || '',
    buyerRole:     buyerObj?.role    || null,

    sellerId,
    commodityId,

    commodity: commObj ? {
      ...commObj,
      id:                    extractId(commObj),
      name:                  String(commObj.commodityName || commObj.name || '').trim() || '—',
      commodityName:         String(commObj.commodityName || commObj.name || '').trim() || '—',
      type:                  String(commObj.type          || commObj.variety || '').trim() || null,
      variety:               String(commObj.type          || commObj.variety || '').trim() || null,
      grade:                 commObj.grade || null,
      unit:                  String(commObj.unit || ''),
      isNegotiable:          commObj.isNegotiable !== false,
      maxNegotiationRounds:  commObj.maxNegotiationRounds ?? 5,
      sellerId:              extractId(commObj.sellerId || commObj.seller),
    } : null,

    rounds,
  };
}

export function normalizeOfferList(rawResponse) {
  const list =
    rawResponse?.data?.offers  ||
    rawResponse?.offers        ||
    rawResponse?.data?.data    ||
    (Array.isArray(rawResponse?.data) ? rawResponse.data : null) ||
    (Array.isArray(rawResponse)       ? rawResponse      : []);

  return list.map(normalizeOffer).filter(Boolean);
}
