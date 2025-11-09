# HiveCraic - Stripe Business Description

## Business Information

### Company/Product Name
**HiveCraic**

### Business Type
SaaS (Software as a Service) - Beekeeping Management Platform

### Industry
Agriculture Technology / Beekeeping / Farm Management Software

### Geographic Market
Ireland (Northern Ireland and Republic of Ireland)

---

## Product/Service Description

### What We Do

HiveCraic is a comprehensive digital beekeeping management platform designed specifically for beekeepers across Ireland. Our application helps beekeepers efficiently manage their apiaries, hives, and beekeeping operations through an intuitive web-based interface.

### Core Features

**Apiary Management:**
- Track multiple apiaries across different locations
- Record apiary details including eircode (Irish postal code), GPS coordinates, and site characteristics
- Manage apiary-specific notes and environmental conditions

**Hive Tracking:**
- Comprehensive hive record keeping
- Track hive health, queen status, and colony strength
- Monitor varroa mite levels and treatment history
- Record feeding schedules and interventions

**Inspection Management:**
- Digital inspection records replacing paper logbooks
- Standardized inspection templates for consistency
- Photo documentation capabilities
- Historical tracking of hive performance

**Harvest & Production:**
- Track honey and other hive product yields
- Record harvest dates and quantities
- Monitor production trends across seasons

**Team Collaboration:**
- Team-based access for beekeeping clubs and associations
- Share apiaries and hive data with team members
- Role-based permissions (owner, admin, member)

**Data Analysis:**
- Visual dashboards showing key metrics
- Historical data trends
- Export capabilities for record-keeping and compliance

### Target Customers

1. **Hobby Beekeepers** - Individuals managing 1-10 hives
2. **Semi-Professional Beekeepers** - Managing 10-50 hives
3. **Commercial Beekeepers** - Large-scale operations with 50+ hives
4. **Beekeeping Clubs & Associations** - Collaborative management for educational apiaries
5. **Beekeeping Educators** - Instructors teaching beekeeping courses

---

## Subscription Model

### Pricing Structure

We offer annual subscriptions with two pricing tiers:

**Standard Rate: €24 per year**
- Full access to all features
- Unlimited apiaries and hives
- Team collaboration features
- 12 months of access

**Association Member Rate: €12 per year (50% discount)**
- Same features as standard rate
- Available to verified members of Irish Beekeeping Associations
- Supports partnership with 79 Irish beekeeping associations across NI and ROI

### Payment Methods

1. **Credit/Debit Card Subscriptions** (via Stripe)
   - Users pay directly through our platform
   - Automatic 12-month access activation
   - Secure payment processing

2. **Association Subscription Codes**
   - Issued by beekeeping clubs and associations
   - Time-based codes with fixed expiration dates
   - Linked to association membership periods
   - Supports club membership benefits

### Value Proposition

- **Affordable**: Starting at just €1 per month for association members
- **Accessible**: Web-based platform works on desktop, tablet, and mobile
- **Irish-Focused**: Built specifically for Irish beekeepers with local considerations
- **Community-Driven**: Supports Irish beekeeping associations and clubs
- **Data Ownership**: Users own their beekeeping data
- **No Lock-in**: Export data at any time

---

## Payment Processing Details

### Transaction Types
- **One-time annual payments** (no recurring billing at launch)
- Fixed amounts: €12 or €24 per transaction
- All prices in EUR (Euro)

### Payment Flow
1. User selects subscription on profile page
2. User indicates if they are an association member
3. Association members select their specific association from dropdown (79 available)
4. System calculates price (€12 for members, €24 for non-members)
5. User redirected to Stripe Checkout for secure payment
6. Upon successful payment, subscription activated for 12 months
7. User redirected back to application with confirmation

### Refund Policy
- Refunds handled on case-by-case basis
- Contact support within 14 days of purchase
- No refunds for partially used subscription periods

### Customer Support
- Email support via app contact form
- Response time: 24-48 hours
- Documentation and help guides in-app

---

## Irish Beekeeping Association Partnership

### Partnership Overview

HiveCraic partners with 79 registered beekeeping associations across Ireland to offer discounted subscriptions to their members. This partnership:

- **Supports the beekeeping community** by providing affordable digital tools
- **Encourages association membership** by offering tangible benefits
- **Builds trust** through association endorsements
- **Promotes best practices** in beekeeping record-keeping

### Association List

**Northern Ireland (21 associations)**
- Ulster Beekeepers' Association (UBKA) affiliated clubs
- Federation of Irish Beekeepers Associations (FIBKA) NI branches
- Covering all six counties of Northern Ireland

