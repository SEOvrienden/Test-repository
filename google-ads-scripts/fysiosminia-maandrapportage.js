/**
 * ============================================================================
 *  Maandrapportage Google Ads  -  Fysio Sminia
 *  Gemaakt door SEO Vrienden (https://seovrienden.nl)
 * ----------------------------------------------------------------------------
 *  Stuurt automatisch een korte, branded HTML-mail met de accountprestaties
 *  van de afgelopen kalendermaand, inclusief vergelijking met de maand ervoor
 *  en een top 20 van best presterende zoekwoorden (op klikken).
 *
 *  Plaatsen: Google Ads  ->  Extra & instellingen  ->  Bulkacties  ->  Scripts
 *  Inplannen: maandelijks, bv. de 1e van de maand rond 08:00 uur.
 * ============================================================================
 */

// ===========================================================================
//  INSTELLINGEN  -  pas dit blok aan en verder hoef je niets te wijzigen
// ===========================================================================
var CONFIG = {
  // --- Ontvangers --------------------------------------------------------
  // Komma-gescheiden lijst is toegestaan, bv. 'klant@voorbeeld.nl, info@voorbeeld.nl'
  recipient: 'VUL-HIER-HET-MAILADRES-VAN-DE-KLANT-IN@voorbeeld.nl', // <-- INVULLEN
  cc:        'support@seovrienden.nl',
  bcc:       '',

  // --- Klant / afzender --------------------------------------------------
  clientName:  'Fysio Sminia',
  clientUrl:   'https://www.fysiosminia.nl/',
  agencyName:  'SEO Vrienden',
  agencyUrl:   'https://seovrienden.nl/',
  agencyEmail: 'support@seovrienden.nl',

  // --- Huisstijl (pas kleuren/logo aan op jullie eigen waarden) ----------
  brand: {
    logoUrl:     'https://seovrienden.nl/wp-content/uploads/logo.png', // <-- vervang door directe URL van jullie logo
    primary:     '#F36F21', // accentkleur (knoppen/koppen) - oranje
    primaryDark: '#1B2A4A', // donkere kleur (header/footer) - donkerblauw
    textColor:   '#2B2B2B',
    mutedColor:  '#6B7280',
    borderColor: '#E5E7EB',
    bgColor:     '#F4F5F7',
    positive:    '#1A8917', // groen voor positieve ontwikkeling
    negative:    '#C62828'  // rood voor negatieve ontwikkeling
  },

  // --- Rapportage-opties -------------------------------------------------
  keywordLimit: 20,           // aantal zoekwoorden in de tabel
  currencySymbol: '€',   // € ; wordt overschreven door de accountvaluta indien beschikbaar

  // Voor welke metrics is "stijging" gunstig (groen) of ongunstig (rood)?
  // true  = hoger is beter (groen bij stijging)
  // false = lager is beter (groen bij daling)
  higherIsBetter: {
    cost: false, impressions: true, clicks: true, ctr: true, avgCpc: false,
    allConv: true, conv: true, costPerConv: false, convRate: true, searchIs: true
  }
};

// ===========================================================================
//  HOOFDPROGRAMMA
// ===========================================================================
function main() {
  var tz = AdsApp.currentAccount().getTimeZone();
  try {
    CONFIG.currencySymbol = currencySymbolFor(AdsApp.currentAccount().getCurrencyCode());
  } catch (e) { /* val terug op standaard symbool */ }

  var current  = lastMonthRange(tz);          // afgelopen volledige kalendermaand
  var previous = monthBefore(current, tz);     // de maand daarvoor

  var curStats  = getAccountStats(current.start, current.end);
  var prevStats = getAccountStats(previous.start, previous.end);
  var keywords  = getTopKeywords(current.start, current.end, CONFIG.keywordLimit);

  var html = buildEmail(curStats, prevStats, keywords, current, previous, tz);

  var subject = 'Google Ads maandrapportage ' + CONFIG.clientName + ' - ' + current.label;

  MailApp.sendEmail({
    to:       CONFIG.recipient,
    cc:       CONFIG.cc || undefined,
    bcc:      CONFIG.bcc || undefined,
    subject:  subject,
    htmlBody: html,
    name:     CONFIG.agencyName
  });

  Logger.log('Rapportage verstuurd naar: ' + CONFIG.recipient + ' (cc: ' + CONFIG.cc + ')');
  Logger.log('Periode: ' + current.label + ' vs ' + previous.label);
}

