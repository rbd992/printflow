import React, { useState } from 'react';
import { CHANGELOG } from '../data/changelog';

// ── Help content ────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: 'getting-started',
    icon: '🚀',
    title: 'Getting Started',
    topics: [
      {
        id: 'overview',
        title: 'What is PrintFlow?',
        content: `PrintFlow is a complete business management suite built specifically for Bambu Lab 3D printing operations. It runs on your Synology NAS and is accessible from any computer on your network — or remotely via Tailscale.

PrintFlow handles the full lifecycle of your print business:
• **Orders** — Track every order from new request to payment collected
• **Printers** — Live dashboard for your Bambu Lab H2C and P1S
• **Filament** — Inventory tracking with AMS sync and low-stock alerts
• **Finance** — Revenue and expense reporting with monthly/yearly breakdowns
• **Customers** — Full CRM with order history and spend analytics
• **Job Queue** — Kanban board for managing print jobs in progress

Everything syncs in real time across all users via the server on your NAS. Multiple team members can be logged in simultaneously with different permission levels.`,
      },
      {
        id: 'roles',
        title: 'User Roles & Permissions',
        content: `PrintFlow has three role levels:

**Owner**
Full access to everything including:
- All pages and features
- User management (create/edit/delete accounts)
- Delete orders, transactions, and data
- Company settings and tax configuration
- Finance and revenue reports

**Manager**
Business operations access:
- Create and edit orders
- View finance reports
- Create quotes and invoices
- Access customer data
- Cannot delete orders or manage users

**Operator**
Production-focused access:
- View orders and update status
- View printer dashboard
- Update job queue
- Cannot access finance or customer data

To change a user's role, go to **Settings → Users** (Owner only).`,
      },
      {
        id: 'navigation',
        title: 'Finding Your Way Around',
        content: `The sidebar on the left is organized into four sections:

**Work**
- Dashboard — Business overview and live metrics
- Orders — Customer orders and fulfilment pipeline
- Job Queue — Active print jobs (Kanban board)
- Print History — Log of all completed print jobs
- Customers — Customer profiles and order history
- Quotes & Invoices — Generate professional PDFs

**Production**
- Printers — Live Bambu Lab printer dashboard
- Filament — Spool inventory and AMS tracking
- Parts — Consumable parts and maintenance schedule
- Models — MakerWorld and Printables browser

**Business**
- Finance — Revenue, expenses, and profit reporting
- Shipping — Canada Post rate comparison
- Marketing — Platform connections and social media

**System**
- Settings — App preferences, company config, notifications
- Users — Team account management (Owner only)

**Keyboard shortcuts** — Cmd/Ctrl + 1 through 5 jump to Dashboard, Orders, Queue, Printers, and Filament.`,
      },
    ],
  },
  {
    id: 'orders',
    icon: '📦',
    title: 'Managing Orders',
    topics: [
      {
        id: 'create-order',
        title: 'Creating a New Order',
        content: `To create a new order:

1. Go to **Orders** in the sidebar
2. Click **+ New Order** in the top right
3. Fill in the required fields:
   - **Customer Name** (required)
   - **Platform/Source** — where the order came from (Etsy, Direct, Shopify, etc.)
   - **Description** — what the customer ordered
   - **Price** — use the 🧮 calculator button to price based on filament cost, labour, and markup

4. Set the **Order Date** — defaults to now, but you can backdate it
5. Set the **Status** — defaults to "new"
6. Click **Create Order**

The order is assigned an order number automatically (starting at #1001).`,
      },
      {
        id: 'order-statuses',
        title: 'Order Status Pipeline',
        content: `Orders move through a pipeline of statuses. Update the status by clicking the dropdown in the orders table or opening the order and changing it there.

| Status | Meaning |
|--------|---------|
| **new** | Order received, not yet actioned |
| **quoted** | Price quote sent to customer |
| **confirmed** | Customer confirmed and approved |
| **printing** | Currently on the printer |
| **printed** | Print complete, not yet processed |
| **post-processing** | Sanding, painting, assembly, etc. |
| **packed** | Packaged and ready to ship |
| **shipped** | Tracking number assigned, in transit |
| **✅ Completed - Paid** | Payment received — revenue recorded |
| **cancelled** | Order cancelled |

**Important:** Revenue is only recorded when an order is marked **Completed - Paid**. Orders in any other status do not count toward your financial reports.`,
      },
      {
        id: 'historical-orders',
        title: 'Importing Historical Orders',
        content: `If you started using PrintFlow after already running your business, you can import past orders so your customer history and financial records are complete.

To add a historical order:
1. Click **+ New Order**
2. Check the **Historical order import** checkbox at the top of the form
3. Fill in the customer and order details
4. Set the **Order Date** — when the order was originally placed
5. Set the **Date Paid** — when you received payment (this is the date revenue will appear in Finance reporting)
6. Click **Create Order**

Historical orders are automatically marked as paid and appear in the Finance page under the correct month based on their payment date. They are excluded from the "Active Orders" counter on the Dashboard since they're already complete.

**Tip:** To see historical/completed orders in the Orders page, click the **Show completed (X)** toggle in the filter bar.`,
      },
      {
        id: 'backdating',
        title: 'Backdating Orders & Payment Dates',
        content: `You can backdate both when an order was placed and when it was paid. This is useful for:
- Orders you forgot to enter at the time
- Historical imports from before PrintFlow
- Correcting an entry made on the wrong date

**Order Date** — sets when the order was placed (affects the "Order Date" column and sorting). This field is always editable and defaults to the current date/time.

**Date Paid** — only appears when status is set to "Completed - Paid" or the Historical import checkbox is checked. This sets the exact date the revenue transaction is recorded. If you set this to a past month, the revenue will appear in that month's Finance report — not the current month.

This means your Finance reports always reflect actual payment dates, not entry dates.`,
      },
      {
        id: 'completed-orders',
        title: 'Viewing Completed & Past Orders',
        content: `By default, the Orders page only shows active orders (everything except Paid and Cancelled) to keep the view clean.

To see completed or cancelled orders:
- Click the **Show completed (X)** toggle in the filter bar — the number shows how many completed orders exist

You can also filter by a specific status using the status dropdown to see only "paid" or only "cancelled" orders.

Completed orders can still be opened, viewed, and their details edited if needed. Only owners can delete orders permanently.`,
      },
    ],
  },
  {
    id: 'finance',
    icon: '💰',
    title: 'Finance & Reporting',
    topics: [
      {
        id: 'how-revenue-works',
        title: 'How Revenue Is Tracked',
        content: `Revenue in PrintFlow is tracked through **transactions**, which are created automatically when an order is marked as paid. This means:

✅ **Revenue IS recorded when:**
- An order is set to "Completed - Paid" status
- A historical order is imported (transaction dated to the payment date you set)

❌ **Revenue is NOT recorded when:**
- An order is created (even with a price)
- An order is in any status other than paid (new, printing, shipped, etc.)
- An order is cancelled (any existing transaction is reversed)

This design ensures your Finance reports show actual collected revenue — not projected or potential revenue from open orders.

Expenses are added manually via the **＋ Add Entry** button on the Finance page.`,
      },
      {
        id: 'finance-views',
        title: 'Finance Report Views',
        content: `The Finance page has three views:

**Overview**
- All-time totals: revenue, expenses, profit, margin percentage
- Last 12 months bar chart (revenue vs expenses)
- Expense breakdown pie chart by category
- Full transaction ledger (most recent 100)

**Monthly**
- Pick any year and month from the droppers
- Revenue, expenses, profit, and margin for that specific month
- All transactions in that month listed below
- Export that month's transactions to CSV

**Yearly**
- Pick any year
- Full year totals at the top
- Month-by-month bar chart for the year
- Monthly summary table — click any month row to drill into it
- Export the full year's transactions to CSV

All views include a CSV export button. Transaction dates are based on the payment date, so backdated orders always appear in the correct reporting period.`,
      },
      {
        id: 'hst',
        title: 'HST / Tax Settings',
        content: `PrintFlow can automatically calculate and track HST (or any sales tax) on your income transactions.

To configure tax settings:
1. Go to **Settings**
2. Scroll to the **Company Configuration** section
3. Under **Tax & Finance**:
   - Toggle **Enable Tax (HST/GST)** on or off
   - Set your **Tax Rate** (default 13% for Ontario HST)
   - Enter your **HST / GST Number** for invoicing
   - Set your **Fiscal Year Start** month

When HST is enabled, each income transaction records both the revenue amount and the HST amount separately. When disabled, HST is recorded as $0.

**Note:** Changes to tax settings only affect new transactions going forward. Existing transactions retain the HST amount they were created with.`,
      },
      {
        id: 'manual-transactions',
        title: 'Adding Manual Transactions',
        content: `You can manually add any income or expense transaction that isn't tied to an order — supplies, shipping costs, platform fees, equipment, etc.

1. Go to **Finance**
2. Click **＋ Add Entry**
3. Set the **Date**, **Type** (income or expense), **Description**, **Category**, and **Amount**
4. Click **Add**

**Expense categories:**
- **Materials** — filament, resin, adhesives
- **Shipping** — postage, packaging
- **Fees** — Etsy fees, PayPal fees, platform commissions
- **Maintenance** — printer parts, lubricants, tools
- **Other** — anything that doesn't fit above

Manual transactions appear immediately in all Finance views under the date you entered.`,
      },
    ],
  },
  {
    id: 'printers',
    icon: '🖨️',
    title: 'Printers & Camera',
    topics: [
      {
        id: 'printer-dashboard',
        title: 'Live Printer Dashboard',
        content: `The Printers page shows a live card for each of your registered Bambu Lab printers. Each card displays:

- **Print status** — idle, printing, paused, error
- **Progress bar** — percentage complete and estimated time remaining
- **Temperatures** — nozzle and bed current vs target temperature
- **AMS trays** — which filament is loaded in each slot
- **Current file name** — what's being printed
- **Layer information** — current layer out of total layers

The dashboard connects via **LAN Mode** (direct MQTT connection on your local network) for the fastest possible updates. Bambu Cloud mode is also supported for remote monitoring.

Data refreshes automatically — no manual refresh needed.`,
      },
      {
        id: 'camera',
        title: 'Camera Feed',
        content: `Each printer card has a camera button to view the live feed. Click the camera icon (📷) on any printer card to start streaming.

**Controls:**
- **Start** — begins the MJPEG stream from the printer's built-in camera
- **Stop** — ends the stream and releases the connection
- **⊶ Popout** — opens the camera in a separate floating window so you can keep watching while using other pages
- **Frame counter** — shows frames received next to the LIVE badge

**If the camera won't connect:**
- Make sure the printer is on and connected to your network
- Check that the camera IP and access code are correct in the printer's settings (edit via the pencil icon on the card)
- The camera requires the app to be connected to your NAS server on the local network — remote Tailscale connections may not support camera streaming

**Camera settings** are configured per printer — the camera IP can be different from the printer IP if needed.`,
      },
      {
        id: 'add-printer',
        title: 'Adding & Editing Printers',
        content: `**To add a new printer:**
1. Go to **Printers**
2. Click **+ Add Printer**
3. Enter:
   - **Name** — a friendly label (e.g. "H2C Studio", "P1S Workshop")
   - **Model** — select your Bambu Lab model
   - **Serial Number** — found in the Bambu Handy app or on the printer
   - **IP Address** — your printer's local IP (check your router or Bambu app)
   - **Access Code** — the 8-character LAN access code shown on the printer's screen
4. Optionally add AMS count and camera settings
5. Click **Register Printer**

**To edit an existing printer:**
Click the pencil ✏️ icon on any printer card. You can update the IP, access code, camera settings, and AMS configuration without removing and re-adding the printer.

**Finding your access code:**
On the printer's touchscreen, go to **Settings → Network → LAN Mode Access Code**.`,
      },
    ],
  },
  {
    id: 'filament',
    icon: '🧵',
    title: 'Filament Inventory',
    topics: [
      {
        id: 'adding-spools',
        title: 'Adding Filament Spools',
        content: `**From the Bambu Lab catalogue:**
1. Go to **Filament**
2. Click the **Bambu Lab** tab (or another vendor tab)
3. Browse or search for your filament
4. Click **Add to Inventory** — the cost and specs are pre-filled from the catalogue

**Adding a custom spool:**
1. Click the **Custom** tab
2. Fill in brand, material, color, weight, and cost
3. Click **Add Spool**

**Spool details you can track:**
- Remaining grams (updated automatically via AMS sync)
- Cost per spool (used in the price calculator)
- Reorder threshold — get a low-stock alert when remaining drops below this
- Vendor and bambu tag UID for AMS matching

**AMS sync:** When your printers report AMS tray data, the filament inventory automatically updates the remaining weight for matched spools.`,
      },
      {
        id: 'price-calculator',
        title: 'Using the Price Calculator',
        content: `The price calculator helps you price orders based on real costs. Access it in the New/Edit Order form by clicking the **🧮** button next to the price field.

**Inputs:**
- **Filament Material** — selects which spools to use for cost averaging
- **Estimated Grams** — how much filament the print uses (from your slicer)
- **Labour Hours** — time spent on prep, post-processing, packing
- **Labour Rate** — your hourly rate ($/hr)
- **Post-Processing** — fixed cost for sanding, painting, assembly
- **Markup %** — profit margin percentage applied to all costs
- **Include HST** — adds 13% Ontario HST to the final price

**How costs are calculated:**
The filament cost is based on the average cost-per-gram of all spools of that material in your inventory that have a cost set. If no spools have cost data, it defaults to $25/kg.

Click **Apply $X.XX to Order** to use the calculated price.`,
      },
    ],
  },
  {
    id: 'customers',
    icon: '👥',
    title: 'Customer Management',
    topics: [
      {
        id: 'customer-profiles',
        title: 'Customer Profiles',
        content: `The Customers page automatically builds customer profiles from your order history — no manual entry required. Every customer who has placed an order appears here automatically.

**Each profile shows:**
- Total orders placed
- Total amount spent
- Average order value
- First and most recent order date
- ★ Repeat buyer badge (2+ orders)

**Click any customer** to open their detail panel on the right, showing full order history with status and amounts.

**Manual customer records** can be added via **+ Add Customer** if you want to store contact details, address, or notes before they've placed an order. Manual records merge automatically with order-derived data when orders are matched by email or name.`,
      },
      {
        id: 'customer-data',
        title: 'Storing Customer Information',
        content: `To add or edit customer contact details:

1. Click any customer in the list
2. Click **Edit Customer** (or **Save** for order-only customers)
3. You can store:
   - Full name and email
   - Phone number
   - Full mailing address (for shipping labels)
   - Tags (e.g. "vip", "wholesale", "repeat")
   - Notes (allergies, preferences, special instructions)

Tags and notes appear in the customer detail panel and can help you remember important details when fulfilling repeat orders.

Customer data is stored on your NAS server and shared across all users.`,
      },
    ],
  },
  {
    id: 'quotes',
    icon: '🧾',
    title: 'Quotes & Invoices',
    topics: [
      {
        id: 'creating-quotes',
        title: 'Creating a Quote or Invoice',
        content: `The Quotes & Invoices page generates professional PDF documents you can send to customers.

**To create a quote:**
1. Go to **Quotes & Invoices**
2. Fill in your business info (saved automatically for next time)
3. Fill in the customer details, or use **Fill from Customer** to pull from your customer database
4. Add line items — each with description, quantity, and unit price
5. Toggle HST on/off as needed
6. Click **Print / Save PDF** to generate the document

**Quote vs Invoice:**
- Use "Quote" for estimates before work begins
- Use "Invoice" for final billing after work is complete
- Change the document title in the header field

**Your business info** (name, address, HST number, email) is saved to the server so it pre-fills automatically every time you open this page.`,
      },
    ],
  },
  {
    id: 'settings',
    icon: '⚙️',
    title: 'Settings & Configuration',
    topics: [
      {
        id: 'company-settings',
        title: 'Company Configuration',
        content: `Set up your business details in **Settings → Company Configuration**. This information is used on quotes, invoices, and financial reports.

**Business Info:**
- Company name, email, phone, website
- Street address, city, province, postal code

**Tax & Finance:**
- **Enable Tax** — toggle HST/GST on or off for all new transactions
- **Tax Rate** — your applicable rate (13% for Ontario HST, 5% for federal GST only, etc.)
- **HST/GST Number** — your CRA registration number, printed on invoices
- **Fiscal Year Start** — which month your fiscal year begins (affects some report groupings)

Click **Save Company** to store your settings. They are saved to the server and shared across all users.`,
      },
      {
        id: 'notifications',
        title: 'Push Notifications (ntfy)',
        content: `PrintFlow can send push notifications to your phone when prints complete or fail, using the free **ntfy.sh** service.

**Setup:**
1. Install the **ntfy** app on your phone (iOS or Android — search "ntfy" in the app store)
2. Go to **Settings → Push Notifications** in PrintFlow
3. Enter a unique topic name (e.g. "alliston3dprints-rob") — this is your private channel
4. Subscribe to that same topic name in the ntfy app on your phone
5. Toggle **Enable push notifications** on
6. Click **Save**, then **🔔 Send Test** to verify it works

Notifications are sent when print jobs complete or encounter errors. The topic name acts as your private channel — choose something unique so others can't subscribe to it.`,
      },
      {
        id: 'server-connection',
        title: 'Server Connection & Remote Access',
        content: `PrintFlow connects to a server running on your Synology NAS. The app automatically tries your local IP first, then falls back to Tailscale for remote access.

**Local access (home network):**
Server runs at \`http://10.0.0.219:3001\` by default. This is the fast path — all features including camera streaming work over LAN.

**Remote access (Tailscale):**
Install Tailscale on your phone or laptop, join your tailnet, and the app will automatically connect via \`http://100.68.105.76:3001\`. Most features work remotely except camera streaming (which requires LAN).

**Changing the server URL:**
Settings → Server Connection → update the URL and click Save. Restart the app after changing.

**If you can't connect:**
- Make sure the NAS is on and the PrintFlow container is running (check DSM → Container Manager)
- Check that port 3001 is not blocked by your firewall
- Try manually entering the server URL in Settings`,
      },
      {
        id: 'updates',
        title: 'Keeping PrintFlow Updated',
        content: `PrintFlow checks for updates automatically when the app starts. If a new version is available, a blue banner appears in the bottom-left of the sidebar.

**To update:**
1. Click **↓ Download** in the update banner
2. The new installer downloads automatically
3. Run the installer — it replaces the old version in place
4. Reopen PrintFlow

**PrintFlow has two components that update separately:**

**The Electron app (this app)** — updates via the installer download above. Contains all the pages and UI.

**The server (on your NAS)** — updates via DSM Task Scheduler running "PrintFlow Deploy". This updates the Docker container that handles the database and API. Run this after major updates.

**Checking your version:**
Your current version is shown in the sidebar footer (e.g. v1.0.33 · owner) and on the login screen.

Check the full release notes by clicking the **ⓘ** button in the sidebar footer.`,
      },
    ],
  },
  {
    id: 'troubleshooting',
    icon: '🔧',
    title: 'Troubleshooting',
    topics: [
      {
        id: 'cant-connect',
        title: "Can't Connect to Server",
        content: `If PrintFlow shows a connection error at startup:

**1. Check the NAS is running**
Open DSM and make sure the NAS is online and responsive.

**2. Check the container is running**
In DSM → Container Manager, find the "printflow-server" container. It should show as "Running". If not, start it.

**3. Check port 3001**
Open a browser and go to \`http://10.0.0.219:3001/health\`. You should see a JSON response. If not, the server isn't responding on that port.

**4. Check your network**
If you're away from home, make sure Tailscale is connected on your device. The app will automatically try the Tailscale IP.

**5. Manually set the server URL**
If auto-detect fails, go to Settings (if you can get in) or click "Change server" on the login page to manually enter the URL.`,
      },
      {
        id: 'orders-not-showing',
        title: 'Orders Not Appearing in Finance',
        content: `If an order isn't showing up in Finance reports:

**Check the order status**
Only orders with status **"Completed - Paid"** create a financial transaction. Orders that are new, printing, shipped, etc. do not count as revenue until marked paid.

**Check the transaction date**
The revenue appears in the month of the **payment date** (Date Paid), not the order date. If you set the payment date to a past month, look in that month's Finance report.

**Check if it's historical**
Historical orders are included in Finance but appear under their payment date. Use the **Yearly** view and look at the correct year.

**No transaction was created**
This can happen if the order was created before the payment tracking feature was deployed. In this case the order exists but has no linked transaction. Contact support or check the database directly.`,
      },
      {
        id: 'camera-not-working',
        title: 'Camera Feed Not Working',
        content: `If the camera won't start or shows an error:

**1. Make sure you're on the local network**
Camera streaming requires LAN access. It will not work over Tailscale (remote connection). Make sure the app is connected via your local IP (10.0.0.x).

**2. Check the camera credentials**
Click the ✏️ pencil on the printer card → check the camera IP and access code are correct. The access code is the same 8-character code used for LAN mode.

**3. Try stopping and restarting**
Click Stop, wait a moment, then click the camera icon again. The stream will restart fresh.

**4. Check the printer is on and connected**
The camera only streams when the printer is powered on and connected to your network.

**5. Close the popout if open**
If you previously opened the popout window and it's still open, close it before trying to restart the card stream.`,
      },
      {
        id: 'printer-offline',
        title: 'Printer Shows Offline',
        content: `If a printer card shows "Offline" or won't connect:

**1. Check the printer is on**
The printer must be powered on and not in sleep mode.

**2. Verify the IP address**
Printer IPs can change if assigned by DHCP. Check the current IP on the printer's touchscreen under Settings → Network, or check your router's device list. Update it via the ✏️ edit button on the card.

**3. Check LAN Mode is enabled**
On the printer touchscreen: Settings → Network → LAN Mode must be enabled.

**4. Verify the access code**
The LAN access code is shown on the printer's screen under Settings → Network → LAN Mode Access Code. It occasionally changes.

**5. Restart the printer**
A full power cycle often resolves connection issues.`,
      },
      {
        id: 'getting-help',
        title: 'Getting Further Help',
        content: `PrintFlow is actively developed. If you encounter an issue not covered here:

**Check the Release Notes**
Click the **ⓘ** button in the sidebar footer to see the full changelog. Recent fixes may address your issue.

**Check the server logs**
The server logs at \`\\\\Synology\\printflow1\\logs\\combined.log\` contain detailed error information that can help diagnose server-side issues.

**Common log locations:**
- Server logs: \`\\\\Synology\\printflow1\\logs\\combined.log\`
- Database: \`\\\\Synology\\printflow1\\data\\printflow.db\`

**Reporting a bug:**
Note down:
1. What you were trying to do
2. What happened instead
3. Your PrintFlow version (shown in sidebar footer)
4. Any error messages shown

PrintFlow version: shown in the sidebar footer and login screen.`,
      },
    ],
  },
];