**Republic of Ireland (58 associations)**
- FIBKA and Irish Beekeepers Association (IBA) affiliated clubs
- Covering all 26 counties of the Republic of Ireland
- Major associations in Dublin, Cork, Galway, Kerry, and all other counties

### Verification Process

Users self-declare association membership by:
1. Checking "I'm a member of an Irish Beekeeping Association"
2. Selecting their specific association from a dropdown menu
3. Price automatically adjusts to €12 (member rate)

This honor system is backed by:
- Association names and details tracked in user profiles
- Ability to verify membership with associations if needed
- Community trust within the tight-knit Irish beekeeping network

---

## Business Model & Revenue

### Revenue Streams
1. **Individual Subscriptions** - Direct user payments
2. **Association Memberships** - Discounted rate for verified members
3. **Potential Future**: Bulk codes purchased by associations for their members

### Estimated Transaction Volume
- Target: 500-2,000 active subscribers in Year 1
- Average transaction value: €15-20 (mix of member/non-member rates)
- Annual revenue target: €7,500 - €40,000

### Growth Strategy
- Partnership marketing through beekeeping associations
- Word-of-mouth within beekeeping community
- Presence at beekeeping events and conferences
- Social media engagement with beekeeping groups
- Educational content and blog posts

---

## Technical & Security

### Platform Details
- **Technology**: Next.js web application
- **Hosting**: Vercel (edge network, global CDN)
- **Database**: Supabase (PostgreSQL)
- **Security**: Row-level security, encrypted data at rest
- **Compliance**: GDPR compliant (EU/Ireland)

### Payment Security
- **No stored card data** - All payment processing handled by Stripe
- **PCI DSS Compliance** - Through Stripe
- **HTTPS only** - All communications encrypted
- **Webhook signature verification** - Prevents payment fraud

### Data Protection
- All user data stored in EU servers
- GDPR compliant data handling
- Users can export all their data
- Users can delete their accounts and data

---

## Customer Statement Descriptor

**Recommended descriptor for customer credit card statements:**

```
HIVECRAIC.COM SUBSCRIPTION
```
or
```
HIVECRAIC BEEKEEPING APP
```

This clearly identifies:
- The business name (HiveCraic)
- The service (Subscription or Beekeeping App)
- Helps customers recognize the charge

---

## Contact Information

### Business Contact
- **Website**: https://hivecraic.com (or your actual domain)
- **Support Email**: support@hivecraic.com (or your actual email)
- **Business Address**: [Your registered business address in Ireland]

### Developer Contact
- **Technical Contact**: [Your email]
- **Webhook Endpoint**: https://[your-domain]/api/stripe/webhook

---

## Why We Chose Stripe

1. **Best-in-class payment processing** for European businesses
2. **Strong EUR support** with local payment methods
3. **Simple integration** with excellent developer documentation
4. **PCI compliance handled** - reduces our regulatory burden
5. **Trusted by customers** - recognized secure payment brand
6. **Hosted checkout** - professional payment experience without custom development
7. **Transparent pricing** - Clear fee structure
8. **Excellent dispute handling** - Protects both business and customers

---

## Future Plans

### Short-term (6-12 months)
- Expand feature set based on user feedback
- Add automatic subscription renewals
- Implement email notifications for expiring subscriptions
- Enhanced reporting and analytics

### Long-term (1-2 years)
- Mobile apps (iOS and Android)
- Integration with beekeeping equipment (IoT hive sensors)
- Marketplace for beekeeping supplies
- Educational content and courses
- API for third-party integrations

---

## Summary

HiveCraic is a purpose-built beekeeping management platform serving the Irish beekeeping community. We offer affordable annual subscriptions (€12-€24) with special pricing for members of 79 Irish beekeeping associations.

Our partnership approach supports the beekeeping community while providing professional digital tools to help beekeepers manage their operations more effectively. Stripe's secure payment processing allows us to focus on building great features while ensuring customer payment data is handled with the highest security standards.

**Key Points:**
- ✅ Irish-focused beekeeping management SaaS
- ✅ Annual subscriptions (€12-€24 per year)
- ✅ Partnership with 79 Irish beekeeping associations
- ✅ Clean, straightforward pricing
- ✅ No subscription required - one-time annual payment
- ✅ Community-driven and agriculture technology focused
- ✅ GDPR compliant, EU-hosted
- ✅ Low-risk, low-value transactions
- ✅ Legitimate agricultural technology business
