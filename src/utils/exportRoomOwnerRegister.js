// Excel Export Utility for Nivasi Space Admin Dashboard
// Exports Room Owner Register in professional tabular format inspired by institutional registers.

import { isSubscriptionActive } from './subscriptionConfig.js';

/**
 * Extract owner name intelligently from room fields or title
 */
export function extractOwnerName(room) {
  if (room.ownerName && typeof room.ownerName === 'string' && room.ownerName.trim() && room.ownerName !== 'null' && room.ownerName !== 'undefined') {
    return room.ownerName.trim();
  }
  if (room.owner && typeof room.owner === 'string' && room.owner.trim()) {
    return room.owner.trim();
  }
  if (room.contactPerson && typeof room.contactPerson === 'string' && room.contactPerson.trim()) {
    return room.contactPerson.trim();
  }

  // Attempt to extract owner name from title (e.g. "Mulla's 1RK", "Sangita Gavde's Single Room")
  const title = (room.title || '').trim();
  const match = title.match(/^(.+?)(?:'s|’s|s')\s+/i);
  if (match && match[1]) {
    const candidate = match[1].trim();
    // Verify it's not a generic word like "Student's" or "Boys'"
    if (!/^(student|boys?|girls?|ladies|gents)$/i.test(candidate)) {
      return candidate;
    }
  }

  // If title itself is a person's name or house name
  if (room.ownerEmail) {
    return room.ownerEmail.split('@')[0];
  }

  return 'N/A';
}

/**
 * Format mobile number cleanly as string
 */
export function formatMobile(room) {
  const raw = room.ownerPhone || room.contact || room.phone || '';
  if (!raw) return 'N/A';
  return String(raw).trim();
}

/**
 * Format address cleanly
 */
export function formatAddress(room) {
  const parts = [];
  if (room.address && room.address.trim()) parts.push(room.address.trim());
  if (room.location && room.location.trim() && !parts.some(p => p.toLowerCase().includes(room.location.trim().toLowerCase()))) {
    parts.push(room.location.trim());
  }
  if (room.city && room.city.trim() && !parts.some(p => p.toLowerCase().includes(room.city.trim().toLowerCase()))) {
    parts.push(room.city.trim());
  }
  return parts.length > 0 ? parts.join(', ') : 'N/A';
}

/**
 * Normalize gender display
 */
export function formatGender(gender) {
  if (!gender) return 'N/A';
  const g = String(gender).toLowerCase().trim();
  if (g === 'boy' || g === 'boys' || g === 'male') return 'Boys';
  if (g === 'girl' || g === 'girls' || g === 'female') return 'Girls';
  if (g === 'both' || g === 'coed' || g === 'any') return 'Boys / Girls';
  return gender.charAt(0).toUpperCase() + gender.slice(1);
}

/**
 * Extract or compute Vacancy
 */
export function extractVacancy(room) {
  if (room.vacancy != null && room.vacancy !== '' && !isNaN(Number(room.vacancy))) {
    return Number(room.vacancy);
  }
  if (room.vacancies != null && room.vacancies !== '' && !isNaN(Number(room.vacancies))) {
    return Number(room.vacancies);
  }
  if (room.availableRooms != null && room.availableRooms !== '' && !isNaN(Number(room.availableRooms))) {
    return Number(room.availableRooms);
  }

  // Parse from note or description (e.g. "2 Students are required", "1 girl is needed", "3 boys is required")
  const text = `${room.note || ''} ${room.description || ''}`;
  const match = text.match(/(?:(\d+)\s*(?:\/\s*\d+\s*)?(?:students?|boys?|girls?|persons?|people|cots?)\s*(?:are|is)?\s*(?:required|needed|vacant|can stay))/i)
    || text.match(/(?:(\d+)\s*(?:vacancy|vacancies)\b)/i);
  if (match && match[1]) {
    return Number(match[1]);
  }

  return 'N/A';
}

/**
 * Extract or compute Occupied
 */