// ===========================================================================
//  DATA OPHALEN
// ===========================================================================

/**
 * Haalt accountbrede cijfers op door alle campagnes te sommeren.
 * Afgeleide metrics (CTR, CPC, etc.) worden uit de totalen herberekend,
 * zodat ze kloppen op accountniveau. Zoekvertoningspercentage wordt
 * impressie-gewogen berekend over uitsluitend zoekcampagnes.
 */
function getAccountStats(startDate, endDate) {
  var t = {
    cost: 0, impressions: 0, clicks: 0,
    allConv: 0, conv: 0,
    searchImprWeighted: 0, searchImpr: 0
  };

  var query =
    'SELECT campaign.advertising_channel_type, ' +
    '       metrics.cost_micros, metrics.impressions, metrics.clicks, ' +
    '       metrics.all_conversions, metrics.conversions, ' +
    '       metrics.search_impression_share ' +
    'FROM campaign ' +
    "WHERE segments.date BETWEEN '" + startDate + "' AND '" + endDate + "'";

  var rows = AdsApp.search(query);
  while (rows.hasNext()) {
    var r = rows.next();
    var m = r.metrics;
    var impr = Number(m.impressions) || 0;

    t.cost        += micros(m.costMicros);
    t.impressions += impr;
    t.clicks      += Number(m.clicks) || 0;
    t.allConv     += Number(m.allConversions) || 0;
    t.conv        += Number(m.conversions) || 0;

    // Zoekvertoningspercentage alleen meewegen voor zoekcampagnes.
    if (r.campaign && r.campaign.advertisingChannelType === 'SEARCH') {
      var sis = Number(m.searchImpressionShare);
      if (!isNaN(sis)) {
        t.searchImprWeighted += sis * impr;
        t.searchImpr += impr;
      }
    }
  }

  return {
    cost:        t.cost,
    impressions: t.impressions,
    clicks:      t.clicks,
    ctr:         t.impressions ? t.clicks / t.impressions : 0,
    avgCpc:      t.clicks ? t.cost / t.clicks : 0,
    allConv:     t.allConv,
    conv:        t.conv,
    costPerConv: t.conv ? t.cost / t.conv : 0,
    convRate:    t.clicks ? t.conv / t.clicks : 0,
    searchIs:    t.searchImpr ? t.searchImprWeighted / t.searchImpr : 0
  };
}

/** Top N zoekwoorden van de periode, gesorteerd op klikken. */
function getTopKeywords(startDate, endDate, limit) {
  var query =
    'SELECT ad_group_criterion.keyword.text, ' +
    '       ad_group_criterion.keyword.match_type, ' +
    '       metrics.impressions, metrics.clicks, metrics.ctr, ' +
    '       metrics.average_cpc, metrics.all_conversions, metrics.conversions ' +
    'FROM keyword_view ' +
    "WHERE segments.date BETWEEN '" + startDate + "' AND '" + endDate + "' " +
    "  AND ad_group_criterion.status = 'ENABLED' " +
    "  AND campaign.status = 'ENABLED' " +
    '  AND metrics.impressions > 0 ' +
    'ORDER BY metrics.clicks DESC ' +
    'LIMIT ' + limit;

  var out = [];
  var rows = AdsApp.search(query);
  while (rows.hasNext()) {
    var r = rows.next();
    var m = r.metrics;
    out.push({
      text:      r.adGroupCriterion.keyword.text,
      matchType: matchTypeLabel(r.adGroupCriterion.keyword.matchType),
      impressions: Number(m.impressions) || 0,
      clicks:      Number(m.clicks) || 0,
      ctr:         Number(m.ctr) || 0,
      avgCpc:      micros(m.averageCpc),
      allConv:     Number(m.allConversions) || 0,
      conv:        Number(m.conversions) || 0
    });
  }
  return out;
}

