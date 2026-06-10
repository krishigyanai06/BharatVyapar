# Bharat FPO Vyapar

## API Documentation

### OTP Routes (`/api/otp`)

| Method | Route | Description | Expected Fields (Body/Query) |
| :--- | :--- | :--- | :--- |
| `POST` | `/send-otp` | Send an OTP to a mobile number | **Body:**<br>- `mobile` (string, required): 10-digit number starting with 6-9<br>- `role` (string, optional) |
| `POST` | `/verify-otp` | Verify an OTP | **Body:**<br>- `mobile` (string, required): 10-digit number starting with 6-9<br>- `otp` (string, required): Exactly 6 characters<br>- `role` (string, optional) |

### User Routes (`/api/user`)

| Method | Route | Description | Expected Fields / Details |
| :--- | :--- | :--- | :--- |
| `PATCH` | `/update-profile` | Update user profile with files | **Body (FormData):**<br>- `role` (enum: FPO, Trader, Miller, Corporate, SuperAdmin)<br>- `firstName`, `lastName` (string)<br>- `gender` (enum: Male, Female, Other)<br>- `village`, `district`, `state` (string)<br>- `phone` (string, 10-digits)<br>- `emailId` (string, valid email)<br><br>**Files (FormData):**<br>- `profileImage`, `shopLicense`, `GSTCertificate`, `PANCard` (max: 1 each)<br><br>*Note: Requires Authentication* |
| `DELETE`| `/delete-account` | Delete user account | **Headers:** Requires Authentication |
| `GET` | `/getUserDetails` | Get current user's details | **Headers:** Requires Authentication |
| `GET` | `/getAllUsers` | Get list of all users | **Headers:** Requires Authentication |
| `GET` | `/files/private` | Get user private files | **Query:**<br>- `type` (required, enum: shopLicense, GSTCertificate, PANCard)<br>- `index` (number, optional)<br><br>**Headers:** Requires Authentication |
| `POST` | `/logout` | Logout the user | **Headers:** Requires Authentication |

### Sell Commodity Routes (`/api/sell-commodity`)

| Method | Route | Description | Expected Fields / Details |
| :--- | :--- | :--- | :--- |
| `POST` | `/create` | Create a new sell commodity listing | **Headers:** Requires Authentication<br><br>**Body (JSON or FormData):**<br>- `commodityName` (string, required)<br>- `type` (string, optional)<br>- `quantity` (string, required)<br>- `unit` (string, required)<br>- `sellingPrice` (number, required)<br>- `sellingPriceUnit` (enum: `"Kg"`, `"Qt"`, `"Ton"`, `"Metric Ton"`, required)<br>- `weightType` (enum: `"Gross Weight"`, `"Net Weight"`, optional)<br>- `listingEndDate` (string: YYYY-MM-DD or ISO-date, optional)<br>- `qualityParameters` (array of objects: `{ parameterName: string, parameterValue: string }`, optional)<br>- `weightTolerance` (string, optional)<br>- `billingAddress`, `exWarehouseAddress` (string, optional)<br>- `paymentTimeline`, `remarks` (string, optional)<br>- `deliveryType` (enum: `"FOR"`, `"EX_WAREHOUSE"`, optional)<br>- `isNegotiable` (boolean, default: `true`, optional)<br>- `minimumAcceptablePrice` (number, optional)<br>- `maxNegotiationRounds` (number, default: 5, optional)<br>- `offerExpiryHours` (number, default: 24, optional)<br>- `commodityLocation` (string, optional)<br>- `escrowEnabled` (boolean, default: `false`, optional)<br>- `buyerTransportAllowed` (boolean, default: `false`, optional)<br>- `status` (enum: `"active"`, `"sold"`, `"expired"`, `"cancelled"`, default: `"active"`, optional)<br>- `commodityImages` (array of base64 strings, optional)<br>- `qualityReport` (array of base64 strings, optional)<br><br>**Files (FormData):**<br>- `commodityImages` (max: 10 files, optional)<br>- `qualityReport` (max: 10 files, optional) |
| `GET` | `/` | Fetch all/filtered sell commodity listings (paginated) | **Headers:** Requires Authentication<br><br>**Query:**<br>- `status` (enum: `"active"`, `"sold"`, `"expired"`, `"cancelled"`, optional)<br>- `sellerId` (string, optional)<br>- `commodityName` (string, optional)<br>- `type` (string, optional)<br>- `page` (number, default: 1, optional)<br>- `limit` (number, default: 10, optional) |
| `GET` | `/:id` | Fetch details of a specific sell commodity listing | **Headers:** Requires Authentication<br><br>**Path Param:** `id` (Mongoose ObjectId of the commodity) |
| `PATCH` | `/:id` | Update an existing sell commodity listing | **Headers:** Requires Authentication<br><br>**Path Param:** `id` (Mongoose ObjectId of the commodity)<br><br>**Body (JSON or FormData):**<br>- All creation body fields (optional)<br>- `deleteCommodityImages` (array of string keys/URLs of files to delete, optional)<br>- `deleteQualityReport` (array of string keys/URLs of files to delete, optional)<br><br>**Files (FormData):**<br>- `commodityImages` (max: 10 files, optional)<br>- `qualityReport` (max: 10 files, optional) |
| `DELETE`| `/:id` | Delete/cancel a sell commodity listing | **Headers:** Requires Authentication<br><br>**Path Param:** `id` (Mongoose ObjectId of the commodity) |