export function extractOccupied(room, totalRooms, vacancy) {
  if (room.occupied != null && room.occupied !== '' && !isNaN(Number(room.occupied))) {
    return Number(room.occupied);
  }
  if (room.occupiedRooms != null && room.occupiedRooms !== '' && !isNaN(Number(room.occupiedRooms))) {
    return Number(room.occupiedRooms);
  }

  // Check capacity pattern in text
  const text = `${room.note || ''} ${room.description || ''}`;
  const capMatch = text.match(/total\s*(?:capacity|students?|cots?)\s*(?:is|:)?\s*(\d+)/i);
  if (capMatch && capMatch[1] && typeof vacancy === 'number') {
    const cap = Number(capMatch[1]);
    if (cap >= vacancy) return cap - vacancy;
  }

  if (typeof totalRooms === 'number' && typeof vacancy === 'number' && totalRooms >= vacancy) {
    return totalRooms - vacancy;
  }

  return 'N/A';
}

/**
 * Check if a service feature is available in room features
 */
export function checkFeature(room, regex) {
  if (!room.features) return 'N/A';
  const features = Array.isArray(room.features)
    ? room.features
    : String(room.features).split(/[,|\n]/);

  const found = features.some(f => regex.test(String(f).trim()));
  return found ? 'Yes' : 'No';
}

/**
 * Verification status formatting
 */
export function formatVerificationStatus(room) {
  if (room.verificationStatus === 'verified' || room.isVerified === true) return 'Verified';
  if (room.verificationStatus === 'rejected') return 'Rejected';
  if (room.verificationStatus === 'pending') return 'Pending';
  return 'Pending';
}

/**
 * Subscription status formatting
 */
export function formatSubscriptionStatus(room) {
  if (room.subscriptionStatus === 'active') {
    if (room.subscriptionEnd && !isSubscriptionActive(room.subscriptionEnd)) {
      return 'Expired';
    }
    return 'Active';
  }
  if (room.paymentStatus === 'paid') {
    if (room.subscriptionEnd && !isSubscriptionActive(room.subscriptionEnd)) {
      return 'Expired';
    }
    return 'Active';
  }
  if (room.paymentStatus === 'pending' || room.subscriptionStatus === 'pending') {
    return 'Pending';
  }
  if (room.paymentStatus === 'expired' || room.subscriptionStatus === 'expired') {
    return 'Expired';
  }
  if (room.addedByAdmin || room.isPublished) {
    return 'Active (Platform)';
  }
  return 'N/A';
}

/**
 * Compute aggregate register metrics for summary
 */
export function computeRegisterMetrics(roomRows) {
  let totalProperties = roomRows.length;
  let totalRooms = 0;
  let totalVacancies = 0;
  let totalOccupied = 0;
  let verifiedProperties = 0;
  let pendingVerification = 0;
  let activeSubscriptions = 0;
  let pendingSubscriptions = 0;
  let expiredSubscriptions = 0;
  let cctvAvailable = 0;
  let wifiAvailable = 0;
  let hotWaterAvailable = 0;
  let bedAvailable = 0;

  roomRows.forEach(row => {
    if (typeof row.totalRooms === 'number') totalRooms += row.totalRooms;
    if (typeof row.vacancy === 'number') totalVacancies += row.vacancy;
    if (typeof row.occupied === 'number') totalOccupied += row.occupied;

    if (row.verificationStatus === 'Verified') verifiedProperties++;
    else if (row.verificationStatus === 'Pending') pendingVerification++;

    if (row.subscriptionStatus === 'Active' || row.subscriptionStatus === 'Active (Platform)') activeSubscriptions++;
    else if (row.subscriptionStatus === 'Pending') pendingSubscriptions++;
    else if (row.subscriptionStatus === 'Expired') expiredSubscriptions++;

    if (row.cctv === 'Yes') cctvAvailable++;
    if (row.wifi === 'Yes') wifiAvailable++;
    if (row.hotWater === 'Yes') hotWaterAvailable++;
    if (row.bed === 'Yes') bedAvailable++;
  });

  return {
    totalProperties,
    totalRooms,
    totalVacancies,
    totalOccupied,
    verifiedProperties,
    pendingVerification,
    activeSubscriptions,
    pendingSubscriptions,
    expiredSubscriptions,
    cctvAvailable,
    wifiAvailable,
    hotWaterAvailable,
    bedAvailable
  };
}