// ===========================================================================
//  E-MAIL OPBOUWEN
// ===========================================================================
function buildEmail(cur, prev, keywords, current, previous, tz) {
  var b = CONFIG.brand;

  // Rijdefinities voor de samenvattingstabel.
  var rows = [
    metricRow('Kosten',                       cur.cost,        prev.cost,        'currency', 'cost'),
    metricRow('Vertoningen',                  cur.impressions, prev.impressions, 'int',      'impressions'),
    metricRow('Klikken',                      cur.clicks,      prev.clicks,      'int',      'clicks'),
    metricRow('CTR',                          cur.ctr,         prev.ctr,         'percent',  'ctr'),
    metricRow('Gem. CPC',                     cur.avgCpc,      prev.avgCpc,      'currency', 'avgCpc'),
    metricRow('Alle conversies',              cur.allConv,     prev.allConv,     'decimal',  'allConv'),
    metricRow('Conversies',                   cur.conv,        prev.conv,        'decimal',  'conv'),
    metricRow('Kosten/conv.',                 cur.costPerConv, prev.costPerConv, 'currency', 'costPerConv'),
    metricRow('Conversiepercentage',          cur.convRate,    prev.convRate,    'percent',  'convRate'),
    metricRow('Zoekvertoningspercentage',     cur.searchIs,    prev.searchIs,    'percent',  'searchIs')
  ].join('');

  var keywordRows = keywords.length ? keywords.map(function (k) {
    return '' +
      '<tr>' +
        td(escapeHtml(k.text) + ' <span style="color:' + b.mutedColor + ';font-size:11px;">[' + k.matchType + ']</span>', 'left') +
        td(fmtInt(k.impressions)) +
        td(fmtInt(k.clicks)) +
        td(fmtPercent(k.ctr)) +
        td(fmtCurrency(k.avgCpc)) +
        td(fmtDecimal(k.allConv)) +
        td(fmtDecimal(k.conv)) +
      '</tr>';
  }).join('') :
  '<tr><td colspan="7" style="padding:14px;text-align:center;color:' + b.mutedColor + ';">Geen zoekwoorddata voor deze periode.</td></tr>';

  return '' +
'<!DOCTYPE html><html><head><meta charset="utf-8">' +
'<meta name="viewport" content="width=device-width, initial-scale=1.0"></head>' +
'<body style="margin:0;padding:0;background:' + b.bgColor + ';">' +
'<div style="font-family:Arial,Helvetica,sans-serif;color:' + b.textColor + ';max-width:680px;margin:0 auto;background:' + b.bgColor + ';padding:16px;">' +

  // Header
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + b.primaryDark + ';border-radius:12px 12px 0 0;">' +
    '<tr><td style="padding:24px 28px;">' +
      '<img src="' + b.logoUrl + '" alt="' + escapeHtml(CONFIG.agencyName) + '" height="34" style="display:block;border:0;outline:none;margin-bottom:10px;max-height:34px;">' +
      '<div style="color:#FFFFFF;font-size:20px;font-weight:bold;">Google Ads maandrapportage</div>' +
      '<div style="color:#C9D2E3;font-size:14px;margin-top:4px;">' + escapeHtml(CONFIG.clientName) + ' &middot; ' + current.label + '</div>' +
    '</td></tr>' +
  '</table>' +

  // Body
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:0 0 12px 12px;">' +
    '<tr><td style="padding:24px 28px;">' +

      '<p style="margin:0 0 18px;font-size:14px;line-height:1.6;">Beste,</p>' +
      '<p style="margin:0 0 22px;font-size:14px;line-height:1.6;">Hierbij een kort overzicht van de prestaties van jullie Google Ads-account over <strong>' + current.label + '</strong>, vergeleken met ' + previous.label + '.</p>' +

      // Samenvatting
      '<div style="font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;color:' + b.primary + ';margin:0 0 10px;">Accountoverzicht</div>' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;border:1px solid ' + b.borderColor + ';border-radius:8px;overflow:hidden;">' +
        '<tr style="background:' + b.bgColor + ';">' +
          th('Statistiek', 'left') + th(current.shortLabel) + th(previous.shortLabel) + th('Verschil') +
        '</tr>' +
        rows +
      '</table>' +

      // Zoekwoorden
      '<div style="font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;color:' + b.primary + ';margin:28px 0 10px;">Top ' + CONFIG.keywordLimit + ' zoekwoorden (op klikken)</div>' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:12px;border:1px solid ' + b.borderColor + ';border-radius:8px;overflow:hidden;">' +
        '<tr style="background:' + b.bgColor + ';">' +
          th('Zoekwoord', 'left') + th('Vert.') + th('Klikken') + th('CTR') + th('Gem. CPC') + th('Alle conv.') + th('Conv.') +
        '</tr>' +
        keywordRows +
      '</table>' +

      '<p style="margin:24px 0 0;font-size:13px;line-height:1.6;">Vragen over deze cijfers of ideeën om verder te groeien? Neem gerust contact met ons op.</p>' +
      '<p style="margin:14px 0 0;font-size:13px;line-height:1.6;">Met vriendelijke groet,<br><strong>' + escapeHtml(CONFIG.agencyName) + '</strong></p>' +

    '</td></tr>' +
  '</table>' +

  // Footer
  '<div style="text-align:center;color:' + b.mutedColor + ';font-size:11px;line-height:1.6;padding:18px 10px;">' +
    escapeHtml(CONFIG.agencyName) + ' &middot; <a href="' + CONFIG.agencyUrl + '" style="color:' + b.primary + ';text-decoration:none;">seovrienden.nl</a> &middot; ' +
    '<a href="mailto:' + CONFIG.agencyEmail + '" style="color:' + b.primary + ';text-decoration:none;">' + CONFIG.agencyEmail + '</a><br>' +
    'Deze rapportage is automatisch gegenereerd vanuit Google Ads.' +
  '</div>' +

'</div></body></html>';
}