### Buy Commodity & Negotiation Routes (`/api/buy-commodity`)

All routes require Authentication headers.

| Method | Route | Description | Expected Fields / Details |
| :--- | :--- | :--- | :--- |
| `POST` | `/offers` | Submit an initial offer to buy | **Body (JSON):**<br>- `commodityId` (string, required)<br>- `price` (number, required)<br>- `priceUnit` (string, required)<br>- `quantity` (number, required)<br>- `unit` (string, required)<br>- `deliveryType` (enum: `"FOR"`, `"EX_WAREHOUSE"`, required)<br>- `paymentTimeline` (string, optional)<br>- `remarks` (string, optional) |
| `GET` | `/offers` | List offers submitted by the current buyer | **Query:**<br>- `status` (enum, optional)<br>- `commodityId` (string, optional)<br>- `page` (number, default: 1, optional)<br>- `limit` (number, default: 10, optional)<br><br>*Note: If another buyer is actively negotiating, pending offers display a dynamic status of `"In Negotiation"`.* |
| `GET` | `/offers/received/:commodityId` | List received offers from multiple buyers (Seller view) | **Path Param:** `commodityId` (required)<br>**Query:** page, limit (optional) |
| `GET` | `/offers/:id` | Retrieve detailed offer & counter negotiation rounds | **Path Param:** `id` (offer ID) |
| `POST` | `/offers/:id/counter` | Submit a counter offer | **Path Param:** `id` (offer ID)<br>**Body (JSON):**<br>- `price` (number, required)<br>- `quantity` (number, required)<br>- `remarks` (string, optional)<br>- `isFinalOffer` (boolean, default: `false`, optional)<br><br>*Enforces cooldown (30 min), expiry (24h), turn order, price movement limit (< 5%), and max rounds (5).* |
| `POST` | `/offers/:id/accept` | Accept other party's counter offer | **Path Param:** `id` (offer ID)<br><br>*Accepting shifts listing status to `"sold"`, expires other offers, and creates an Escrow Deal.* |
| `POST` | `/offers/:id/reject` | Decline/reject an offer | **Path Param:** `id` (offer ID) |
| `GET` | `/deals/:dealId` | Retrieve details of a confirmed deal / escrow contract | **Path Param:** `dealId` (deal ID) |
| `PATCH` | `/deals/:dealId/escrow` | Update escrow payment and delivery stage | **Path Param:** `dealId` (deal ID)<br>**Body (JSON):**<br>- `escrowStatus` (enum: `"pending_payment"`, `"funded"`, `"dispatched"`, `"delivered"`, `"released"`, `"cancelled"`, required) |