/**
 * Generate and download professional Excel Workbook for Room Owner Register
 *
 * @param {Array} rooms - Array of room records matching the scope
 * @param {Object} options - Scope and filter details
 * @param {string} options.collegeName - Current college scope name
 * @param {string} options.cityName - City name
 * @param {string} options.filterLabel - Active filter label (e.g. 'All Scope Records', 'Filtered (32)')
/**
 * Robust loader for ExcelJS in browser / Vite environments
 * Handles Vite dev pre-bundling cache invalidation (504 Outdated Optimize Dep) gracefully
 */
async function loadExcelJS() {
  if (typeof window !== 'undefined' && window.ExcelJS && (window.ExcelJS.Workbook || typeof window.ExcelJS === 'function')) {
    return window.ExcelJS;
  }

  try {
    const mod = await import('exceljs');
    const ExcelJS = mod.default || mod;
    if (ExcelJS && (ExcelJS.Workbook || typeof ExcelJS === 'function')) {
      return ExcelJS;
    }
  } catch (err) {
    console.warn('Local exceljs module load failed (likely Vite 504 outdated cache). Falling back to CDN script:', err);
  }

  // Graceful fallback for browser dev server with outdated optimize cache
  if (typeof window !== 'undefined') {
    if (window.ExcelJS && window.ExcelJS.Workbook) return window.ExcelJS;

    await new Promise((resolve, reject) => {
      // Check if script already injected
      const existing = document.querySelector('script[src*="exceljs"]');
      if (existing && window.ExcelJS) {
        resolve(window.ExcelJS);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
      script.async = true;
      script.onload = () => {
        if (window.ExcelJS) {
          resolve(window.ExcelJS);
        } else {
          reject(new Error('ExcelJS loaded but object not found on window'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load ExcelJS library. Please check your network connection.'));
      document.head.appendChild(script);
    });

    if (window.ExcelJS) return window.ExcelJS;
  }

  throw new Error('Failed to initialize Excel export engine. Please refresh the page or ensure network connectivity.');
}

export async function exportRoomOwnerRegister(rooms, options = {}) {
  if (!rooms || rooms.length === 0) {
    throw new Error('No room records available to export.');
  }

  // Load ExcelJS engine with browser fallback
  const ExcelJS = await loadExcelJS();

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Nivasi Space Admin Portal';
  workbook.lastModifiedBy = 'Nivasi Admin';
  workbook.created = new Date();
  workbook.modified = new Date();

  const collegeName = options.collegeName || 'All Colleges Scope';
  const cityName = options.cityName || 'Kolhapur';
  const exportDate = new Date();
  const dateFormatted = exportDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const timeFormatted = exportDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  // Prepare normalized row objects
  const rowData = rooms.map((room, index) => {
    const totalRooms = Number(room.roomCount) || Number(room.totalRooms) || 1;
    const vacancy = extractVacancy(room);
    const occupied = extractOccupied(room, totalRooms, vacancy);

    return {
      srNo: index + 1,
      ownerName: extractOwnerName(room),
      ownerMobile: formatMobile(room),
      ownerAddress: formatAddress(room),
      propertyName: room.title || room.name || 'N/A',
      roomType: room.roomType || room.rooms || '1 RK',
      gender: formatGender(room.gender),
      rent: Number(room.rent) || 0,
      totalRooms,
      vacancy,
      occupied,
      cctv: checkFeature(room, /cctv|camera|security\s*camera/i),
      wifi: checkFeature(room, /wi-?fi|internet|broadband/i),
      hotWater: checkFeature(room, /hot\s*water|geyser|gas\s*geyser|solar/i),
      bed: checkFeature(room, /\bbed\b|beds|mattress|cot\b/i),
      verificationStatus: formatVerificationStatus(room),
      subscriptionStatus: formatSubscriptionStatus(room)
    };
  });

  const metrics = computeRegisterMetrics(rowData);

  // -------------------------------------------------------------
  // SHEET 1: Room Owner Register (Reference PDF Inspired Tabular Register)
  // -------------------------------------------------------------
  const ws = workbook.addWorksheet('Room Owner Register', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 6 }]
  });

  // Columns definition (exact 17 columns in exact specified order)
  ws.columns = [
    { key: 'srNo', width: 8 },                // 1. Sr. No.
    { key: 'ownerName', width: 22 },           // 2. Owner Name
    { key: 'ownerMobile', width: 18 },         // 3. Owner Mobile No.
    { key: 'ownerAddress', width: 30 },        // 4. Owner Address
    { key: 'propertyName', width: 28 },        // 5. Room Name / Property Name
    { key: 'roomType', width: 14 },            // 6. Room Type
    { key: 'gender', width: 12 },              // 7. Gender
    { key: 'rent', width: 14 },                // 8. Rent
    { key: 'totalRooms', width: 13 },          // 9. Total Rooms
    { key: 'vacancy', width: 12 },             // 10. Vacancy
    { key: 'occupied', width: 12 },            // 11. Occupied
    { key: 'cctv', width: 10 },                // 12. CCTV
    { key: 'wifi', width: 10 },                // 13. WiFi
    { key: 'hotWater', width: 13 },            // 14. Hot Water
    { key: 'bed', width: 10 },                 // 15. Bed
    { key: 'verificationStatus', width: 20 },  // 16. Verification Status
    { key: 'subscriptionStatus', width: 20 }   // 17. Subscription Status
  ];

  // Title Block (Rows 1 to 4)
  ws.mergeCells('A1:Q1');
  const titleRow1 = ws.getCell('A1');
  titleRow1.value = 'NIVASI SPACE';
  titleRow1.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FFC2410C' } }; // Orange Nivasi accent
  titleRow1.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  ws.mergeCells('A2:Q2');
  const titleRow2 = ws.getCell('A2');
  titleRow2.value = 'ROOM OWNER REGISTER';
  titleRow2.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FF1F2937' } };
  titleRow2.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 22;

  ws.mergeCells('A3:Q3');
  const titleRow3 = ws.getCell('A3');
  titleRow3.value = collegeName ? `${collegeName} (${cityName})` : 'All Admin Scope';
  titleRow3.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF4B5563' } };
  titleRow3.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(3).height = 20;

  ws.mergeCells('A4:Q4');
  const titleRow4 = ws.getCell('A4');
  titleRow4.value = `Export Date: ${dateFormatted} ${timeFormatted}   |   Total Properties: ${rowData.length}   |   ${options.filterLabel || 'All Scope Records'}`;
  titleRow4.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF6B7280' } };
  titleRow4.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(4).height = 18;

  // Empty separator row
  ws.getRow(5).height = 8;

  // Table Column Headers (Row 6)
  const headers = [
    'Sr. No.',
    'Owner Name',
    'Owner Mobile No.',
    'Owner Address',
    'Room Name / Property Name',
    'Room Type',
    'Gender',
    'Rent (₹)',
    'Total Rooms',
    'Vacancy',
    'Occupied',
    'CCTV',
    'WiFi',
    'Hot Water',
    'Bed',
    'Verification Status',
    'Subscription Status'
  ];

  const headerRow = ws.getRow(6);
  headerRow.height = 32;

  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FF9CA3AF' } },
    left: { style: 'thin', color: { argb: 'FF9CA3AF' } },
    bottom: { style: 'medium', color: { argb: 'FF4B5563' } },
    right: { style: 'thin', color: { argb: 'FF9CA3AF' } }
  };

  headers.forEach((hdr, idx) => {
    const colNum = idx + 1;
    const cell = headerRow.getCell(colNum);
    cell.value = hdr;
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF111827' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' } // Clean grey fill like reference register
    };
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true
    };
    cell.border = thinBorder;
  });

  // Table Data Rows
  const contentBorder = {
    top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
  };

  const startRow = 7;
  rowData.forEach((item, idx) => {
    const rowNum = startRow + idx;
    const row = ws.getRow(rowNum);
    row.height = 22;

    const isEven = idx % 2 === 1;
    const bgFill = isEven ? {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF9FAFB' } // Very subtle alternating row
    } : undefined;

    const values = [
      item.srNo,
      item.ownerName,
      item.ownerMobile,
      item.ownerAddress,
      item.propertyName,
      item.roomType,
      item.gender,
      item.rent,
      item.totalRooms,
      item.vacancy,
      item.occupied,
      item.cctv,
      item.wifi,
      item.hotWater,
      item.bed,
      item.verificationStatus,
      item.subscriptionStatus
    ];

    values.forEach((val, vIdx) => {
      const cell = row.getCell(vIdx + 1);
      cell.value = val;
      cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF1F2937' } };
      cell.border = contentBorder;
      if (bgFill) cell.fill = bgFill;

      // Alignments & formats per column type
      switch (vIdx + 1) {
        case 1: // Sr. No.
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          break;
        case 2: // Owner Name
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF111827' } };
          break;
        case 3: // Mobile No. (stored as text)
          cell.numFmt = '@';
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          break;
        case 4: // Address
          cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
          break;
        case 5: // Property Name
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
          break;
        case 6: // Room Type
        case 7: // Gender
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          break;
        case 8: // Rent
          cell.numFmt = '₹#,##0';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF111827' } };
          break;
        case 9: // Total Rooms
          cell.numFmt = '#,##0';
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          break;
        case 10: // Vacancy
        case 11: // Occupied
          if (typeof val === 'number') {
            cell.numFmt = '#,##0';
          }
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          break;
        case 12: // CCTV
        case 13: // WiFi
        case 14: // Hot Water
        case 15: // Bed
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          if (val === 'Yes') {
            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF065F46' } }; // Dark green
          }
          break;
        case 16: // Verification Status
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          if (val === 'Verified') {
            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF047857' } };
          } else if (val === 'Pending') {
            cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FFB45309' } };
          } else if (val === 'Rejected') {
            cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FFB91C1C' } };
          }
          break;
        case 17: // Subscription Status
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          if (val === 'Active' || val === 'Active (Platform)') {
            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF047857' } };
          } else if (val === 'Pending') {
            cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FFB45309' } };
          } else if (val === 'Expired') {
            cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FFB91C1C' } };
          }
          break;
        default:
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    });
  });

  const lastDataRow = startRow + rowData.length - 1;

  // Totals Row at the bottom of main register
  const totalsRowNum = lastDataRow + 1;
  const totalsRow = ws.getRow(totalsRowNum);
  totalsRow.height = 24;

  const totalBorder = {
    top: { style: 'medium', color: { argb: 'FF4B5563' } },
    left: { style: 'thin', color: { argb: 'FF9CA3AF' } },
    bottom: { style: 'double', color: { argb: 'FF111827' } },
    right: { style: 'thin', color: { argb: 'FF9CA3AF' } }
  };

  for (let c = 1; c <= 17; c++) {
    const cell = totalsRow.getCell(c);
    cell.border = totalBorder;
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' }
    };
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF111827' } };
  }

  // Set totals labels and formulas
  totalsRow.getCell(1).value = '';
  totalsRow.getCell(2).value = 'TOTALS / REGISTER SUMMARY';
  totalsRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };

  // Rent average
  const rentCell = totalsRow.getCell(8);
  rentCell.value = { formula: `AVERAGE(H${startRow}:H${lastDataRow})` };
  rentCell.numFmt = '₹#,##0';
  rentCell.alignment = { horizontal: 'right', vertical: 'middle' };

  // Total Rooms
  const totalRoomsCell = totalsRow.getCell(9);
  totalRoomsCell.value = { formula: `SUM(I${startRow}:I${lastDataRow})` };
  totalRoomsCell.numFmt = '#,##0';
  totalRoomsCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Vacancy Sum
  const vacancyCell = totalsRow.getCell(10);
  vacancyCell.value = metrics.totalVacancies;
  vacancyCell.numFmt = '#,##0';
  vacancyCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Occupied Sum
  const occupiedCell = totalsRow.getCell(11);
  occupiedCell.value = metrics.totalOccupied;
  occupiedCell.numFmt = '#,##0';
  occupiedCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // AutoFilter across all 17 columns on Row 6
  ws.autoFilter = {
    from: { row: 6, column: 1 },
    to: { row: 6, column: 17 }
  };

  // Landscape Print Configuration & Repeat Header on every printed page
  ws.pageSetup = {
    orientation: 'landscape',
    paperSize: 9, // A4
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0, // Unconstrained height allows multi-page vertical flow
    printTitlesRow: '6:6', // Repeat header row 6 on every page
    printArea: `A1:Q${totalsRowNum}`,
    margins: {
      left: 0.3,
      right: 0.3,
      top: 0.5,
      bottom: 0.5,
      header: 0.2,
      footer: 0.2
    }
  };

  // -------------------------------------------------------------
  // SHEET 2: Dedicated Summary Sheet
  // -------------------------------------------------------------
  const summaryWs = workbook.addWorksheet('Summary');
  summaryWs.columns = [
    { key: 'metric', width: 35 },
    { key: 'value', width: 20 },
    { key: 'notes', width: 30 }
  ];

  summaryWs.mergeCells('A1:C1');
  const sumTitle1 = summaryWs.getCell('A1');
  sumTitle1.value = 'NIVASI SPACE - REGISTER SUMMARY';
  sumTitle1.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFC2410C' } };
  sumTitle1.alignment = { horizontal: 'center', vertical: 'middle' };
  summaryWs.getRow(1).height = 26;

  summaryWs.mergeCells('A2:C2');
  const sumTitle2 = summaryWs.getCell('A2');
  sumTitle2.value = `${collegeName} (${cityName}) — Generated on ${dateFormatted} ${timeFormatted}`;
  sumTitle2.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF4B5563' } };
  sumTitle2.alignment = { horizontal: 'center', vertical: 'middle' };
  summaryWs.getRow(2).height = 20;

  summaryWs.getRow(3).height = 10;

  // Header for Summary Table
  const sumHdr = summaryWs.getRow(4);
  sumHdr.height = 26;
  ['Register Metric', 'Count / Value', 'Scope / Status'].forEach((h, i) => {
    const cell = sumHdr.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF111827' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' }
    };
    cell.border = thinBorder;
    cell.alignment = { horizontal: i === 1 ? 'center' : 'left', vertical: 'middle' };
  });

  const summaryItems = [
    { metric: 'Total Properties Listed', value: metrics.totalProperties, notes: 'Properties in Scope' },
    { metric: 'Total Rooms', value: metrics.totalRooms, notes: 'Cumulative room inventory' },
    { metric: 'Total Vacancies', value: metrics.totalVacancies, notes: 'Available capacity' },
    { metric: 'Total Occupied', value: metrics.totalOccupied, notes: 'Occupied capacity' },
    { metric: 'Verified Properties', value: metrics.verifiedProperties, notes: 'Approved listings' },
    { metric: 'Pending Verification', value: metrics.pendingVerification, notes: 'Awaiting admin review' },
    { metric: 'Active Subscriptions', value: metrics.activeSubscriptions, notes: 'Currently active plans' },
    { metric: 'Pending Subscriptions', value: metrics.pendingSubscriptions, notes: 'Awaiting payment/confirmation' },
    { metric: 'Expired Subscriptions', value: metrics.expiredSubscriptions, notes: 'Expired listings' },
    { metric: 'CCTV Available', value: metrics.cctvAvailable, notes: 'Properties with security cameras' },
    { metric: 'WiFi Available', value: metrics.wifiAvailable, notes: 'Properties with internet' },
    { metric: 'Hot Water Available', value: metrics.hotWaterAvailable, notes: 'Properties with geyser/hot water' },
    { metric: 'Bed Available', value: metrics.bedAvailable, notes: 'Furnished with bed/mattress' }
  ];

  summaryItems.forEach((item, sIdx) => {
    const rNum = 5 + sIdx;
    const row = summaryWs.getRow(rNum);
    row.height = 22;

    const cell1 = row.getCell(1);
    cell1.value = item.metric;
    cell1.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1F2937' } };
    cell1.border = contentBorder;
    cell1.alignment = { horizontal: 'left', vertical: 'middle' };

    const cell2 = row.getCell(2);
    cell2.value = item.value;
    cell2.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF111827' } };
    cell2.border = contentBorder;
    cell2.alignment = { horizontal: 'center', vertical: 'middle' };
    cell2.numFmt = '#,##0';

    const cell3 = row.getCell(3);
    cell3.value = item.notes;
    cell3.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF6B7280' } };
    cell3.border = contentBorder;
    cell3.alignment = { horizontal: 'left', vertical: 'middle' };

    if (sIdx % 2 === 1) {
      const bg = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
      cell1.fill = bg;
      cell2.fill = bg;
      cell3.fill = bg;
    }
  });

  summaryWs.pageSetup = {
    orientation: 'portrait',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5 }
  };

  // Generate binary buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const dateSlug = exportDate.toISOString().split('T')[0];
  const filename = `Nivasi_Space_Room_Owner_Register_${dateSlug}.xlsx`;

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);

  return {
    filename,
    recordCount: rowData.length,
    metrics
  };
}