/** Bouwt één rij van de samenvattingstabel met waarde, vorige waarde en gekleurd verschil. */
function metricRow(label, curVal, prevVal, format, key) {
  var b = CONFIG.brand;
  var change = pctChange(curVal, prevVal);
  var higherBetter = CONFIG.higherIsBetter[key];
  var color = b.mutedColor;
  var arrow = '';

  if (change !== null && Math.abs(change) >= 0.0005) {
    var good = change > 0 ? higherBetter : !higherBetter;
    color = good ? b.positive : b.negative;
    arrow = change > 0 ? '▲ ' : '▼ ';
  }

  var changeText = (change === null) ? '&ndash;' : (arrow + fmtPercent(Math.abs(change)));

  return '' +
    '<tr>' +
      '<td style="padding:9px 12px;border-top:1px solid ' + b.borderColor + ';font-weight:600;">' + label + '</td>' +
      '<td style="padding:9px 12px;border-top:1px solid ' + b.borderColor + ';text-align:right;">' + fmtValue(curVal, format) + '</td>' +
      '<td style="padding:9px 12px;border-top:1px solid ' + b.borderColor + ';text-align:right;color:' + b.mutedColor + ';">' + fmtValue(prevVal, format) + '</td>' +
      '<td style="padding:9px 12px;border-top:1px solid ' + b.borderColor + ';text-align:right;font-weight:600;color:' + color + ';">' + changeText + '</td>' +
    '</tr>';
}

// ===========================================================================
//  HELPERS  -  datums
// ===========================================================================

