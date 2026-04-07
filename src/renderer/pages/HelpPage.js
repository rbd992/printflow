import React, { useState } from 'react';
import { CHANGELOG } from '../data/changelog';
import { useAuthStore } from '../stores/authStore';

// ── Section icons (SVG, no emojis) ──────────────────────────────────────────
const SectionIcon = ({ id }) => {
  const icons = {
    'getting-started': (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
    ),
    'orders': (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"/>
        <path d="M12 12H3"/><path d="M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        <circle cx="18" cy="12" r="3"/><path d="m22 16-2-2"/>
      </svg>
    ),
    'finance': (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    'printers': (
      <svg width="16" height="16" viewBox="0 0 80 80" fill="none">
        <rect x="8" y="12" width="6" height="40" rx="3" fill="currentColor" opacity="0.5"/>
        <rect x="66" y="12" width="6" height="40" rx="3" fill="currentColor" opacity="0.5"/>
        <rect x="8" y="10" width="64" height="8" rx="4" fill="currentColor" opacity="0.65"/>
        <rect x="31" y="12" width="18" height="11" rx="3" fill="currentColor"/>
        <path d="M37 23 L40 30 L43 23 Z" fill="currentColor"/>
        <rect x="27" y="48" width="26" height="5" rx="2" fill="currentColor" opacity="0.7"/>
        <rect x="29" y="43" width="22" height="6" rx="2" fill="currentColor" opacity="0.55"/>
        <rect x="10" y="57" width="60" height="8" rx="3" fill="currentColor" opacity="0.7"/>
      </svg>
    ),
    'filament': (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>
      </svg>
    ),
    'customers': (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    'quotes': (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
    'settings': (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
    'troubleshooting': (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  };
  return icons[id] || null;
};

// ── Help content ─────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    topics: [
      {
        id: 'overview',
        title: 'What is PrintFlow?',
        content: `PrintFlow is a complete business management suite built specifically for 3D printing operations. It runs on a local server (your NAS or any always-on machine) and is accessible from any computer on your network — or remotely over a VPN.

PrintFlow is printer-agnostic and designed to support any FDM, resin, or multi-material printer. It handles the full lifecycle of your print business:

- **Orders** — Track every order from initial request through payment collected
- **Printers** — Live dashboard monitoring with real-time status, temperatures, and progress
- **Filament** — Inventory tracking with AMS sync, low-stock alerts, and cost analysis
- **Finance** — Revenue and expense reporting with monthly and yearly breakdowns
- **Customers** — Full CRM with order history, contact details, and spend analytics
- **Job Queue** — Kanban board for managing active print jobs across all printers
- **Quotes & Invoices** — Professional PDF documents for customers

Everything syncs in real time across all connected users via the server. Multiple team members can be logged in simultaneously with different permission levels.`,
      },
      {
        id: 'roles',
        title: 'User Roles & Permissions',
        content: `PrintFlow has three role levels that control what each user can see and do:

**Owner**
Full access to all features including:
- All pages, reports, and data
- User management — create, edit, and deactivate team accounts
- Delete orders, transactions, and records permanently
- Company settings and tax configuration
- All financial reports and data exports

**Manager**
Day-to-day business operations:
- Create and edit orders, quotes, and invoices
- View all financial reports and export data
- Access and edit customer records
- Cannot delete orders or manage user accounts

**Operator**
Production floor access:
- View orders and update order status
- View and update the live printer dashboard
- Manage the job queue
- Cannot access financial data, customer details, or settings

To manage user accounts and roles, go to **Settings → Users** (Owner only).`,
      },
      {
        id: 'navigation',
        title: 'Finding Your Way Around',
        content: `The sidebar organizes navigation into four sections:

**Work**
- Dashboard — Business overview with live metrics and recent activity
- Orders — Full customer order pipeline from new to paid
- Job Queue — Active print job tracking (Kanban board)
- Print History — Complete log of all completed print jobs
- Customers — Customer profiles with full order history
- Quotes & Invoices — Generate professional PDF documents

**Production**
- Printers — Live printer monitoring dashboard
- Filament — Spool inventory and material tracking
- Parts — Consumable parts and maintenance schedules
- Models — In-app browser for MakerWorld and Printables

**Business**
- Finance — Revenue, expenses, and profit reporting
- Shipping — Carrier rate comparison and label generation
- Marketing — Platform connections and social channel management

**System**
- Settings — Company configuration, appearance, notifications
- Help & Support — This guide
- Users — Team account management (Owner only)

**Keyboard shortcuts:** Cmd/Ctrl + 1 through 5 navigate to Dashboard, Orders, Queue, Printers, and Filament instantly.`,
      },
    ],
  },
  {
    id: 'orders',
    title: 'Managing Orders',
    topics: [
      {
        id: 'create-order',
        title: 'Creating a New Order',
        content: `To create a new order:

1. Go to **Orders** in the sidebar
2. Click **+ New Order** in the top right
3. Fill in the required fields:
   - **Customer Name** — required
   - **Platform / Source** — where the order came from (Etsy, Direct, Shopify, etc.)
   - **Description** — what the customer ordered
   - **Price** — enter manually or use the calculator button to price based on filament cost, labour, and markup
4. Set the **Order Date** — defaults to the current date and time; can be backdated
5. Set the **Status** — defaults to New
6. Click **Create Order**

The order is assigned an order number automatically, starting at #1001 and incrementing with each order.`,
      },
      {
        id: 'order-statuses',
        title: 'Order Status Pipeline',
        content: `Orders move through a pipeline of statuses representing each stage of fulfilment. Update the status using the dropdown in the orders table, or by opening the order and changing it there.

| Status | Meaning |
|--------|---------|
| New | Order received, not yet actioned |
| Quoted | Price estimate sent to the customer |
| Confirmed | Customer has approved the quote |
| Printing | Job is currently running on a printer |
| Printed | Print complete, awaiting post-processing |
| Post-Processing | Sanding, painting, assembly, or finishing |
| Packed | Packaged and ready for pickup or shipment |
| Shipped | Tracking number assigned, in transit |
| Completed - Paid | Payment received and revenue recorded |
| Cancelled | Order cancelled — any recorded revenue is reversed |

**Revenue is only recorded when an order is marked Completed - Paid.** Orders in any other status do not count toward your financial reports, so your Finance page always reflects actual collected revenue.`,
      },
      {
        id: 'historical-orders',
        title: 'Importing Historical Orders',
        content: `If your business was operating before you started using PrintFlow, you can import past orders so your customer history and financial records are complete and accurate.

To add a historical order:
1. Click **+ New Order**
2. Check the **Historical order import** checkbox at the top of the form
3. Fill in the customer name, platform, description, and price
4. Set the **Order Date** — when the order was originally placed
5. Set the **Date Paid** — when payment was received. This date determines which month the revenue appears in your Finance reports.
6. Click **Create Order**

Historical orders are automatically marked as paid and appear in Finance reporting under the correct period based on their payment date. They are excluded from the Dashboard active order counter since they are already complete.

To view historical orders in the Orders page, enable the **Show completed** toggle in the filter bar.`,
      },
      {
        id: 'backdating',
        title: 'Backdating Orders and Payment Dates',
        content: `Both the order placement date and the payment date can be set to any date in the past. This is useful for:

- Orders that were received before PrintFlow was in use
- Orders entered late that should reflect their actual date
- Correcting a date that was entered incorrectly

**Order Date** — sets when the order was placed. This affects sorting and the Order Date column. Always visible in the order form, defaults to the current date and time.

**Date Paid** — sets the exact date that revenue is recorded in Finance. Only shown when status is set to Completed - Paid or the Historical import option is checked. Defaults to the current date and time when Completed - Paid is selected.

If you set the payment date to a prior month, that revenue appears in that month's Finance report — not the current month. This ensures your reports reflect when money was actually received.`,
      },
      {
        id: 'completed-orders',
        title: 'Viewing Completed and Past Orders',
        content: `The Orders page shows only active orders by default to keep the view focused on work in progress. Paid and cancelled orders are hidden unless you choose to show them.

**To view completed orders:**
Click the **Show completed (X)** checkbox in the filter bar — the count shows how many completed orders exist.

**To filter by a specific status:**
Use the Status dropdown. Selecting "paid" or "cancelled" will show those orders regardless of the Show Completed toggle.

**To view or edit a completed order:**
Click any row to open the order detail modal. All fields remain visible. Owners can delete orders permanently from within this modal.

Completed orders remain linked to customers and Finance records — deleting an order also deletes its associated revenue transaction.`,
      },
    ],
  },
  {
    id: 'finance',
    title: 'Finance & Reporting',
    topics: [
      {
        id: 'how-revenue-works',
        title: 'How Revenue Is Tracked',
        content: `Revenue in PrintFlow is tracked through transactions, which are created automatically when an order reaches Completed - Paid status. This means:

Revenue is recorded when:
- An order is set to Completed - Paid status
- A historical order is imported (transaction is dated to the payment date you specify)

Revenue is not recorded when:
- An order is created, even with a price set
- An order is in any other status — New, Printing, Shipped, etc.
- An order is cancelled (any existing revenue transaction is automatically reversed)

This ensures your Finance reports show only confirmed, collected revenue — not projected revenue from open or in-progress orders.

Expenses are added manually using the **Add Entry** button on the Finance page.`,
      },
      {
        id: 'finance-views',
        title: 'Finance Report Views',
        content: `The Finance page has three reporting views:

**Overview**
- All-time totals: revenue, expenses, profit, and margin percentage
- Last 12 months bar chart showing revenue vs expenses side by side
- Expense breakdown chart by category
- Full transaction ledger showing the 100 most recent entries

**Monthly**
- Select any year and month using the pickers
- Revenue, expenses, profit, and margin for that specific period
- All transactions within that period listed in a table
- Export that month's transactions to CSV

**Yearly**
- Select any year
- Full year totals at the top
- Month-by-month bar chart for the selected year
- Monthly summary table — click any month row to drill directly into it
- Export the complete year's transactions to CSV

All views include a CSV export. Transaction dates are based on the payment date, so backdated orders always appear in the correct reporting period regardless of when they were entered.`,
      },
      {
        id: 'hst',
        title: 'Tax Configuration (HST / GST)',
        content: `PrintFlow tracks HST or any applicable sales tax on income transactions automatically.

To configure your tax settings:
1. Go to **Settings**
2. Scroll to **Company Configuration**
3. Under the Tax & Finance section:
   - Toggle **Enable Tax** on or off
   - Set your **Tax Rate** (13% for Ontario HST, 5% for federal GST only, etc.)
   - Enter your **HST / GST Registration Number** for invoicing
   - Set your **Fiscal Year Start** month

When tax is enabled, each income transaction records the revenue amount and the tax amount separately. This makes it straightforward to calculate your net revenue and remittance obligations.

When tax is disabled, the tax amount on all new transactions is recorded as zero.

Note: Changes to tax settings apply to new transactions only. Existing transactions retain the tax amount they were created with.`,
      },
      {
        id: 'manual-transactions',
        title: 'Adding Manual Transactions',
        content: `You can manually record any income or expense that is not tied to a customer order — supply purchases, shipping costs, platform fees, equipment, and so on.

1. Go to **Finance**
2. Click **Add Entry**
3. Set the date, type (income or expense), description, category, and amount
4. Click **Add**

Available expense categories:
- **Materials** — filament, resin, adhesives, build plates
- **Shipping** — postage and packaging supplies
- **Fees** — platform commissions, payment processing fees, marketplace charges
- **Maintenance** — printer parts, lubricants, replacement components, tools
- **Other** — any expense that does not fit the categories above

Manual transactions appear immediately in all Finance views under the date you entered and are included in CSV exports.`,
      },
    ],
  },
  {
    id: 'printers',
    title: 'Printers & Camera',
    topics: [
      {
        id: 'printer-dashboard',
        title: 'Live Printer Dashboard',
        content: `The Printers page displays a live card for each registered printer. Each card shows:

- **Status** — idle, printing, paused, or error
- **Progress** — percentage complete and estimated time remaining
- **Temperatures** — current and target temperatures for the nozzle and bed
- **AMS / Material** — which filament or material is loaded
- **Current file** — the name of the file being printed
- **Layer count** — current layer out of total layers

The dashboard connects via the printer's local network API for direct, fast updates. Data refreshes automatically — no manual refresh is required.

Printers that go offline will show a disconnected state and reconnect automatically when they come back online.`,
      },
      {
        id: 'camera',
        title: 'Camera Feed',
        content: `Each printer card supports a live camera feed. Click the camera icon on any printer card to begin streaming.

**Controls:**
- **Start** — begins the live MJPEG stream from the printer's camera
- **Stop** — ends the stream and releases the connection on the server
- **Popout** — opens the camera in a separate floating window so you can monitor it while using other pages
- **Frame counter** — displays the number of frames received next to the live indicator

**Troubleshooting the camera:**
- The camera requires a local network connection — it will not function over a remote connection
- Verify the camera IP address and access code are correct via the edit button on the printer card
- If the stream freezes, click Stop and then restart it — the connection resets cleanly
- If the popout window was previously open, close it before restarting the card stream

Camera credentials are configured per-printer and can be set independently from the printer's main IP and access code.`,
      },
      {
        id: 'add-printer',
        title: 'Adding and Editing Printers',
        content: `**To add a new printer:**
1. Go to **Printers**
2. Click **+ Add Printer**
3. Enter:
   - **Name** — a label to identify this printer (e.g. "Workshop P1S", "Studio Unit 2")
   - **Model** — select the printer model from the list
   - **Serial Number** — found in your printer's app or on the device label
   - **IP Address** — the printer's current local IP address (check your router's device list)
   - **Access Code** — the 8-character LAN access code displayed on the printer
4. Optionally configure AMS slot count and camera settings
5. Click **Register Printer**

**To edit an existing printer:**
Click the pencil icon on any printer card. You can update the name, IP address, access code, camera settings, and AMS configuration without removing and re-adding the printer.

**Finding the LAN access code:**
The access code is typically found in the printer's network settings under LAN Mode. Refer to your printer's documentation for the specific location.`,
      },
    ],
  },
  {
    id: 'filament',
    title: 'Filament Inventory',
    topics: [
      {
        id: 'adding-spools',
        title: 'Adding Filament Spools',
        content: `**From a vendor catalogue:**
1. Go to **Filament**
2. Select a vendor tab (Bambu Lab, Polymaker, Sunlu, Overture, etc.)
3. Browse or search for your filament
4. Click **Add to Inventory** — cost and specifications are pre-filled from the catalogue

**Adding a custom spool:**
1. Select the **Custom** tab
2. Enter brand, material, color, weight, cost, and any other relevant details
3. Click **Add Spool**

**Information tracked per spool:**
- Remaining weight in grams (updated via AMS sync when connected printers report tray data)
- Purchase cost (used by the price calculator for accurate job costing)
- Reorder threshold — triggers a low-stock indicator when remaining grams fall below this level
- Vendor source for reordering reference

**AMS synchronization:**
When connected printers report AMS tray readings, PrintFlow automatically updates the remaining weight for matched spools in your inventory.`,
      },
      {
        id: 'price-calculator',
        title: 'Using the Price Calculator',
        content: `The price calculator helps you set accurate, profitable prices based on your actual material and labour costs. Access it in any order form by clicking the calculator button next to the price field.

**Input fields:**
- **Filament Material** — selects which inventory spools to use for cost averaging
- **Estimated Grams** — the amount of filament the print uses (available from your slicer)
- **Labour Hours** — time spent on preparation, post-processing, packing, and handling
- **Labour Rate** — your hourly rate
- **Post-Processing** — any fixed costs for additional finishing steps
- **Markup Percentage** — profit margin applied to the total cost
- **Include Tax** — adds the applicable tax rate to the final price

**How filament cost is determined:**
The calculator uses the average cost-per-gram across all spools of the selected material in your inventory that have a purchase cost recorded. If no spools have cost data, a default estimate is used.

Click **Apply to Order** to set the calculated amount as the order price.`,
      },
    ],
  },
  {
    id: 'customers',
    title: 'Customer Management',
    topics: [
      {
        id: 'customer-profiles',
        title: 'Customer Profiles',
        content: `The Customers page builds customer profiles automatically from your order history. Every customer who has an order in the system appears here without any manual entry required.

Each profile displays:
- Total number of orders
- Total amount spent
- Average order value
- Date of first and most recent order
- Repeat buyer indicator for customers with two or more orders

Click any customer row to open a detail panel on the right side of the screen. The panel shows the complete order history for that customer with status and amounts for each order.

Manual customer records can be added using the **Add Customer** button if you want to store contact details before a customer has placed an order. Manual records merge automatically with order data when orders are matched by email address or name.`,
      },
      {
        id: 'customer-data',
        title: 'Storing Customer Information',
        content: `To add or edit contact information for a customer:

1. Click the customer in the list
2. Click **Edit Customer** in the detail panel (or **Save** for order-only entries)
3. Fields available:
   - Full name and email address
   - Phone number
   - Full mailing address — useful for generating shipping labels
   - Tags — short labels such as "wholesale", "repeat", or "vip"
   - Notes — any relevant information about preferences, requirements, or history

Tags appear in the customer list and can help you identify priority customers at a glance. Notes are visible in the detail panel when viewing a customer.

Customer data is stored on your server and is accessible to all users with sufficient permissions.`,
      },
    ],
  },
  {
    id: 'quotes',
    title: 'Quotes & Invoices',
    topics: [
      {
        id: 'creating-quotes',
        title: 'Creating a Quote or Invoice',
        content: `The Quotes & Invoices page generates professional PDF documents you can send directly to customers.

**To create a document:**
1. Go to **Quotes & Invoices**
2. Your business information is pre-filled from company settings
3. Enter the customer details, or click **Fill from Customer** to pull from your customer database
4. Add line items — each with a description, quantity, and unit price
5. Toggle tax on or off for this document
6. Set the document title to "Quote" or "Invoice" as appropriate
7. Click **Print / Save PDF** to generate the document

**Quote vs Invoice:**
A quote is an estimate sent before work begins. An invoice is the final billing document issued after the work is complete. The document title can be changed freely to suit either purpose.

Your business name, address, registration number, and contact information are saved automatically from your company settings and pre-fill on every new document.`,
      },
    ],
  },
  {
    id: 'settings',
    title: 'Settings & Configuration',
    topics: [
      {
        id: 'company-settings',
        title: 'Company Configuration',
        content: `Your business details are configured in **Settings → Company Configuration** and are used across quotes, invoices, and financial reports.

**Business Information:**
- Company name, email address, phone number, and website
- Full mailing address including city, province, and postal code

**Tax & Finance:**
- **Enable Tax** — toggle sales tax calculation on or off for all new transactions
- **Tax Rate** — your applicable rate expressed as a percentage
- **Tax Registration Number** — your government-issued registration number, printed on invoices
- **Fiscal Year Start** — the month your fiscal year begins

All settings are saved to the server and shared across all users. Click **Save Company** to apply any changes.`,
      },
      {
        id: 'notifications',
        title: 'Push Notifications',
        content: `PrintFlow can send push notifications to your phone or other devices when print jobs complete or encounter errors. This is handled through ntfy, a free and open-source notification service.

**Setup:**
1. Install the ntfy app on your phone — available on iOS and Android
2. In PrintFlow, go to **Settings → Push Notifications**
3. Enter a unique topic name — this is your private notification channel
4. Open the ntfy app on your phone and subscribe to the same topic name
5. Enable the toggle and click Save
6. Click **Send Test** to confirm the connection is working

The topic name acts as your private channel identifier. Choose something unique and non-obvious so that only your devices receive your notifications.

Notifications are sent automatically when print jobs complete, fail, or encounter errors.`,
      },
      {
        id: 'server-connection',
        title: 'Server Connection & Remote Access',
        content: `PrintFlow connects to a backend server that manages the database and API. The app automatically detects whether you are on the local network or connecting remotely.

**Local network access:**
When you are on the same network as the server, the app connects directly using the server's local IP address. This provides the fastest response times and supports all features including camera streaming.

**Remote access:**
PrintFlow supports remote access via Tailscale, a zero-configuration VPN service. With Tailscale installed on your device and the server, you can connect from anywhere. Most features work remotely; camera streaming requires a local connection.

**Changing the server URL:**
Go to **Settings → Server Connection**, update the URL, and click Save. Restart the app after making this change.

**If the connection fails:**
- Confirm the server is running (check your NAS container manager or equivalent)
- Verify the server IP and port are correct
- If using remote access, confirm your VPN connection is active`,
      },
      {
        id: 'updates',
        title: 'Keeping PrintFlow Updated',
        content: `PrintFlow checks for updates automatically when the app starts. When a newer version is available, a notification banner appears in the lower-left corner of the sidebar.

**To update the app:**
1. Click the Download button in the update notification
2. The installer downloads to your computer
3. Run the installer — it replaces the existing version
4. Relaunch PrintFlow

**PrintFlow has two components that update separately:**

**The desktop app** — this application, which contains all pages and the user interface. Updated by downloading and running the new installer.

**The server** — runs on your NAS or server machine and handles the database, API, and printer connections. Updated by running the deployment task in your server management interface after a new version is pushed.

Both components should be kept at the same version for full compatibility. Your current version is shown in the sidebar footer and on the login screen.`,
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    topics: [
      {
        id: 'cant-connect',
        title: 'Cannot Connect to Server',
        content: `If PrintFlow displays a connection error at startup or cannot reach the server:

**1. Verify the server is running**
Check your server management interface (NAS container manager or equivalent) and confirm the PrintFlow server container is in a running state. If it has stopped, start it and wait about 30 seconds before trying again.

**2. Test the server directly**
Open a browser and navigate to http://[your-server-ip]:3001/health. A brief JSON response confirms the server is accepting connections. If nothing loads, the server is not responding on that port.

**3. Check your network**
Confirm your computer is on the same network as the server, or that your remote access connection is active if you are connecting from outside the network.

**4. Verify the server address**
Go to **Settings → Server Connection** and confirm the URL is correct, including the port number. An incorrect IP address or port is a common cause of connection failures.

**5. Restart the server**
A container restart often resolves unexpected connectivity issues. After restarting, allow 20 to 30 seconds for the server to fully initialize before attempting to connect.`,
      },
      {
        id: 'orders-not-showing',
        title: 'Order Not Appearing in Finance',
        content: `If an order is not appearing in Finance reports, work through the following checks:

**Verify the order status**
Only orders with the status Completed - Paid create a financial transaction. Orders in any other status — including New, Printing, Shipped, or Post-Processing — do not appear in Finance until marked as paid.

**Check the payment date**
Revenue is recorded under the month of the payment date, not the order creation date. If you set a payment date in a prior month, the revenue appears in that month's report. Check the correct period in the Monthly or Yearly view.

**Check historical orders**
Historical orders are included in Finance reporting and appear under their specified payment date. Use the Yearly view and select the appropriate year to locate them.

**Confirm a transaction was created**
It is possible for an order to exist without a linked transaction if it was created before the payment tracking feature was introduced. In this case, the order will show a paid status but will not appear in Finance. Contact support with the order number to resolve this.`,
      },
      {
        id: 'camera-not-working',
        title: 'Camera Feed Not Working',
        content: `If the camera stream fails to start or displays an error:

**1. Confirm you are on the local network**
Camera streaming requires a direct local network connection. It will not function over a remote connection. Verify the app is connected via the local server IP address.

**2. Check the camera credentials**
Click the edit button on the printer card and verify the camera IP address and access code. The access code is typically the same as the printer's LAN access code.

**3. Restart the stream**
Click Stop, wait a moment for the connection to fully close, then click the camera icon again to restart. This clears any stale connection on the server side.

**4. Confirm the printer is powered on**
The camera can only stream when the printer is turned on and connected to the network. A printer in sleep mode or powered off will not respond.

**5. Close any open popout window**
If the camera popout window was previously opened and left open, close it before attempting to restart the main card stream.`,
      },
      {
        id: 'printer-offline',
        title: 'Printer Shows as Offline',
        content: `If a printer card shows an offline or disconnected status:

**1. Confirm the printer is powered on**
The printer must be on and not in an idle sleep state that disables network access.

**2. Verify the IP address is current**
Printer IP addresses can change if assigned automatically by your router. Check the current IP address in the printer's network settings or your router's connected device list. Update the IP in PrintFlow using the edit button on the printer card.

**3. Confirm network mode is enabled**
The printer must have its local network or LAN mode enabled for PrintFlow to connect. Check the printer's network settings and enable this mode if it is not already active.

**4. Check the access code**
The LAN access code may have changed, particularly after a firmware update. Locate the current code in the printer's network settings and update it in PrintFlow.

**5. Restart the printer**
A full power cycle — turning the printer completely off, waiting 10 seconds, and turning it back on — resolves the majority of connectivity issues.`,
      },
      {
        id: 'getting-help',
        title: 'Getting Further Assistance',
        content: `If you encounter an issue not covered in this guide:

**Review the release notes**
Click the information button in the sidebar footer to open the full release notes. Recent updates may include fixes for the issue you are experiencing.

**Check the server log**
The server writes detailed logs that can help identify the source of a problem. The log file is located at:

\\\\Synology\\printflow1\\logs\\combined.log

Look for entries marked as "error" near the time the issue occurred.

**Information to gather before reporting an issue:**
- Your current PrintFlow version (visible in the sidebar footer)
- A description of what you were doing when the issue occurred
- What you expected to happen vs what actually happened
- Any error messages displayed in the app
- Relevant entries from the server log if applicable

**Key file locations on your server:**
- Server logs: \\\\Synology\\printflow1\\logs\\combined.log
- Database: \\\\Synology\\printflow1\\data\\printflow.db
- Server source: \\\\Synology\\printflow1\\server\\src\\`,
      },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function HelpPage() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [activeTopic,   setActiveTopic]   = useState('overview');
  const [search,        setSearch]        = useState('');
  const { serverUrl } = useAuthStore();

  const allTopics = SECTIONS.flatMap(s =>
    s.topics.map(t => ({ ...t, sectionId: s.id, sectionTitle: s.title }))
  );

  const searchResults = search.length > 1
    ? allTopics.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.content.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const currentSection = SECTIONS.find(s => s.id === activeSection);
  const currentTopic   = currentSection?.topics.find(t => t.id === activeTopic);

  function selectTopic(sectionId, topicId) {
    setActiveSection(sectionId);
    setActiveTopic(topicId);
    setSearch('');
  }

  // Render content with markdown-like formatting
  function renderContent(text) {
    const lines = text.split('\n');
    const elements = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Table
      if (line.startsWith('|') && i + 1 < lines.length && lines[i + 1].startsWith('|---')) {
        const headers = line.split('|').filter(c => c.trim()).map(c => c.trim());
        i += 2;
        const rows = [];
        while (i < lines.length && lines[i].startsWith('|')) {
          rows.push(lines[i].split('|').filter(c => c.trim()).map(c => c.trim()));
          i++;
        }
        elements.push(
          <div key={`table-${i}`} style={{ overflowX: 'auto', marginBottom: 20 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {headers.map((h, j) => (
                    <th key={j} style={{ textAlign: 'left', padding: '8px 14px', borderBottom: '1.5px solid var(--border)', fontWeight: 600, color: 'var(--text-tertiary)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, j) => (
                  <tr key={j} style={{ borderBottom: '0.5px solid var(--border)' }}>
                    {row.map((cell, k) => (
                      <td key={k} style={{ padding: '9px 14px', fontSize: 13 }} dangerouslySetInnerHTML={{ __html: formatInline(cell) }} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }

      if (line.trim() === '') { i++; continue; }

      // Bullet list
      if (line.startsWith('- ') || line.startsWith('• ')) {
        const bullets = [];
        while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('• '))) {
          bullets.push(lines[i].replace(/^[-•] /, ''));
          i++;
        }
        elements.push(
          <ul key={`ul-${i}`} style={{ margin: '0 0 16px 0', paddingLeft: 0, listStyle: 'none' }}>
            {bullets.map((b, j) => (
              <li key={j} style={{ display: 'flex', gap: 10, fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)', marginBottom: 4 }}>
                <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }}>—</span>
                <span dangerouslySetInnerHTML={{ __html: formatInline(b) }} />
              </li>
            ))}
          </ul>
        );
        continue;
      }

      // Numbered list
      if (/^\d+\. /.test(line)) {
        const items = [];
        while (i < lines.length && /^\d+\. /.test(lines[i])) {
          items.push(lines[i].replace(/^\d+\. /, ''));
          i++;
        }
        elements.push(
          <ol key={`ol-${i}`} style={{ margin: '0 0 16px 0', paddingLeft: 0, listStyle: 'none' }}>
            {items.map((item, j) => (
              <li key={j} style={{ display: 'flex', gap: 12, fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)', marginBottom: 6 }}>
                <span style={{ color: 'var(--accent)', fontWeight: 600, flexShrink: 0, minWidth: 18, textAlign: 'right' }}>{j + 1}.</span>
                <span dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
              </li>
            ))}
          </ol>
        );
        continue;
      }

      // Code block (backtick path)
      if (line.startsWith('`') && line.endsWith('`')) {
        elements.push(
          <div key={`code-${i}`} style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--bg-hover)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '8px 12px', marginBottom: 16, color: 'var(--accent)', wordBreak: 'break-all' }}>
            {line.slice(1, -1)}
          </div>
        );
        i++;
        continue;
      }

      // Regular paragraph
      elements.push(
        <p key={`p-${i}`} style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-secondary)', marginBottom: 14 }}
          dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
      );
      i++;
    }

    return elements;
  }

  function formatInline(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-primary);font-weight:600">$1</strong>')
      .replace(/`(.+?)`/g, '<code style="background:var(--bg-hover);padding:1px 6px;border-radius:4px;font-family:monospace;font-size:12px;color:var(--accent)">$1</code>');
  }

  const appVersion = CHANGELOG[0]?.version || '—';

  const allTopicsFlat = SECTIONS.flatMap(s => s.topics.map(t => ({ ...t, sectionId: s.id })));
  const currentIdx    = allTopicsFlat.findIndex(t => t.id === activeTopic && t.sectionId === activeSection);
  const prevTopic     = allTopicsFlat[currentIdx - 1];
  const nextTopic     = allTopicsFlat[currentIdx + 1];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h1>Help & Support</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
              PrintFlow v{appVersion} — User guide and reference documentation
            </p>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16, maxWidth: 400 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input className="input" placeholder="Search all topics..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36, width: '100%' }} />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 16, lineHeight: 1 }}>✕</button>
          )}
        </div>
      </div>

      {/* Search results */}
      {search.length > 1 && (
        <div style={{ padding: '0 24px 24px', overflowY: 'auto' }}>
          {searchResults.length === 0 ? (
            <div style={{ padding: '20px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>No results found for "{search}"</div>
          ) : (
            <div className="card">
              <div style={{ padding: '10px 18px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', borderBottom: '0.5px solid var(--border)' }}>
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </div>
              {searchResults.map(t => (
                <div key={t.id} onClick={() => selectTopic(t.sectionId, t.id)}
                  style={{ padding: '12px 18px', borderBottom: '0.5px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{t.sectionTitle}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main layout */}
      {!search && (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '210px 1fr', overflow: 'hidden', padding: '0 24px 24px', gap: 16 }}>

          {/* Sidebar */}
          <div style={{ overflowY: 'auto' }}>
            {SECTIONS.map(section => (
              <div key={section.id} style={{ marginBottom: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', padding: '10px 8px 4px' }}>
                  <span style={{ opacity: 0.7 }}><SectionIcon id={section.id} /></span>
                  {section.title}
                </div>
                {section.topics.map(topic => {
                  const isActive = activeTopic === topic.id && activeSection === section.id;
                  return (
                    <div key={topic.id} onClick={() => selectTopic(section.id, topic.id)}
                      style={{ padding: '7px 10px', borderRadius: 7, cursor: 'pointer', fontSize: 13, marginBottom: 1, transition: 'all 0.1s', fontWeight: isActive ? 500 : 400, background: isActive ? 'var(--accent-light)' : 'transparent', color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
                      {topic.title}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Version badge */}
            <div style={{ marginTop: 20, padding: '12px', background: 'var(--bg-hover)', borderRadius: 8, fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.8, border: '0.5px solid var(--border)' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>PrintFlow v{appVersion}</div>
              <div>Server: {serverUrl || '10.0.0.219:3001'}</div>
            </div>
          </div>

          {/* Content */}
          <div style={{ overflowY: 'auto' }}>
            {currentTopic && (
              <div className="card" style={{ padding: 28 }}>
                {/* Breadcrumb */}
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <SectionIcon id={activeSection} />
                  <span>{currentSection?.title}</span>
                  <span style={{ opacity: 0.4 }}>›</span>
                  <span>{currentTopic.title}</span>
                </div>

                <h2 style={{ fontSize: 20, marginBottom: 20, paddingBottom: 16, borderBottom: '0.5px solid var(--border)' }}>
                  {currentTopic.title}
                </h2>

                <div>
                  {renderContent(currentTopic.content)}
                </div>

                {/* Prev / Next */}
                <div style={{ marginTop: 32, paddingTop: 16, borderTop: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {prevTopic ? (
                    <button className="btn btn-ghost btn-sm" onClick={() => selectTopic(prevTopic.sectionId, prevTopic.id)} style={{ fontSize: 12 }}>
                      ← {prevTopic.title}
                    </button>
                  ) : <div />}
                  {nextTopic ? (
                    <button className="btn btn-secondary btn-sm" onClick={() => selectTopic(nextTopic.sectionId, nextTopic.id)} style={{ fontSize: 12 }}>
                      {nextTopic.title} →
                    </button>
                  ) : <div />}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
