# Smart Productivity Assistant

A powerful Chrome extension that helps you track time spent on websites, set daily limits, and stay focused by reducing distractions.

## Features ✨

### 1. **🔌 Extension ON/OFF Toggle**
- **Master Control Switch** - Easily enable or disable all extension features
- Located prominently in the header with visual status indicator
- When OFF:
  - ❌ Time tracking completely stopped
  - ❌ All website blocking disabled
  - ❌ Limits checking paused
- When ON:
  - ✅ Time tracking active
  - ✅ Blocked websites restricted
  - ✅ Limits enforced
- Instant notifications when toggling
- State persists across browser sessions

### 2. **🚫 Enhanced Website Blocking System**
- **Complete Site Blocking** - Permanently block distracting websites
- **Instant Blocking** - Sites are blocked immediately upon addition
- **Smart URL Handling** - Automatically cleans domains (removes http://, www., etc.)
- **Cannot Be Bypassed** - Blocked pages show custom block screen
- **Professional Block Page** with:
  - Clear blocked status message
  - Domain name display
  - Helpful unblock instructions
  - Prevents all navigation attempts
- **Automatic Detection** - Checks all tabs every 5 seconds
- **Real-time Updates** - Newly opened tabs are immediately checked
- Works even if page is already loading

### 3. **Time Tracking**
- Automatically tracks time spent on every website you visit
- Real-time activity monitoring
- Daily statistics and insights
- Visual breakdown of your browsing habits
- Respects extension ON/OFF toggle

### 4. **Daily Limits**
- Set custom time limits for any website (in minutes)
- Visual progress bars showing usage vs. limits
- Automatic notifications when approaching limits
- Sites are blocked once limits are reached
- Color-coded progress (green → yellow → red)

### 5. **Smart Notifications**
- Get notified when approaching time limits
- Customizable warning threshold (50-100%)
- Limit reached notifications
- Extension state change alerts
- Site block/unblock confirmations
- Toggle notifications on/off

### 6. **Settings & Customization**
- Enable/disable time tracking
- Enable/disable notifications
- Adjust warning threshold percentage
- Reset all data option
- Clean and intuitive interface
- Beautiful cream and navy color scheme

## Installation

### Method 1: Load Unpacked Extension (Development Mode)

1. **Download the Extension**
   - Download and extract the "Smart Productivity Assistant" folder to your computer

2. **Open Chrome Extensions Page**
   - Open Google Chrome
   - Navigate to `chrome://extensions/`
   - Or click the three dots menu → More Tools → Extensions

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

4. **Load the Extension**
   - Click "Load unpacked"
   - Select the "Smart Productivity Assistant" folder
   - The extension icon should appear in your toolbar

5. **Pin the Extension (Optional)**
   - Click the puzzle piece icon in Chrome toolbar
   - Find "Smart Productivity Assistant"
   - Click the pin icon to keep it visible

## How to Use 📖

### 🔌 Extension ON/OFF Toggle
- **Location**: Top-right corner of the extension popup (header)
- **Toggle ON** (green switch):
  - Time tracking active
  - Blocked sites restricted
  - Limits enforced
- **Toggle OFF** (gray switch):
  - All features paused
  - No tracking or blocking
  - Complete freedom to browse
- **Use Case**: Temporarily disable during personal browsing without losing your settings

### Dashboard Tab
- **View Today's Activity**: See total time spent browsing today
- **Top Sites**: View your most visited sites with time breakdowns and percentages
- **Refresh Data**: Click the refresh button to update statistics in real-time

### Limits Tab
**Set Time Limits:**
1. Enter a website domain (e.g., `youtube.com`, `twitter.com`)
2. Set time limit in minutes (e.g., `30` for 30 minutes)
3. Click "Add Limit"
4. View all active limits with real-time progress bars
5. Progress bars change color: Green → Yellow (90%) → Red (100%)
6. Remove limits by clicking the "Remove" button

### Blocked Sites Tab
**Block Websites Completely:**
1. Enter a website URL or domain (e.g., `facebook.com` or `https://facebook.com`)
   - Extension automatically cleans the URL
   - Removes http://, https://, www., and trailing slashes
2. Click "Block Site" (red button)
3. **Instant Effect**:
   - All tabs with that domain are immediately blocked
   - Any attempts to visit will show block page
   - Cannot be bypassed while extension is ON
4. **Block Page Shows**:
   - Clear "Website Blocked" message
   - Blocked domain name
   - Instructions to unblock
5. **To Unblock**:
   - Click "Unblock" button in the Blocked Sites tab
   - Confirm the action
   - All tabs with that domain automatically refresh

**Tips for Blocking:**
- Enter just the domain (e.g., `reddit.com`, not `www.reddit.com/r/all`)
- Works with any URL format - extension cleans it automatically
- Blocked sites are checked every 5 seconds
- New tabs are checked immediately upon opening

### Settings ⚙️
- **Enable Notifications**: Toggle browser notifications on/off
- **Enable Time Tracking**: Toggle time tracking on/off (even when extension is ON)
- **Warning Threshold**: Set when to receive warnings (50-100%)
- **Reset All Data**: Clear all tracked data, limits, and blocked sites

## Tips for Maximum Productivity 💡

1. **Use the ON/OFF Toggle**: Turn off the extension when browsing personally, turn it ON during work hours
2. **Block First, Limit Later**: Start by blocking highly distracting sites, then add limits to others
3. **Start Small**: Begin with 1-2 sites you want to block or limit
4. **Realistic Limits**: Set achievable daily limits (e.g., 30-60 minutes for semi-productive sites)
5. **Block Permanently**: Use complete blocking for sites that offer zero value
6. **Review Daily**: Check your dashboard each day to understand your habits
7. **Adjust as Needed**: Modify limits and blocks based on your actual needs
8. **Work Mode**: Turn ON the extension during work/study time for maximum focus
9. **Break Time**: Turn OFF briefly during lunch or breaks if needed
10. **Clean URLs**: When blocking, just enter the domain name - the extension handles the rest

## Technical Details

### File Structure
```
Smart Productivity Assistant/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for tracking
├── content.js            # Content script for blocking pages
├── popup.html            # Extension popup interface
├── popup.css             # Popup styles
├── popup.js              # Popup functionality
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # This file
```

### Technologies Used
- **Manifest V3**: Latest Chrome extension standard
- **Chrome Storage API**: For data persistence
- **Chrome Alarms API**: For daily resets and periodic saves
- **Chrome Tabs API**: For tracking active tabs
- **Chrome Notifications API**: For user alerts

### Data Storage
- All data is stored locally using Chrome's Storage API
- No data is sent to external servers
- Privacy-focused: Your browsing data stays on your device
- Daily automatic reset at midnight

### Permissions Explained
- **tabs**: To track which websites you're visiting and manage blocked sites
- **storage**: To save your time data, limits, blocked sites, and settings
- **alarms**: To reset data daily, save periodically, and check blocked sites
- **notifications**: To send you limit warnings, toggle alerts, and block notifications
- **scripting**: To inject content scripts for blocking pages dynamically
- **host_permissions**: To monitor all websites for tracking and blocking

## Troubleshooting 🔍

### Extension Not Tracking Time
1. Check if extension toggle is ON (green switch in header)
2. Make sure "Enable Time Tracking" is checked in Settings
3. Refresh the extension by toggling it off and on in `chrome://extensions/`
4. Check that you're visiting actual websites (not chrome:// pages)

### Website Not Being Blocked
1. **Verify extension is ON**: Check the toggle switch in the header (should be green)
2. **Check domain format**: Make sure you entered just the domain (e.g., `youtube.com`)
3. **Wait 5 seconds**: Automatic block check runs every 5 seconds
4. **Refresh the page**: Try refreshing the blocked website
5. **Check for wildcards**: Enter the exact domain you want to block
6. **Try again**: Remove and re-add the site to the blocked list

### Block Page Not Showing
1. Verify the extension toggle is ON
2. Refresh the blocked website's tab
3. Close and reopen the tab
4. Make sure the domain matches exactly (check in blocked sites list)
5. Try reloading the extension in `chrome://extensions/`

### Extension Toggle Not Working
1. Click the toggle switch (not the text)
2. Wait for the notification confirming the state change
3. Refresh any open tabs to apply the new state
4. Check Chrome's notification permissions

### Sites Still Accessible After Blocking
1. Make sure extension toggle is ON (green)
2. Check if the site is actually in your blocked list
3. Try closing all tabs of that site and reopening
4. Reload the extension in `chrome://extensions/`
5. Make sure you entered the correct domain

### Notifications Not Working
1. Check "Enable Notifications" in Settings
2. Ensure Chrome has permission to show notifications
3. Check your system notification settings

### Data Not Saving
1. Check Chrome's storage quota isn't full
2. Try resetting data in Settings
3. Reload the extension

## Privacy & Security

- **100% Local**: All data stored locally on your device
- **No Tracking**: We don't track or collect any user data
- **No Ads**: Completely ad-free experience
- **Open Source**: Code is transparent and reviewable
- **Secure**: Uses Chrome's built-in security features

## Version History

### Version 1.0.0 (Current)
- Initial release
- Time tracking for all websites
- Daily time limits with progress tracking
- Complete website blocking
- Notifications system
- Settings and customization
- Daily automatic reset

## Support & Feedback

If you encounter any issues or have suggestions:
1. Check the Troubleshooting section above
2. Review your settings and permissions
3. Try reloading the extension

## Future Enhancements

Potential features for future versions:
- Weekly and monthly statistics
- Export data to CSV
- Custom blocking schedules
- Focus mode with Pomodoro timer
- Productivity score and insights
- Category-based tracking
- Import/export settings

## License

This extension is provided as-is for personal use.

---

**Made with ❤️ for better productivity and focus**

Stay productive!