/** Afgelopen volledige kalendermaand t.o.v. vandaag (in accounttijdzone). */
function lastMonthRange(tz) {
  var now = new Date();
  var y = Number(Utilities.formatDate(now, tz, 'yyyy'));
  var m = Number(Utilities.formatDate(now, tz, 'MM')) - 1; // 0-based maand van vandaag
  // Ga één maand terug:
  var firstThisMonth = new Date(y, m, 1);
  var start = new Date(firstThisMonth.getFullYear(), firstThisMonth.getMonth() - 1, 1);
  var end   = new Date(firstThisMonth.getFullYear(), firstThisMonth.getMonth(), 0); // laatste dag vorige maand
  return makeRange(start, end, tz);
}

/** De maand vóór de gegeven range. */
function monthBefore(range, tz) {
  var start = new Date(range.startDate.getFullYear(), range.startDate.getMonth() - 1, 1);
  var end   = new Date(range.startDate.getFullYear(), range.startDate.getMonth(), 0);
  return makeRange(start, end, tz);
}

function makeRange(start, end, tz) {
  var maanden = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
  var label = maanden[start.getMonth()] + ' ' + start.getFullYear();
  return {
    startDate:  start,
    endDate:    end,
    start:      Utilities.formatDate(start, tz, 'yyyy-MM-dd'),
    end:        Utilities.formatDate(end, tz, 'yyyy-MM-dd'),
    label:      label.charAt(0).toUpperCase() + label.slice(1),
    shortLabel: maanden[start.getMonth()].substring(0, 3) + ' ' + ('' + start.getFullYear()).slice(2)
  };
}

// ===========================================================================
//  HELPERS  -  formatteren (Nederlandse notatie: 1.234,56)
// ===========================================================================
function micros(v) { return (Number(v) || 0) / 1000000; }

function pctChange(cur, prev) {
  if (!prev) return null;          // geen basis om mee te vergelijken
  return (cur - prev) / prev;
}

function fmtValue(v, format) {
  switch (format) {
    case 'currency': return fmtCurrency(v);
    case 'percent':  return fmtPercent(v);
    case 'int':      return fmtInt(v);
    case 'decimal':  return fmtDecimal(v);
    default:         return fmtInt(v);
  }
}

function fmtInt(v)      { return groupThousands(Math.round(Number(v) || 0)); }
function fmtDecimal(v)  { return decimalsNl(Number(v) || 0, 2); }
function fmtCurrency(v) { return CONFIG.currencySymbol + ' ' + decimalsNl(Number(v) || 0, 2); }
function fmtPercent(v)  { return decimalsNl((Number(v) || 0) * 100, 2) + '%'; }

/** Getal met 2 decimalen in NL-notatie (punt = duizendtal, komma = decimaal). */
function decimalsNl(num, decimals) {
  var neg = num < 0;
  var fixed = Math.abs(num).toFixed(decimals);
  var parts = fixed.split('.');
  var out = groupThousands(parts[0]) + ',' + parts[1];
  return (neg ? '-' : '') + out;
}

/** Voegt punten toe als duizendtalscheiding. */
function groupThousands(intValue) {
  var s = '' + intValue;
  var neg = s.charAt(0) === '-';
  if (neg) s = s.substring(1);
  s = s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '-' : '') + s;
}

// ===========================================================================
//  HELPERS  -  diversen
// ===========================================================================
function th(text, align) {
  return '<th style="padding:10px 12px;text-align:' + (align || 'right') + ';font-size:11px;text-transform:uppercase;letter-spacing:.4px;color:' + CONFIG.brand.mutedColor + ';font-weight:700;">' + text + '</th>';
}

function td(content, align) {
  return '<td style="padding:8px 12px;border-top:1px solid ' + CONFIG.brand.borderColor + ';text-align:' + (align || 'right') + ';">' + content + '</td>';
}

function matchTypeLabel(mt) {
  switch (mt) {
    case 'EXACT':  return 'exact';
    case 'PHRASE': return 'zin';
    case 'BROAD':  return 'breed';
    default:       return (mt || '').toLowerCase();
  }
}

function currencySymbolFor(code) {
  var map = { EUR: '€', USD: '$', GBP: '£' };
  return map[code] || (code ? code + ' ' : '€');
}

function escapeHtml(s) {
  return ('' + s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