// ── Component ────────────────────────────────────────────────────────────────
export default function HelpPage() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [activeTopic, setActiveTopic]     = useState('overview');
  const [search, setSearch]               = useState('');

  // Flatten all topics for search
  const allTopics = SECTIONS.flatMap(s =>
    s.topics.map(t => ({ ...t, sectionId: s.id, sectionTitle: s.title, sectionIcon: s.icon }))
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

  // Simple markdown-like renderer
  function renderContent(text) {
    const lines = text.split('\n');
    const elements = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Table detection
      if (line.startsWith('|') && i + 1 < lines.length && lines[i+1].startsWith('|---')) {
        const headers = line.split('|').filter(c => c.trim()).map(c => c.trim());
        i += 2; // skip header and separator
        const rows = [];
        while (i < lines.length && lines[i].startsWith('|')) {
          rows.push(lines[i].split('|').filter(c => c.trim()).map(c => c.trim()));
          i++;
        }
        elements.push(
          <div key={i} style={{ overflowX:'auto', marginBottom:16 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr>{headers.map((h,j) => <th key={j} style={{ textAlign:'left', padding:'8px 12px', borderBottom:'1.5px solid var(--border)', fontWeight:600, color:'var(--text-secondary)', fontSize:11, textTransform:'uppercase', letterSpacing:'0.04em' }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((row,j) => (
                  <tr key={j} style={{ borderBottom:'0.5px solid var(--border)' }}>
                    {row.map((cell,k) => <td key={k} style={{ padding:'8px 12px', fontSize:13 }} dangerouslySetInnerHTML={{ __html: formatInline(cell) }}/>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }

      if (line.trim() === '') {
        i++;
        continue;
      }

      // Bullet points
      if (line.startsWith('- ') || line.startsWith('• ')) {
        const bullets = [];
        while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('• '))) {
          bullets.push(lines[i].replace(/^[-•] /, ''));
          i++;
        }
        elements.push(
          <ul key={i} style={{ margin:'0 0 14px 0', paddingLeft:20, listStyle:'none' }}>
            {bullets.map((b,j) => (
              <li key={j} style={{ fontSize:14, lineHeight:1.7, color:'var(--text-secondary)', position:'relative', paddingLeft:4 }}>
                <span style={{ position:'absolute', left:-16, color:'var(--accent)' }}>•</span>
                <span dangerouslySetInnerHTML={{ __html: formatInline(b) }}/>
              </li>
            ))}
          </ul>
        );
        continue;
      }

      // Regular paragraph
      elements.push(
        <p key={i} style={{ fontSize:14, lineHeight:1.75, color:'var(--text-secondary)', marginBottom:14 }}
          dangerouslySetInnerHTML={{ __html: formatInline(line) }}/>
      );
      i++;
    }

    return elements;
  }

  function formatInline(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-primary);font-weight:600">$1</strong>')
      .replace(/`(.+?)`/g, '<code style="background:var(--bg-hover);padding:1px 6px;border-radius:4px;font-family:monospace;font-size:12px;color:var(--accent)">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:var(--accent);text-decoration:none">$1</a>');
  }

  const appVersion = CHANGELOG[0]?.version || '—';

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'20px 24px 0', flexShrink:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <div>
            <h1>Help & Support</h1>
            <p style={{ color:'var(--text-secondary)', fontSize:13, marginTop:4 }}>
              PrintFlow v{appVersion} — User guide and troubleshooting
            </p>
          </div>
        </div>

        {/* Search */}
        <div style={{ position:'relative', marginBottom:16, maxWidth:420 }}>
          <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-tertiary)', fontSize:14, pointerEvents:'none' }}>🔍</span>
          <input
            className="input"
            placeholder="Search help topics..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft:36, width:'100%' }}
          />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-tertiary)', fontSize:16 }}>✕</button>
          )}
        </div>
      </div>

      {/* Search results */}
      {search.length > 1 && (
        <div style={{ padding:'0 24px', flexShrink:0 }}>
          {searchResults.length === 0 ? (
            <div style={{ padding:'16px 0', color:'var(--text-tertiary)', fontSize:13 }}>No results for "{search}"</div>
          ) : (
            <div className="card" style={{ marginBottom:16 }}>
              <div style={{ padding:'10px 16px', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-tertiary)', borderBottom:'0.5px solid var(--border)' }}>
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </div>
              {searchResults.map(t => (
                <div key={t.id} onClick={() => selectTopic(t.sectionId, t.id)}
                  style={{ padding:'12px 16px', borderBottom:'0.5px solid var(--border)', cursor:'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background=''}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{t.sectionIcon} {t.title}</div>
                  <div style={{ fontSize:11, color:'var(--text-tertiary)', marginTop:2 }}>{t.sectionTitle}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main layout */}
      {!search && (
        <div style={{ flex:1, display:'grid', gridTemplateColumns:'220px 1fr', overflow:'hidden', padding:'0 24px 24px', gap:16 }}>

          {/* Sidebar nav */}
          <div style={{ overflowY:'auto' }}>
            {SECTIONS.map(section => (
              <div key={section.id} style={{ marginBottom:4 }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-tertiary)', padding:'10px 8px 4px' }}>
                  {section.icon} {section.title}
                </div>
                {section.topics.map(topic => (
                  <div key={topic.id}
                    onClick={() => selectTopic(section.id, topic.id)}
                    style={{
                      padding:'7px 10px', borderRadius:7, cursor:'pointer', fontSize:13,
                      fontWeight: activeTopic === topic.id && activeSection === section.id ? 600 : 400,
                      background: activeTopic === topic.id && activeSection === section.id ? 'var(--accent-light)' : 'transparent',
                      color: activeTopic === topic.id && activeSection === section.id ? 'var(--accent)' : 'var(--text-secondary)',
                      marginBottom:1, transition:'all 0.1s',
                    }}
                    onMouseEnter={e => { if (!(activeTopic === topic.id && activeSection === section.id)) e.currentTarget.style.background='var(--bg-hover)'; }}
                    onMouseLeave={e => { if (!(activeTopic === topic.id && activeSection === section.id)) e.currentTarget.style.background='transparent'; }}
                  >
                    {topic.title}
                  </div>
                ))}
              </div>
            ))}

            {/* Version info at bottom */}
            <div style={{ marginTop:24, padding:'12px 10px', background:'var(--bg-hover)', borderRadius:8, fontSize:11, color:'var(--text-tertiary)', lineHeight:1.7 }}>
              <div style={{ fontWeight:600, color:'var(--text-secondary)', marginBottom:4 }}>PrintFlow v{appVersion}</div>
              <div>Running on Synology NAS</div>
              <div>Server: 10.0.0.219:3001</div>
            </div>
          </div>

          {/* Content area */}
          <div style={{ overflowY:'auto' }}>
            {currentTopic && (
              <div className="card" style={{ padding:28 }}>
                {/* Breadcrumb */}
                <div style={{ fontSize:11, color:'var(--text-tertiary)', marginBottom:8 }}>
                  {currentSection?.icon} {currentSection?.title} → {currentTopic.title}
                </div>
                <h2 style={{ fontSize:20, marginBottom:20, paddingBottom:16, borderBottom:'0.5px solid var(--border)' }}>
                  {currentTopic.title}
                </h2>
                <div>
                  {renderContent(currentTopic.content)}
                </div>

                {/* Next topic navigation */}
                <div style={{ marginTop:32, paddingTop:16, borderTop:'0.5px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  {(() => {
                    const allTopicsFlat = SECTIONS.flatMap(s => s.topics.map(t => ({ ...t, sectionId: s.id })));
                    const currentIdx = allTopicsFlat.findIndex(t => t.id === activeTopic && t.sectionId === activeSection);
                    const prev = allTopicsFlat[currentIdx - 1];
                    const next = allTopicsFlat[currentIdx + 1];
                    return (
                      <>
                        {prev ? (
                          <button className="btn btn-ghost btn-sm" onClick={() => selectTopic(prev.sectionId, prev.id)}
                            style={{ fontSize:12 }}>
                            ← {prev.title}
                          </button>
                        ) : <div/>}
                        {next ? (
                          <button className="btn btn-secondary btn-sm" onClick={() => selectTopic(next.sectionId, next.id)}
                            style={{ fontSize:12 }}>
                            {next.title} →
                          </button>
                        ) : <div/>}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
