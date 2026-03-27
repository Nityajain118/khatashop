# AccountsGroupList Widget — Usage Guide

## Overview
Production-ready vanilla JavaScript component for displaying accounts with search, grouping by city, and expand/collapse functionality.

## Features ✅
- **Search** with 300ms debounce (name + phone, case-insensitive)
- **Filter → Group → Slice** data flow (order preserved)
- **Dynamic grouping** by city ("Unknown" fallback)
- **Per-city expand/collapse** state
- **Show first 3 initially**, expand to show all
- **Auto-expand all cities** when searching
- **Restore previous state** when search cleared
- **Edge case handling** (empty accounts, missing fields)
- **Mobile-friendly** design

---

## Installation

The widget is already integrated:
- **JavaScript**: `/js/widgets/accountsGroupList.js`
- **CSS**: Styles added to `/css/theme.css`
- **HTML**: Script tag added to `index.html`

---

## Usage

### 1. Initialize with Data
```javascript
const accountsData = [
  { id: '1', name: 'Raj Patel', phone: '9876543210', city: 'Mumbai' },
  { id: '2', name: 'Priya Singh', phone: '9876543211', city: 'Delhi' },
  { id: '3', name: 'Amit Kumar', phone: '9876543212', city: 'Mumbai' },
  // ... more accounts
];

// Initialize the widget
AccountsGroupList.init('containerId', accountsData);
```

### 2. Create Container in HTML
```html
<div id="accountsList"></div>
```

### 3. Update Data
```javascript
AccountsGroupList.update(newAccountsArray);
```

---

## Data Structure

Each account object should have:
```javascript
{
  id:    string,          // unique identifier
  name:  string,          // customer name
  phone: string|number,   // phone number (optional)
  city:  string           // city name (optional, defaults to "Unknown")
}
```

---

## Features in Action

### Search & Filter
- Type in search box to filter by name or phone
- Automatically expands all cities
- Debounced for performance (300ms)

### Expand/Collapse
- Click city header to toggle expansion
- Shows first 3 accounts when collapsed
- Shows all when expanded
- "Showing 3 of X" indicator appears

### State Management
- Maintains separate expand/collapse state per city
- Saves previous state before search
- Restores state when search is cleared
- No data loss or hidden results

---

## Customization

### Styling (in `/css/theme.css`)
- `.accounts-search-input` — search bar styling
- `.accounts-city-header` — city group header
- `.accounts-item` — individual account item
- Inherits theme variables (gold, dark/light mode)

### JavaScript (in `/js/widgets/accountsGroupList.js`)
- Debounce timer: `300` (edit `setTimeout(..., 300)`)
- Initial slice limit: `3` (edit `.slice(0, 3)`)
- Animation delay: `0.06s` per item

---

## Example Implementation in a Screen

```javascript
// In js/screens/customers.js or similar
const CustomersScreen = (() => {

  function render() {
    const container = document.getElementById('screenContainer');
    container.innerHTML = `
      <div class="screen">
        <h1>Customer Accounts</h1>
        <div id="accountsList"></div>
      </div>
    `;

    // Fetch data
    const accounts = DB.getAllAccounts(); // or similar method

    // Initialize widget
    AccountsGroupList.init('accountsList', accounts);
  }

  return { render };
})();
```

---

## Performance Notes

✅ **Optimized for:**
- Debounced search (no re-render on every keystroke)
- Efficient DOM generation
- No unnecessary loops or calculations
- HTML escaping prevents XSS
- Smooth animations with CSS

---

## Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ JavaScript
- CSS3 animations & transitions

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Widget not showing | Verify container ID matches `accountsGroupList('id', data)` |
| No styling | Ensure `css/theme.css` is loaded |
| Search not working | Check console for errors; verify `city` field exists |
| State resets unexpectedly | Ensure data structure has all required fields |

---

## License
Part of Tithi Ledger Pro