/**
 * Generate and download Mess Data Register
 */
export async function exportMessRegister(messList, options = {}) {
  if (!messList || messList.length === 0) {
    throw new Error('No mess records available to export.');
  }

  const ExcelJS = await loadExcelJS();

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Nivasi Space Admin Portal';
  workbook.created = new Date();

  const collegeName = options.collegeName || 'All Scope';
  const cityName = options.cityName || 'Kolhapur';
  const exportDate = new Date();
  const dateFormatted = exportDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const ws = workbook.addWorksheet('Mess Register', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 6 }]
  });

  ws.columns = [
    { key: 'srNo', width: 8 },
    { key: 'title', width: 28 },
    { key: 'contact', width: 18 },
    { key: 'location', width: 28 },
    { key: 'cuisine', width: 18 },
    { key: 'boysMonthly', width: 16 },
    { key: 'girlsMonthly', width: 16 },
    { key: 'perMeal', width: 14 },
    { key: 'leavePolicy', width: 32 }
  ];

  ws.mergeCells('A1:I1');
  const t1 = ws.getCell('A1');
  t1.value = 'NIVASI SPACE';
  t1.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FFC2410C' } };
  t1.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  ws.mergeCells('A2:I2');
  const t2 = ws.getCell('A2');
  t2.value = 'MESS REGISTER';
  t2.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FF1F2937' } };
  t2.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 22;

  ws.mergeCells('A3:I3');
  const t3 = ws.getCell('A3');
  t3.value = `${collegeName} (${cityName})`;
  t3.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF4B5563' } };
  t3.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(3).height = 20;

  ws.mergeCells('A4:I4');
  const t4 = ws.getCell('A4');
  t4.value = `Export Date: ${dateFormatted}   |   Total Mess Listed: ${messList.length}`;
  t4.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF6B7280' } };
  t4.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(4).height = 18;

  ws.getRow(5).height = 8;

  const headers = [
    'Sr. No.',
    'Mess Name',
    'Contact No.',
    'Location',
    'Cuisine',
    'Boys (Monthly ₹)',
    'Girls (Monthly ₹)',
    'Per Meal (₹)',
    'Leave Policy / Rules'
  ];

  const headerRow = ws.getRow(6);
  headerRow.height = 30;
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF111827' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF9CA3AF' } },
      left: { style: 'thin', color: { argb: 'FF9CA3AF' } },
      bottom: { style: 'medium', color: { argb: 'FF4B5563' } },
      right: { style: 'thin', color: { argb: 'FF9CA3AF' } }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  });

  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
  };

  messList.forEach((m, idx) => {
    const row = ws.getRow(7 + idx);
    row.height = 22;
    const boysPrice = m.pricing?.monthly?.boys?.withoutBreakfast || m.pricing?.monthly?.boys?.withBreakfast || 'N/A';
    const girlsPrice = m.pricing?.monthly?.girls?.withoutBreakfast || m.pricing?.monthly?.girls?.withBreakfast || 'N/A';
    const cuisine = Array.isArray(m.cuisine) ? m.cuisine.join(', ') : (m.cuisine || 'Veg');

    const vals = [
      idx + 1,
      m.title || 'N/A',
      m.contact || 'N/A',
      m.location || 'N/A',
      cuisine,
      boysPrice,
      girlsPrice,
      m.pricing?.perMeal || 'N/A',
      m.rules?.leavePolicy || 'N/A'
    ];

    vals.forEach((v, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.value = v;
      cell.border = thinBorder;
      cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF1F2937' } };
      cell.alignment = {
        horizontal: cIdx === 0 || cIdx === 4 || cIdx === 5 || cIdx === 6 || cIdx === 7 ? 'center' : 'left',
        vertical: 'middle'
      };
      if (cIdx === 2) cell.numFmt = '@';
    });
  });

  ws.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6, column: 9 } };

  ws.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printTitlesRow: '6:6'
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const dateSlug = exportDate.toISOString().split('T')[0];
  const filename = `Nivasi_Space_Mess_Register_${dateSlug}.xlsx`;

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);

  return { filename, recordCount: messList.length };
}
